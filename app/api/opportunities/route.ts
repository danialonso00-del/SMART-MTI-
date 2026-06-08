import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  const statusCode   = searchParams.get('status');
  const company      = searchParams.get('company');
  const owner        = searchParams.get('owner');
  const country      = searchParams.get('country');
  const search       = searchParams.get('search');
  const lite         = searchParams.get('lite') === 'true';

  try {
    const where: Record<string, unknown> = {};

    if (statusCode) where.statusCode = parseInt(statusCode);
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

    return NextResponse.json(opportunities, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Error al obtener oportunidades' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const opportunity = await prisma.opportunity.create({
      data: {
        ...body,
        date:               new Date(body.date),
        expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : null,
        acceptanceDate:      body.acceptanceDate      ? new Date(body.acceptanceDate)      : null,
        endDate:             body.endDate             ? new Date(body.endDate)             : null,
        weightedPipeline:   (body.amount || 0) * ((body.probability || 0) / 100),
        pendingToInvoice:   (body.amount || 0) - (body.totalInvoiced || 0),
      },
    });

    // Registrar actividad
    await prisma.activityLog.create({
      data: {
        entityType:  'opportunity',
        entityId:    opportunity.id,
        action:      'created',
        newValue:    JSON.stringify(opportunity),
        performedBy: body.createdBy || 'Sistema',
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: 'Error al crear oportunidad' }, { status: 500 });
  }
}
