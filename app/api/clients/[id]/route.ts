import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, optionalDate, optionalText, readJsonObject } from '@/lib/api-security';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientName = decodeURIComponent(params.id);

    // Try by name first, then by id (cuid)
    let client = await prisma.client.findFirst({
      where: { name: clientName },
    });
    if (!client) {
      client = await prisma.client.findUnique({ where: { id: clientName } });
    }
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { client: client.name },
      orderBy: [{ statusCode: 'asc' }, { date: 'desc' }],
    });

    const projects    = opportunities.filter(o => [6, 7, 8].includes(o.statusCode));
    const presales    = opportunities.filter(o => [2, 3, 4, 5].includes(o.statusCode));

    const totalAmount      = opportunities.reduce((s, o) => s + o.amount, 0);
    const totalInvoiced    = projects.reduce((s, o) => s + o.totalInvoiced, 0);
    const pendingToInvoice = projects.reduce((s, o) => s + o.pendingToInvoice, 0);
    const activeProjects   = opportunities.filter(o => o.statusCode === 7).length;
    const openOpps         = presales.length;
    const weightedPipeline = presales.reduce((s, o) => s + o.weightedPipeline, 0);
    const totalCosts       = projects.reduce((s, o) => s + o.costs, 0);

    // Business line breakdown across all opps
    const blBreakdown = {
      hardware:    opportunities.reduce((s, o) => s + o.blHardware, 0),
      ia:          opportunities.reduce((s, o) => s + o.blIa, 0),
      bim:         opportunities.reduce((s, o) => s + o.blBim, 0),
      ttioOm:      opportunities.reduce((s, o) => s + o.blTtioOm, 0),
      events:      opportunities.reduce((s, o) => s + o.blEvents, 0),
      proservices: opportunities.reduce((s, o) => s + o.blProservices, 0),
    };

    return NextResponse.json({
      client,
      opportunities,
      projects,
      presales,
      summary: {
        totalAmount,
        totalInvoiced,
        pendingToInvoice,
        activeProjects,
        openOpportunities: openOpps,
        weightedPipeline,
        totalCosts,
        blBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching client detail:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientName = decodeURIComponent(params.id);
    const body = await readJsonObject(req);

    let client = await prisma.client.findFirst({ where: { name: clientName } });
    if (!client) {
      client = await prisma.client.findUnique({ where: { id: clientName } });
    }
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const data = {
      ...(optionalText(body, 'name', 255) !== undefined ? { name: optionalText(body, 'name', 255) } : {}),
      ...(optionalText(body, 'country', 120) !== undefined ? { country: optionalText(body, 'country', 120) } : {}),
      ...(optionalText(body, 'primaryOwner', 120) !== undefined ? { primaryOwner: optionalText(body, 'primaryOwner', 120) } : {}),
      ...(body.lastActivity !== undefined ? { lastActivity: optionalDate(body, 'lastActivity') } : {}),
      ...(optionalText(body, 'notes', 5000) !== undefined ? { notes: optionalText(body, 'notes', 5000) } : {}),
    };

    const updated = await prisma.client.update({
      where: { id: client.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /fecha|JSON/.test(error.message)) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}
