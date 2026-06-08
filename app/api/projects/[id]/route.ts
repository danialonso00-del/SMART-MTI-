import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);

    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Employees from same company
    const employees = await prisma.employee.findMany({
      where: { company: opportunity.company, isActive: true },
      include: {
        salaries: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
        },
      },
      orderBy: { name: 'asc' },
    });

    // Recent activity logs for this project
    const activityLogs = await prisma.activityLog.findMany({
      where: { entityType: 'opportunity', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Company salary totals (last month)
    const now = new Date();
    const latestSalaries = await prisma.salary.findMany({
      where: {
        year:  now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
        month: now.getMonth() === 0 ? 12 : now.getMonth(),
        employee: { company: opportunity.company },
      },
      include: { employee: true },
    });

    const totalMonthlySalary = latestSalaries.reduce((s, sal) => s + sal.salaryReal, 0);
    const avgCostHour = latestSalaries.length > 0
      ? latestSalaries.reduce((s, sal) => s + sal.costHour, 0) / latestSalaries.length
      : 0;

    const factorialMapping = await prisma.factorialProjectMapping.findUnique({
      where: { internalProjectId: id },
      select: { factorialProjectId: true, factorialProjectName: true, matchStatus: true },
    });

    // Sage accounting summary — source of truth for invoiced/cost amounts
    const [sageIncomeAgg, sageExpenseAgg] = await Promise.all([
      prisma.accountingEntry.aggregate({
        where: { internalProjectId: id, entryType: 'income' },
        _sum: { credit: true },
      }),
      prisma.accountingEntry.aggregate({
        where: { internalProjectId: id, entryType: 'expense' },
        _sum: { debit: true },
      }),
    ]);
    const sageTotalIncome  = sageIncomeAgg._sum.credit  ?? 0;
    const sageTotalExpense = sageExpenseAgg._sum.debit   ?? 0;
    const hasSageData      = sageTotalIncome > 0 || sageTotalExpense > 0;

    return NextResponse.json({
      opportunity,
      employees,
      activityLogs,
      factorialMapping,
      sageTotalIncome,
      sageTotalExpense,
      hasSageData,
      companySummary: {
        totalEmployees:     employees.length,
        totalMonthlySalary,
        avgCostHour,
      },
    });
  } catch (error) {
    console.error('Error fetching project detail:', error);
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const body = await req.json();

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...body,
        date:                body.date                ? new Date(body.date)                : undefined,
        expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : undefined,
        acceptanceDate:      body.acceptanceDate      ? new Date(body.acceptanceDate)      : undefined,
        endDate:             body.endDate             ? new Date(body.endDate)             : undefined,
        weightedPipeline:    body.amount !== undefined || body.probability !== undefined
          ? ((body.amount ?? existing.amount) * ((body.probability ?? existing.probability) / 100))
          : undefined,
        pendingToInvoice:    body.amount !== undefined || body.totalInvoiced !== undefined
          ? Math.max(0, (body.amount ?? existing.amount) - (body.totalInvoiced ?? existing.totalInvoiced))
          : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType:  'opportunity',
        entityId:    id,
        action:      'updated',
        oldValue:    JSON.stringify(existing),
        newValue:    JSON.stringify(updated),
        performedBy: body.updatedBy || 'Sistema',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 });
  }
}
