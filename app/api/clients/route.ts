import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, optionalDate, optionalText, readJsonObject, requiredText } from '@/lib/api-security';

export async function GET() {
  try {
    const [clients, opportunityMetrics] = await Promise.all([
      prisma.client.findMany({ orderBy: { name: 'asc' } }),
      prisma.opportunity.groupBy({
        by: ['client', 'statusCode'],
        _sum: { amount: true, totalInvoiced: true, pendingToInvoice: true },
        _count: true,
      }),
    ]);

    const clientsWithMetrics = clients.map((client) => {
      const rows = opportunityMetrics.filter(r => r.client === client.name);
      const totalAmount        = rows.reduce((s, r) => s + (r._sum.amount          ?? 0), 0);
      const totalInvoiced      = rows.reduce((s, r) => s + (r._sum.totalInvoiced   ?? 0), 0);
      const pendingToInvoice   = rows.reduce((s, r) => s + (r._sum.pendingToInvoice ?? 0), 0);
      const projectsCount      = rows.filter(r => [6, 7, 8].includes(r.statusCode)).reduce((s, r) => s + r._count, 0);
      const opportunitiesCount = rows.filter(r => [2, 3, 4, 5].includes(r.statusCode)).reduce((s, r) => s + r._count, 0);
      return { ...client, totalAmount, totalInvoiced, pendingToInvoice, projectsCount, opportunitiesCount };
    });

    return NextResponse.json(clientsWithMetrics, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    const client = await prisma.client.create({
      data: {
        name:         requiredText(body, 'name', 255),
        country:      optionalText(body, 'country', 120) || 'Spain',
        primaryOwner: optionalText(body, 'primaryOwner', 120) || '',
        lastActivity: optionalDate(body, 'lastActivity'),
        notes:        optionalText(body, 'notes', 5000),
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /obligatorio|fecha|JSON/.test(error.message)) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
