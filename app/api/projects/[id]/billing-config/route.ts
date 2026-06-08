import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const config = await prisma.billingConfig.findUnique({
      where: { internalProjectId: id },
      include: { milestones: { orderBy: { dueDate: 'asc' } } },
    });
    return NextResponse.json(config ?? null);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { billingType, monthlyAmount, billingStartDate, billingEndDate, notes } = body;

    const config = await prisma.billingConfig.upsert({
      where: { internalProjectId: id },
      update: {
        billingType: billingType ?? 'fixed',
        monthlyAmount: monthlyAmount ?? null,
        billingStartDate: billingStartDate ? new Date(billingStartDate) : null,
        billingEndDate: billingEndDate ? new Date(billingEndDate) : null,
        notes: notes ?? null,
      },
      create: {
        internalProjectId: id,
        billingType: billingType ?? 'fixed',
        monthlyAmount: monthlyAmount ?? null,
        billingStartDate: billingStartDate ? new Date(billingStartDate) : null,
        billingEndDate: billingEndDate ? new Date(billingEndDate) : null,
        notes: notes ?? null,
      },
      include: { milestones: { orderBy: { dueDate: 'asc' } } },
    });
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
