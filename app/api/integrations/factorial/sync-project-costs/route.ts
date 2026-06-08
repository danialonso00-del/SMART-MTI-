import { NextRequest, NextResponse } from 'next/server';
import {
  getFactorialProjects,
  getFactorialEmployees,
  getAllTimeRecords,
  getAllProjectWorkers,
  normalizeName,
  buildProjectCodeMap,
} from '@/lib/factorial/client';
import { prisma } from '@/lib/prisma';
import type {
  FactorialProject,
  FactorialEmployee,
  FactorialTimeRecord,
  FactorialProjectWorker,
  SyncResult,
} from '@/lib/factorial/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const startDate: string = body.startDate ?? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const endDate: string   = body.endDate   ?? new Date().toISOString().slice(0, 10);
    const projectIds: string[] | undefined = body.projectIds;

    const warnings: string[] = [];
    const errors: string[]   = [];

    // ── Load data ─────────────────────────────────────────────────────────────
    const [internalProjects, internalEmployees, factorialProjects, factorialEmployees] =
      await Promise.all([
        prisma.opportunity.findMany({
          where: {
            statusCode: { in: [6, 7, 8] },
            ...(projectIds?.length ? { id: { in: projectIds } } : {}),
          },
          select: { id: true, opportunity: true, company: true },
        }),
        prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, name: true, factorialId: true, email: true, hourlyCost: true },
        }),
        getFactorialProjects(),
        getFactorialEmployees(),
      ]);

    type InternalEmployee = typeof internalEmployees[0];
    type InternalProject  = typeof internalProjects[0];

    // ── Build lookup maps ─────────────────────────────────────────────────────
    // buildProjectCodeMap handles both exact match AND "XX-NNN" prefix match
    // e.g. Factorial code "25-016_TTiO-TICKETING" matches internal id "25-016"
    const factorialByCode = buildProjectCodeMap(factorialProjects as FactorialProject[]);

    const factorialEmpById = new Map<number, FactorialEmployee>(
      (factorialEmployees as FactorialEmployee[]).map(
        (fe: FactorialEmployee) => [fe.id, fe] as [number, FactorialEmployee],
      ),
    );

    const empByFactorialId = new Map<string, InternalEmployee>(
      internalEmployees
        .filter((e: InternalEmployee) => !!e.factorialId)
        .map((e: InternalEmployee) => [e.factorialId!, e] as [string, InternalEmployee]),
    );
    const empByEmail = new Map<string, InternalEmployee>(
      internalEmployees
        .filter((e: InternalEmployee) => !!e.email)
        .map((e: InternalEmployee) => [e.email!.toLowerCase(), e] as [string, InternalEmployee]),
    );
    const empByNorm = new Map<string, InternalEmployee>(
      internalEmployees.map(
        (e: InternalEmployee) => [normalizeName(e.name), e] as [string, InternalEmployee],
      ),
    );

    // ── Project matching — upsert mappings ────────────────────────────────────
    for (const ip of (internalProjects as InternalProject[])) {
      const fp = factorialByCode.get(ip.id) ?? null;
      await prisma.factorialProjectMapping.upsert({
        where:  { internalProjectId: ip.id },
        update: {
          factorialProjectId:   fp?.id   ?? null,
          factorialProjectCode: fp?.code ?? null,
          factorialProjectName: fp?.name ?? null,
          matchStatus: fp ? 'matched' : 'unmatched',
        },
        create: {
          internalProjectId:    ip.id,
          factorialProjectId:   fp?.id   ?? null,
          factorialProjectCode: fp?.code ?? null,
          factorialProjectName: fp?.name ?? null,
          matchStatus: fp ? 'matched' : 'unmatched',
        },
      });
      if (!fp) warnings.push(`Proyecto "${ip.id}" sin match en Factorial`);
    }

    const matchedInternalIds = new Set<string>(
      (internalProjects as InternalProject[])
        .filter((ip: InternalProject) => factorialByCode.has(ip.id))
        .map((ip: InternalProject) => ip.id),
    );

    // Build a direct map: Factorial project numeric id → internal project id string
    // This avoids code-string comparison when processing time records
    const factorialProjIdToInternalId = new Map<number, string>();
    for (const ip of internalProjects as InternalProject[]) {
      const fp = factorialByCode.get(ip.id);
      if (fp) factorialProjIdToInternalId.set(fp.id, ip.id);
    }

    // ── Load time records + project-workers (join table) ─────────────────────
    const [timeRecords, projectWorkers] = await Promise.all([
      getAllTimeRecords({ startDate, endDate }),
      getAllProjectWorkers(),
    ]);

    // Build join map: project_worker.id → { project_id, employee_id }
    const pwMap = new Map<number, { project_id: number; employee_id: number }>(
      (projectWorkers as FactorialProjectWorker[]).map(
        (pw: FactorialProjectWorker) => [
          pw.id,
          { project_id: pw.project_id, employee_id: pw.employee_id },
        ] as [number, { project_id: number; employee_id: number }],
      ),
    );

    const factorialProjectById = new Map<number, FactorialProject>(
      (factorialProjects as FactorialProject[]).map(
        (fp: FactorialProject) => [fp.id, fp] as [number, FactorialProject],
      ),
    );

    // ── Process each time record ──────────────────────────────────────────────
    let timeEntriesUpserted = 0;
    // Collect employees matched by name/email that need their factorialId saved
    const factorialIdToSave = new Map<string, number>(); // internalEmpId → factorialEmployeeId

    for (const tr of (timeRecords as FactorialTimeRecord[])) {
      // Resolve project and employee via project-worker join
      const pw = pwMap.get(tr.project_worker_id);
      if (!pw) continue;

      // Use direct numeric ID map to get the internal project ID (handles prefix matching)
      const internalProjectId = factorialProjIdToInternalId.get(pw.project_id);
      if (!internalProjectId) continue;

      const fe = factorialEmpById.get(pw.employee_id) ?? null;
      const feName = fe ? (fe.full_name ?? `${fe.first_name} ${fe.last_name}`) : '';

      const byFactorialId = empByFactorialId.get(String(pw.employee_id));
      const byEmail       = fe?.email ? empByEmail.get(fe.email.toLowerCase()) : undefined;
      const byName        = feName    ? empByNorm.get(normalizeName(feName))   : undefined;
      const internalEmp: InternalEmployee | undefined = byFactorialId ?? byEmail ?? byName;

      if (!internalEmp) {
        if (fe) warnings.push(`Empleado Factorial "${feName}" (id=${pw.employee_id}) sin match interno`);
        continue;
      }

      // Auto-enrich: save factorialId if matched by email/name and not yet stored
      if (!internalEmp.factorialId && !factorialIdToSave.has(internalEmp.id)) {
        factorialIdToSave.set(internalEmp.id, pw.employee_id);
      }

      if (internalEmp.hourlyCost === 0) {
        warnings.push(`Empleado "${internalEmp.name}" sin coste/hora configurado`);
      }

      const imputedMinutes = tr.imputed_minutes ?? 0;
      const imputedHours   = imputedMinutes / 60;
      const calculatedCost = imputedHours * internalEmp.hourlyCost;

      await prisma.projectTimeEntry.upsert({
        where:  { factorialTimeRecordId: String(tr.id) },
        update: {
          internalEmployeeId:  internalEmp.id,
          factorialEmployeeId: pw.employee_id,
          date:                new Date(tr.date),
          imputedMinutes,
          imputedHours,
          hourlyCost:          internalEmp.hourlyCost,
          calculatedCost,
        },
        create: {
          internalEmployeeId:    internalEmp.id,
          factorialTimeRecordId: String(tr.id),
          factorialProjectId:    pw.project_id,
          factorialEmployeeId:   pw.employee_id,
          date:                  new Date(tr.date),
          imputedMinutes,
          imputedHours,
          hourlyCost:            internalEmp.hourlyCost,
          calculatedCost,
          mapping:               { connect: { internalProjectId } },
        },
      });

      timeEntriesUpserted++;
    }

    // ── Persist auto-matched factorialIds ─────────────────────────────────────
    if (factorialIdToSave.size > 0) {
      await Promise.all(
        Array.from(factorialIdToSave.entries()).map(([empId, factId]) =>
          prisma.employee.update({
            where: { id: empId },
            data:  { factorialId: String(factId) },
          }),
        ),
      );
      warnings.push(`Auto-vinculados ${factorialIdToSave.size} empleado(s) a Factorial por nombre/email`);
    }

    // ── Compute & upsert cost summaries ───────────────────────────────────────
    const startDateObj = new Date(startDate);
    const endDateObj   = new Date(endDate);
    const summaries: SyncResult['projectSummaries'] = [];

    for (const internalProjectId of matchedInternalIds) {
      const entries = await prisma.projectTimeEntry.findMany({
        where: { internalProjectId, date: { gte: startDateObj, lte: endDateObj } },
        select: { imputedMinutes: true, imputedHours: true, calculatedCost: true, internalEmployeeId: true },
      });

      const totalMinutes    = entries.reduce((s, e) => s + e.imputedMinutes, 0);
      const totalHours      = entries.reduce((s, e) => s + e.imputedHours,   0);
      const totalPeopleCost = entries.reduce((s, e) => s + e.calculatedCost,  0);
      const employeesCount  = new Set(entries.map(e => e.internalEmployeeId).filter(Boolean)).size;

      await prisma.projectCostSummary.upsert({
        where:  { internalProjectId_startDate_endDate: { internalProjectId, startDate: startDateObj, endDate: endDateObj } },
        update: { totalMinutes, totalHours, totalPeopleCost, employeesCount, lastSyncedAt: new Date() },
        create: { internalProjectId, startDate: startDateObj, endDate: endDateObj, totalMinutes, totalHours, totalPeopleCost, employeesCount },
      });

      // Write peopleCost back to Opportunity and recalculate margin
      const oppSnap = await prisma.opportunity.findUnique({
        where: { id: internalProjectId },
        select: { amount: true, materialCost: true, costs: true },
      });
      if (oppSnap) {
        const totalCostsSnap = totalPeopleCost + oppSnap.materialCost + oppSnap.costs;
        const newMargin = oppSnap.amount > 0 && totalCostsSnap > 0
          ? ((oppSnap.amount - totalCostsSnap) / oppSnap.amount) * 100
          : 0;
        await prisma.opportunity.update({
          where: { id: internalProjectId },
          data:  { peopleCost: totalPeopleCost, margin: newMargin },
        });
      }

      summaries.push({ projectId: internalProjectId, totalHours, totalPeopleCost, employeesCount });
    }

    const uniqueWarnings = Array.from(new Set(warnings)).slice(0, 50);

    const result: SyncResult = {
      projectsProcessed:    matchedInternalIds.size,
      timeEntriesUpserted,
      costSummariesUpdated: summaries.length,
      warnings:             uniqueWarnings,
      errors,
      projectSummaries:     summaries,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.error('[sync-project-costs]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
