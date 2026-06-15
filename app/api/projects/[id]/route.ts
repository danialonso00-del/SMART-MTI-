import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { STATUS_PROB } from '@/lib/utils';
import { badRequest, cleanText, optionalDate, readJsonObject } from '@/lib/api-security';

const UPDATABLE_FIELDS = [
  'opportunity', 'client', 'description', 'statusCode', 'company', 'owner',
  'country', 'date', 'expectedClosingDate', 'currency', 'amount', 'probability',
  'costs', 'totalInvoiced', 'blHardware', 'blIa', 'blBim', 'blTtioOm',
  'blEvents', 'blProservices', 'observations', 'acceptanceDate', 'endDate',
  'materialCost', 'peopleCost', 'margin', 'isInternal', 'wipStatus',
  'totalPercentage', 'week', 'nextYears', 'serviceType',
] as const;

type UpdatePayload = Record<string, unknown>;

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

    // Derive company salary totals from the employees already loaded above (latest salary = salaries[0])
    const totalMonthlySalary = employees.reduce((s, emp) => s + (emp.salaries[0]?.salaryReal ?? 0), 0);
    const costHours = employees.map(emp => emp.salaries[0]?.costHour).filter((v): v is number => v != null && v > 0);
    const avgCostHour = costHours.length > 0
      ? costHours.reduce((s, c) => s + c, 0) / costHours.length
      : 0;

    const factorialMapping = await prisma.factorialProjectMapping.findUnique({
      where: { internalProjectId: id },
      select: { factorialProjectId: true, factorialProjectName: true, matchStatus: true },
    });

    // Budget aggregates — expected margin from the budget builder
    const budgetLines = await prisma.budgetLine.findMany({
      where: { opportunityId: id },
      select: { quantity: true, unitCost: true, marginPct: true },
    });
    function budgetPvp(cost: number, marginPct: number) {
      if (marginPct >= 100 || marginPct <= 0) return cost;
      return cost / (1 - marginPct / 100);
    }
    const budgetCostTotal = budgetLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    const budgetSaleTotal = budgetLines.reduce((s, l) => s + budgetPvp(l.quantity * l.unitCost, l.marginPct), 0);
    const budgetLineCount = budgetLines.length;

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
      budgetCostTotal,
      budgetSaleTotal,
      budgetLineCount,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    await prisma.$transaction([
      // 1. Activity logs (polymorphic, no FK)
      prisma.activityLog.deleteMany({ where: { entityType: 'opportunity', entityId: id } }),
      // 2. Billing config cascade → milestones
      prisma.billingConfig.deleteMany({ where: { internalProjectId: id } }),
      // 3. Nullify accounting entries (optional FK)
      prisma.accountingEntry.updateMany({
        where: { internalProjectId: id },
        data: { internalProjectId: null },
      }),
      // 4. Delete the opportunity
      prisma.opportunity.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const body = await readJsonObject(req);

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const data: UpdatePayload = {};
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        data[field] = body[field];
      }
    }

    const numericFields = [
      'amount', 'probability', 'costs', 'totalInvoiced',
      'blHardware', 'blIa', 'blBim', 'blTtioOm', 'blEvents', 'blProservices',
      'materialCost', 'peopleCost', 'margin', 'wipStatus', 'totalPercentage',
      'week', 'nextYears', 'statusCode',
    ] as const;
    for (const f of numericFields) {
      if (f in data) {
        const value = Number(data[f]);
        if (!Number.isFinite(value)) throw new Error(`${f} debe ser numérico`);
        data[f] = value;
      }
    }

    const dateFields = ['date', 'expectedClosingDate', 'acceptanceDate', 'endDate'] as const;
    for (const f of dateFields) {
      if (f in data) data[f] = optionalDate(data, f);
    }

    if ('statusCode' in data && !('probability' in data)) {
      data.probability = STATUS_PROB[data.statusCode as number] ?? existing.probability;
    }

    const amount = 'amount' in data ? data.amount as number : existing.amount;
    const probability = 'probability' in data ? data.probability as number : existing.probability;
    const totalInvoiced = 'totalInvoiced' in data ? data.totalInvoiced as number : existing.totalInvoiced;

    if ('amount' in data || 'probability' in data || 'statusCode' in data) {
      data.weightedPipeline = amount * probability / 100;
    }
    if ('amount' in data || 'totalInvoiced' in data) {
      data.pendingToInvoice = Math.max(0, amount - totalInvoiced);
    }

    const updated = await prisma.opportunity.update({ where: { id }, data });

    await prisma.activityLog.create({
      data: {
        entityType:  'opportunity',
        entityId:    id,
        action:      'updated',
        oldValue:    JSON.stringify(existing),
        newValue:    JSON.stringify(updated),
        performedBy: cleanText(body.updatedBy, 120) || 'Sistema',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    if (error instanceof Error && /JSON|numérico|fecha/.test(error.message)) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 });
  }
}
