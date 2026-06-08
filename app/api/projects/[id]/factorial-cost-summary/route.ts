import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const projectId = decodeURIComponent(params.id);
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get('startDate');
  const endDate   = searchParams.get('endDate');

  try {
    const [mapping, entries, latestSummary] = await Promise.all([
      prisma.factorialProjectMapping.findUnique({
        where: { internalProjectId: projectId },
      }),
      prisma.projectTimeEntry.findMany({
        where: {
          internalProjectId: projectId,
          ...(startDate ? { date: { gte: new Date(startDate) } } : {}),
          ...(endDate   ? { date: { lte: new Date(endDate) } }   : {}),
        },
        orderBy: { date: 'desc' },
      }),
      prisma.projectCostSummary.findFirst({
        where:   { internalProjectId: projectId },
        orderBy: { lastSyncedAt: 'desc' },
      }),
    ]);

    // Aggregate by internal employee id
    type EmpAccum = {
      employeeId: string;
      totalMinutes: number;
      totalHours: number;
      totalCost: number;
      hourlyCost: number;
      entries: number;
    };
    const empMap = new Map<string, EmpAccum>();

    for (const e of entries) {
      const key  = e.internalEmployeeId ?? `factorial_${e.factorialEmployeeId}`;
      const prev = empMap.get(key) ?? {
        employeeId:   key,
        totalMinutes: 0,
        totalHours:   0,
        totalCost:    0,
        hourlyCost:   e.hourlyCost,
        entries:      0,
      };
      empMap.set(key, {
        ...prev,
        totalMinutes: prev.totalMinutes + e.imputedMinutes,
        totalHours:   prev.totalHours   + e.imputedHours,
        totalCost:    prev.totalCost     + e.calculatedCost,
        entries:      prev.entries + 1,
      });
    }

    // Fetch employee names
    const internalEmpIds = Array.from(empMap.keys()).filter(k => !k.startsWith('factorial_'));
    const employees = await prisma.employee.findMany({
      where: { id: { in: internalEmpIds } },
      select: { id: true, name: true, department: true, hourlyCost: true },
    });
    type EmpRow = typeof employees[0];
    const empById = new Map<string, EmpRow>(
      employees.map((e: EmpRow) => [e.id, e] as [string, EmpRow]),
    );

    const byEmployee = Array.from(empMap.entries()).map(([key, data]) => {
      const emp = empById.get(key);
      return {
        ...data,
        name:       emp?.name       ?? `Factorial ID ${key}`,
        department: emp?.department ?? 'Desconocido',
      };
    }).sort((a, b) => b.totalHours - a.totalHours);

    const totalHours      = entries.reduce((s, e) => s + e.imputedHours,   0);
    const totalMinutes    = entries.reduce((s, e) => s + e.imputedMinutes,  0);
    const totalPeopleCost = entries.reduce((s, e) => s + e.calculatedCost,  0);
    const avgCostHour     = totalHours > 0 ? totalPeopleCost / totalHours : 0;

    const alerts: { type: 'warning' | 'error' | 'info'; message: string }[] = [];

    if (!mapping) {
      alerts.push({ type: 'warning', message: 'Proyecto sin mapping en Factorial. Ejecuta una sincronización.' });
    } else if (mapping.matchStatus !== 'matched') {
      alerts.push({ type: 'warning', message: `Estado del mapping: ${mapping.matchStatus}` });
    }

    const missingCostEmps = byEmployee.filter(e => e.hourlyCost === 0);
    if (missingCostEmps.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${missingCostEmps.length} empleado(s) sin coste/hora: ${missingCostEmps.map(e => e.name).join(', ')}`,
      });
    }

    return NextResponse.json({
      mapping,
      latestSummary,
      totalHours,
      totalMinutes,
      totalPeopleCost,
      avgCostHour,
      employeesCount:  byEmployee.length,
      lastSyncedAt:    latestSummary?.lastSyncedAt ?? null,
      byEmployee,
      recentEntries: entries.slice(0, 50).map(e => ({
        id:                  e.id,
        date:                e.date,
        internalEmployeeId:  e.internalEmployeeId,
        factorialEmployeeId: e.factorialEmployeeId,
        employeeName:        empById.get(e.internalEmployeeId ?? '')?.name ?? `Factorial ${e.factorialEmployeeId}`,
        imputedMinutes:      e.imputedMinutes,
        imputedHours:        e.imputedHours,
        hourlyCost:          e.hourlyCost,
        calculatedCost:      e.calculatedCost,
      })),
      alerts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading factorial summary';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
