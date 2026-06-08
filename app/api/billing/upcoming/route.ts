import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now        = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const in90days   = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const configs = await prisma.billingConfig.findMany({
      include: {
        milestones: { orderBy: { dueDate: 'asc' } },
        opportunity: {
          select: {
            id: true, opportunity: true, client: true,
            company: true, statusCode: true,
            amount: true, totalInvoiced: true, pendingToInvoice: true,
            owner: true,
          },
        },
      },
      where: {
        opportunity: { statusCode: { in: [6, 7] } },
      },
    });

    const items: {
      projectId: string;
      projectName: string;
      client: string;
      company: string;
      owner: string;
      billingType: string;
      amount: number;
      dueDate: string | null;
      status: 'this_month' | 'upcoming' | 'pending_milestone' | 'overdue';
      milestoneName?: string;
      needsConfirmation: boolean;
    }[] = [];

    for (const config of configs) {
      const opp = config.opportunity;
      if (!opp) continue;

      if (config.billingType === 'milestones') {
        // Milestone billing — show uninvoiced milestones
        for (const m of config.milestones) {
          if (m.invoicedAt) continue; // already invoiced

          let status: typeof items[0]['status'] = 'upcoming';
          if (m.dueDate) {
            const due = new Date(m.dueDate);
            if (due < now)             status = 'overdue';
            else if (due <= endMonth)  status = 'this_month';
            else if (due <= in90days)  status = 'upcoming';
            else continue; // too far in future, skip
          } else {
            status = 'pending_milestone'; // no due date — needs manual confirmation
          }

          items.push({
            projectId:         opp.id,
            projectName:       opp.opportunity,
            client:            opp.client,
            company:           opp.company,
            owner:             opp.owner,
            billingType:       'milestones',
            amount:            m.amount,
            dueDate:           m.dueDate ? m.dueDate.toISOString() : null,
            status,
            milestoneName:     m.name,
            needsConfirmation: !m.dueDate,
          });
        }
      } else if (config.billingType === 'monthly') {
        // Monthly billing — generate for current month if within range
        const start = config.billingStartDate;
        const end   = config.billingEndDate;
        if (start && new Date(start) <= endMonth && (!end || new Date(end) >= startMonth)) {
          items.push({
            projectId:         opp.id,
            projectName:       opp.opportunity,
            client:            opp.client,
            company:           opp.company,
            owner:             opp.owner,
            billingType:       'monthly',
            amount:            config.monthlyAmount ?? 0,
            dueDate:           endMonth.toISOString(),
            status:            'this_month',
            milestoneName:     undefined,
            needsConfirmation: false,
          });
        }
      } else if (config.billingType === 'fixed') {
        // Fixed — show if there's pending amount and project is delivering
        if (opp.statusCode === 7 && opp.pendingToInvoice > 0) {
          items.push({
            projectId:         opp.id,
            projectName:       opp.opportunity,
            client:            opp.client,
            company:           opp.company,
            owner:             opp.owner,
            billingType:       'fixed',
            amount:            opp.pendingToInvoice,
            dueDate:           null,
            status:            'pending_milestone',
            milestoneName:     undefined,
            needsConfirmation: true,
          });
        }
      }
    }

    // Sort: overdue first, then this_month, then upcoming, then pending
    const order: Record<string, number> = { overdue: 0, this_month: 1, upcoming: 2, pending_milestone: 3 };
    items.sort((a, b) => {
      const od = (order[a.status] ?? 99) - (order[b.status] ?? 99);
      if (od !== 0) return od;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
    });

    return NextResponse.json({
      items,
      summary: {
        thisMonth:     items.filter(i => i.status === 'this_month').reduce((s, i) => s + i.amount, 0),
        overdue:       items.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
        upcoming90:    items.filter(i => i.status === 'upcoming').reduce((s, i) => s + i.amount, 0),
        needsAction:   items.filter(i => i.needsConfirmation).length,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
