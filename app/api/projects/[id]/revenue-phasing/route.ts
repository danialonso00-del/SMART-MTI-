import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const phasing = await prisma.revenuePhasing.findMany({
    where: { opportunityId: params.id },
    orderBy: { year: 'asc' },
  });
  return NextResponse.json(phasing);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const rows: { year: number; amount: number; notes?: string }[] = body.phasing ?? [];

  await prisma.revenuePhasing.deleteMany({ where: { opportunityId: params.id } });

  if (rows.length > 0) {
    await prisma.revenuePhasing.createMany({
      data: rows.map(r => ({
        opportunityId: params.id,
        year:   r.year,
        amount: r.amount,
        notes:  r.notes ?? null,
      })),
    });
  }

  const result = await prisma.revenuePhasing.findMany({
    where: { opportunityId: params.id },
    orderBy: { year: 'asc' },
  });
  return NextResponse.json(result);
}
