import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Obtener clientes con sus métricas agregadas de opportunities
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });

    // Agregar métricas de oportunidades por cliente
    const clientsWithMetrics = await Promise.all(
      clients.map(async (client) => {
        const opportunities = await prisma.opportunity.findMany({
          where: { client: client.name },
        });

        const totalAmount     = opportunities.reduce((s, o) => s + o.amount, 0);
        const totalInvoiced   = opportunities.reduce((s, o) => s + o.totalInvoiced, 0);
        const pendingToInvoice = opportunities.reduce((s, o) => s + o.pendingToInvoice, 0);
        const projectsCount   = opportunities.filter(o => [6, 7, 8].includes(o.statusCode)).length;
        const opportunitiesCount = opportunities.filter(o => [2, 3, 4, 5].includes(o.statusCode)).length;

        return {
          ...client,
          totalAmount,
          totalInvoiced,
          pendingToInvoice,
          projectsCount,
          opportunitiesCount,
        };
      })
    );

    return NextResponse.json(clientsWithMetrics);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = await prisma.client.create({ data: body });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
