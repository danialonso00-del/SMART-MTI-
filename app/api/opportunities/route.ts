import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  badRequest,
  cleanText,
  limitedSearchParam,
  optionalBoolean,
  optionalDate,
  optionalNumber,
  optionalText,
  readJsonObject,
  requiredText,
} from '@/lib/api-security';

// Fields needed for list/table/kanban views (not the detail page)
const LIST_SELECT = {
  id: true, client: true, date: true, opportunity: true,
  amount: true, currency: true, statusCode: true, company: true,
  probability: true, weightedPipeline: true, owner: true, country: true,
  expectedClosingDate: true, acceptanceDate: true,
  blHardware: true, blIa: true, blBim: true, blTtioOm: true, blEvents: true, blProservices: true,
  margin: true, totalInvoiced: true, pendingToInvoice: true, wipStatus: true,
  costs: true, description: true,
} as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const statusCode   = limitedSearchParam(searchParams.get('status'), 10);
  const company      = limitedSearchParam(searchParams.get('company'));
  const owner        = limitedSearchParam(searchParams.get('owner'));
  const country      = limitedSearchParam(searchParams.get('country'));
  const search       = limitedSearchParam(searchParams.get('search'));
  const lite         = searchParams.get('lite') === 'true';
  // services=true devuelve solo entradas INT/EXT; por defecto se excluyen
  const services     = searchParams.get('services') === 'true';

  try {
    const where: Record<string, unknown> = {
      serviceType: services ? { not: null } : null,
    };

    if (statusCode) {
      const parsedStatus = Number(statusCode);
      if (Number.isInteger(parsedStatus)) where.statusCode = parsedStatus;
    }
    if (company)    where.company = company;
    if (owner)      where.owner = owner;
    if (country)    where.country = country;
    if (search) {
      where.OR = [
        { opportunity: { contains: search, mode: 'insensitive' } },
        { client:      { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: [{ statusCode: 'asc' }, { amount: 'desc' }],
      ...(lite ? { select: LIST_SELECT } : {}),
    });

    // Budget aggregates — compute expected margin per project from budget_lines
    type BudgetAggRow = { opportunityId: string; lineCount: bigint; costTotal: number | null; saleTotal: number | null };
    const ids = opportunities.map(o => o.id);
    const budgetAgg = ids.length > 0
      ? await prisma.$queryRaw<BudgetAggRow[]>`
          SELECT
            "opportunityId",
            COUNT(*)::bigint                    AS "lineCount",
            SUM("quantity" * "unitCost")        AS "costTotal",
            SUM(
              CASE
                WHEN "marginPct" >= 100 OR "marginPct" <= 0
                  THEN "quantity" * "unitCost"
                ELSE ("quantity" * "unitCost") / (1.0 - "marginPct" / 100.0)
              END
            )                                   AS "saleTotal"
          FROM budget_lines
          WHERE "opportunityId" = ANY(${ids})
          GROUP BY "opportunityId"
        `
      : [];
    const budgetMap = new Map(budgetAgg.map(r => [r.opportunityId, {
      budgetLineCount: Number(r.lineCount),
      budgetCostTotal: Number(r.costTotal  ?? 0),
      budgetSaleTotal: Number(r.saleTotal  ?? 0),
    }]));

    const result = opportunities.map(o => ({
      ...o,
      ...(budgetMap.get(o.id) ?? { budgetLineCount: 0, budgetCostTotal: 0, budgetSaleTotal: 0 }),
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Error al obtener oportunidades' }, { status: 500 });
  }
}

async function nextSequentialId(): Promise<string> {
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `${yy}-`;
  const existing = await prisma.opportunity.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });
  const nums = existing
    .map(o => parseInt(o.id.slice(prefix.length)))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 99;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);

    const amount = optionalNumber(body, 'amount', 0) ?? 0;
    const probability = optionalNumber(body, 'probability', 0) ?? 0;
    const totalInvoiced = optionalNumber(body, 'totalInvoiced', 0) ?? 0;

    // Use provided ID if non-empty, otherwise assign next sequential ID
    const id = cleanText(body.id, 80) || await nextSequentialId();

    const opportunity = await prisma.opportunity.create({
      data: {
        id,
        client:              requiredText(body, 'client', 255),
        date:                optionalDate(body, 'date') ?? new Date(),
        opportunity:         requiredText(body, 'opportunity', 255),
        description:         optionalText(body, 'description', 5000),
        amount,
        currency:            cleanText(body.currency, 10) || 'EUR',
        statusCode:          optionalNumber(body, 'statusCode', 0) ?? 0,
        company:             requiredText(body, 'company', 80),
        probability,
        weightedPipeline:    amount * (probability / 100),
        owner:               requiredText(body, 'owner', 120),
        country:             cleanText(body.country, 120) || 'Spain',
        expectedClosingDate: optionalDate(body, 'expectedClosingDate'),
        blHardware:          optionalNumber(body, 'blHardware', 0) ?? 0,
        blIa:                optionalNumber(body, 'blIa', 0) ?? 0,
        blBim:               optionalNumber(body, 'blBim', 0) ?? 0,
        blTtioOm:            optionalNumber(body, 'blTtioOm', 0) ?? 0,
        blEvents:            optionalNumber(body, 'blEvents', 0) ?? 0,
        blProservices:       optionalNumber(body, 'blProservices', 0) ?? 0,
        acceptanceDate:      optionalDate(body, 'acceptanceDate'),
        week:                optionalNumber(body, 'week'),
        nextYears:           optionalNumber(body, 'nextYears', 0) ?? 0,
        costs:               optionalNumber(body, 'costs', 0) ?? 0,
        materialCost:        optionalNumber(body, 'materialCost', 0) ?? 0,
        peopleCost:          optionalNumber(body, 'peopleCost', 0) ?? 0,
        margin:              optionalNumber(body, 'margin', 0) ?? 0,
        totalInvoiced,
        pendingToInvoice:    amount - totalInvoiced,
        wipStatus:           optionalNumber(body, 'wipStatus', 0) ?? 0,
        observations:        optionalText(body, 'observations', 5000),
        endDate:             optionalDate(body, 'endDate'),
        totalPercentage:     optionalNumber(body, 'totalPercentage', 0) ?? 0,
        isInternal:          optionalBoolean(body, 'isInternal') ?? false,
        serviceType:         optionalText(body, 'serviceType', 40),
      },
    });

    // Registrar actividad
    await prisma.activityLog.create({
      data: {
        entityType:  'opportunity',
        entityId:    opportunity.id,
        action:      'created',
        newValue:    JSON.stringify(opportunity),
        performedBy: cleanText(body.createdBy, 120) || 'Sistema',
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    if (error instanceof Error && /obligatorio|numérico|fecha|JSON/.test(error.message)) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: 'Error al crear oportunidad' }, { status: 500 });
  }
}
