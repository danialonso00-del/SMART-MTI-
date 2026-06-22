import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lines = await prisma.budgetLine.findMany({
    where: { opportunityId: params.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(lines);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const agg = await prisma.budgetLine.aggregate({
    where: { opportunityId: params.id },
    _max: { sortOrder: true },
  });
  const line = await prisma.budgetLine.create({
    data: {
      opportunityId: params.id,
      businessLine: body.businessLine ?? 'general',
      description: body.description ?? '',
      quantity:    body.quantity    ?? 1,
      unitCost:    body.unitCost    ?? 0,
      marginPct:   body.marginPct   ?? 0,
      sortOrder:   (agg._max.sortOrder ?? 0) + 1,
      notes:       body.notes       ?? null,
    },
  });
  return NextResponse.json(line, { status: 201 });
}
