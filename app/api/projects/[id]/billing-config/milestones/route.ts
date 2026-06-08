import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, amount, dueDate } = body;

    // Ensure config exists
    const config = await prisma.billingConfig.upsert({
      where: { internalProjectId: id },
      update: {},
      create: { internalProjectId: id, billingType: 'milestones' },
    });

    const milestone = await prisma.billingMilestone.create({
      data: {
        billingConfigId: config.id,
        name: name ?? 'Hito sin nombre',
        amount: amount ?? 0,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    return NextResponse.json(milestone, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
