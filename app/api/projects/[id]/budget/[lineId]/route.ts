import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; lineId: string } }) {
  const body = await req.json();
  const existing = await prisma.budgetLine.findFirst({
    where: { id: params.lineId, opportunityId: params.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Línea de presupuesto no encontrada' }, { status: 404 });
  }

  const line = await prisma.budgetLine.update({
    where: { id: params.lineId },
    data: {
      businessLine: body.businessLine,
      description:  body.description,
      quantity:    body.quantity,
      unitCost:    body.unitCost,
      marginPct:   body.marginPct,
      notes:       body.notes ?? null,
    },
  });
  return NextResponse.json(line);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; lineId: string } }) {
  const existing = await prisma.budgetLine.findFirst({
    where: { id: params.lineId, opportunityId: params.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Línea de presupuesto no encontrada' }, { status: 404 });
  }

  await prisma.budgetLine.delete({
    where: { id: params.lineId },
  });
  return new NextResponse(null, { status: 204 });
}
