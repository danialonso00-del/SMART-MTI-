import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { milestoneId } = await params;
  try {
    const body = await request.json();
    const { name, amount, dueDate, invoicedAt, invoiceRef } = body;

    const milestone = await prisma.billingMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(name       !== undefined && { name }),
        ...(amount     !== undefined && { amount }),
        ...(dueDate    !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(invoicedAt !== undefined && { invoicedAt: invoicedAt ? new Date(invoicedAt) : null }),
        ...(invoiceRef !== undefined && { invoiceRef }),
      },
    });
    return NextResponse.json(milestone);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { milestoneId } = await params;
  try {
    await prisma.billingMilestone.delete({ where: { id: milestoneId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
