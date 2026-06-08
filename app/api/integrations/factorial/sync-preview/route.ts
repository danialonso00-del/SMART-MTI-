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
  SyncPreviewResult,
} from '@/lib/factorial/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const startDate: string | undefined    = body.startDate;
    const endDate: string | undefined      = body.endDate;
    const projectIds: string[] | undefined = body.projectIds;

    const warnings: string[] = [];
    const errors: string[]   = [];

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

    // ── Project matching ──────────────────────────────────────────────────────
    const factorialByCode = buildProjectCodeMap(factorialProjects as FactorialProject[]);

    const unmatchedProjects: SyncPreviewResult['unmatchedProjects'] = [];
    const matchedInternalIds = new Set<string>();
    const projectCostMap = new Map<string, { hours: number; cost: number }>();

    for (const ip of internalProjects) {
      const fp = factorialByCode.get(ip.id);
      if (fp) {
        matchedInternalIds.add(ip.id);
        projectCostMap.set(ip.id, { hours: 0, cost: 0 });
      } else {
        unmatchedProjects.push({ id: ip.id, name: ip.opportunity });
      }
    }

    const factorialProjectsWithoutCode = (factorialProjects as FactorialProject[])
      .filter((fp: FactorialProject) => !fp.code)
      .map((fp: FactorialProject) => ({ id: fp.id, name: fp.name }));

    if (factorialProjectsWithoutCode.length > 0) {
      warnings.push(`${factorialProjectsWithoutCode.length} proyecto(s) Factorial sin campo "code"`);
    }
    if (unmatchedProjects.length > 0) {
      warnings.push(`${unmatchedProjects.length} proyecto(s) internos sin match en Factorial`);
    }

    // ── Employee matching ─────────────────────────────────────────────────────
    type InternalEmployee = typeof internalEmployees[0];

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
      internalEmployees.map((e: InternalEmployee) => [normalizeName(e.name), e] as [string, InternalEmployee]),
    );

    let employeesMatchedCount = 0;
    const employeesUnmatched: SyncPreviewResult['employeesUnmatched'] = [];

    for (const fe of (factorialEmployees as FactorialEmployee[])) {
      const fullName = fe.full_name ?? `${fe.first_name} ${fe.last_name}`;
      const matched =
        empByFactorialId.get(String(fe.id)) ??
        (fe.email ? empByEmail.get(fe.email.toLowerCase()) : undefined) ??
        empByNorm.get(normalizeName(fullName));

      if (matched) {
        employeesMatchedCount++;
      } else {
        employeesUnmatched.push({ factorialId: fe.id, name: fullName, email: fe.email });
      }
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

    const factorialEmpById = new Map<number, FactorialEmployee>(
      (factorialEmployees as FactorialEmployee[]).map(
        (fe: FactorialEmployee) => [fe.id, fe] as [number, FactorialEmployee],
      ),
    );

    // Direct map: Factorial project numeric id → internal project id
    const factorialProjIdToInternalId = new Map<number, string>();
    for (const ip of internalProjects) {
      const fp = factorialByCode.get(ip.id);
      if (fp) factorialProjIdToInternalId.set(fp.id, ip.id);
    }

    let timeRecordsValid   = 0;
    let timeRecordsIgnored = 0;
    let estimatedTotalCost = 0;

    for (const tr of (timeRecords as FactorialTimeRecord[])) {
      const pw = pwMap.get(tr.project_worker_id);
      if (!pw) { timeRecordsIgnored++; continue; }

      const internalProjectId = factorialProjIdToInternalId.get(pw.project_id);
      if (!internalProjectId) { timeRecordsIgnored++; continue; }

      const fe = factorialEmpById.get(pw.employee_id);
      const feName = fe ? (fe.full_name ?? `${fe.first_name} ${fe.last_name}`) : '';

      const internalEmp =
        empByFactorialId.get(String(pw.employee_id)) ??
        (fe?.email ? empByEmail.get(fe.email.toLowerCase()) : undefined) ??
        (feName ? empByNorm.get(normalizeName(feName)) : undefined);

      if (!internalEmp) {
        timeRecordsIgnored++;
        continue;
      }

      const hours = (tr.imputed_minutes ?? 0) / 60;
      const cost  = hours * internalEmp.hourlyCost;
      const key   = internalProjectId;

      timeRecordsValid++;
      estimatedTotalCost += cost;

      const prev = projectCostMap.get(key) ?? { hours: 0, cost: 0 };
      projectCostMap.set(key, { hours: prev.hours + hours, cost: prev.cost + cost });
    }

    const projectCosts = internalProjects
      .filter(ip => matchedInternalIds.has(ip.id))
      .map(ip => {
        const totals = projectCostMap.get(ip.id);
        return {
          projectId:   ip.id,
          projectName: ip.opportunity,
          hours:       totals?.hours ?? 0,
          cost:        totals?.cost  ?? 0,
        };
      });

    const result: SyncPreviewResult = {
      internalProjectsCount:        internalProjects.length,
      factorialProjectsCount:       (factorialProjects as FactorialProject[]).length,
      matchedProjectsCount:         matchedInternalIds.size,
      unmatchedProjects,
      factorialProjectsWithoutCode,
      employeesMatchedCount,
      employeesUnmatched,
      timeRecordsTotal:   (timeRecords as FactorialTimeRecord[]).length,
      timeRecordsValid,
      timeRecordsIgnored,
      estimatedTotalCost,
      projectCosts,
      warnings,
      errors,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Preview failed';
    console.error('[sync-preview]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
