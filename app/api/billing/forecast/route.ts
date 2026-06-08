import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ForecastMonth {
  key: string;       // YYYY-MM
  label: string;     // "Jun 26"
  expected: number;  // total expected invoicing
  invoiced: number;  // already invoiced in that month (milestones with invoicedAt)
  items: {
    projectId: string;
    projectName: string;
    client: string;
    company: string;
    amount: number;
    type: 'milestone' | 'monthly' | 'fixed';
    detail: string;
  }[];
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(d: Date) {
  return d.toLocaleString('es', { month: 'short', year: '2-digit' });
}

export async function GET() {
  try {
    const configs = await prisma.billingConfig.findMany({
      include: {
        milestones: true,
        opportunity: {
          select: {
            id: true,
            client: true,
            opportunity: true,
            company: true,
            amount: true,
            totalInvoiced: true,
            pendingToInvoice: true,
            statusCode: true,
          },
        },
      },
      where: {
        opportunity: { statusCode: { in: [6, 7] } }, // active projects only
      },
    });

    const now = new Date();
    const months: Record<string, ForecastMonth> = {};

    // Build 15-month window: 1 past month + current + 13 future
    for (let i = -1; i <= 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKey(d);
      months[key] = { key, label: monthLabel(d), expected: 0, invoiced: 0, items: [] };
    }

    for (const config of configs) {
      const opp = config.opportunity;
      const projectName = opp.opportunity;

      if (config.billingType === 'milestones') {
        for (const m of config.milestones) {
          const ref = m.invoicedAt ?? m.dueDate;
          if (!ref) continue;
          const key = monthKey(new Date(ref));
          if (!months[key]) continue;

          if (m.invoicedAt) {
            months[key].invoiced += m.amount;
          } else {
            months[key].expected += m.amount;
            months[key].items.push({
              projectId: opp.id,
              projectName,
              client: opp.client,
              company: opp.company,
              amount: m.amount,
              type: 'milestone',
              detail: m.name,
            });
          }
        }
      } else if (config.billingType === 'monthly' && config.monthlyAmount) {
        const start = config.billingStartDate ? new Date(config.billingStartDate) : now;
        const end   = config.billingEndDate   ? new Date(config.billingEndDate)   : new Date(now.getFullYear(), now.getMonth() + 12, 1);

        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) {
          const key = monthKey(cur);
          if (months[key]) {
            // If the month is in the past, count as invoiced (approximate)
            if (cur < new Date(now.getFullYear(), now.getMonth(), 1)) {
              months[key].invoiced += config.monthlyAmount;
            } else {
              months[key].expected += config.monthlyAmount;
              months[key].items.push({
                projectId: opp.id,
                projectName,
                client: opp.client,
                company: opp.company,
                amount: config.monthlyAmount,
                type: 'monthly',
                detail: 'Facturación mensual recurrente',
              });
            }
          }
          cur.setMonth(cur.getMonth() + 1);
        }
      } else if (config.billingType === 'fixed') {
        const pending = opp.pendingToInvoice;
        if (pending <= 0) continue;

        // Distribute remaining amount: current month + next 2
        const share = pending / 3;
        for (let i = 0; i < 3; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const key = monthKey(d);
          if (!months[key]) continue;
          months[key].expected += share;
          months[key].items.push({
            projectId: opp.id,
            projectName,
            client: opp.client,
            company: opp.company,
            amount: share,
            type: 'fixed',
            detail: `Precio fijo — tramo ${i + 1}/3`,
          });
        }
      }
    }

    // Also add already-invoiced milestones to invoiced buckets (for historical accuracy)
    const invoicedMilestones = await prisma.billingMilestone.findMany({
      where: { invoicedAt: { not: null } },
      include: {
        billingConfig: {
          include: { opportunity: { select: { statusCode: true } } },
        },
      },
    });
    for (const m of invoicedMilestones) {
      if (!m.invoicedAt) continue;
      const key = monthKey(new Date(m.invoicedAt));
      if (months[key]) months[key].invoiced += m.amount;
    }

    const result = Object.values(months).sort((a, b) => a.key.localeCompare(b.key));

    const totals = {
      totalExpected: result.reduce((s, m) => s + m.expected, 0),
      totalInvoiced: result.reduce((s, m) => s + m.invoiced, 0),
      nextMonthExpected: result.find(m => m.key === monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1)))?.expected ?? 0,
      thisMonthExpected: result.find(m => m.key === monthKey(now))?.expected ?? 0,
    };

    return NextResponse.json({ months: result, totals }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[billing/forecast] error:', err);
    return NextResponse.json({ error: 'Error al calcular previsión' }, { status: 500 });
  }
}
