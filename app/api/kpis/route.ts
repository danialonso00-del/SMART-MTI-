import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Use DB-level aggregations instead of loading all rows into JS
    const [byStatusRaw, byCompanyRaw, blAgg, topClientsRaw] = await Promise.all([
      // Group by statusCode
      prisma.opportunity.groupBy({
        by: ['statusCode'],
        where: { isInternal: false },
        _sum: { amount: true, totalInvoiced: true, weightedPipeline: true },
        _count: true,
      }),

      // Group by company
      prisma.opportunity.groupBy({
        by: ['company'],
        where: { isInternal: false },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),

      // BL sums — single aggregation
      prisma.opportunity.aggregate({
        where: { isInternal: false },
        _sum: { blHardware: true, blIa: true, blBim: true, blTtioOm: true, blEvents: true, blProservices: true },
      }),

      // Top clients
      prisma.opportunity.groupBy({
        by: ['client'],
        where: { isInternal: false },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
    ]);

    // Helper to sum by status group
    function sumStatus(codes: number[]) {
      return byStatusRaw
        .filter(r => codes.includes(r.statusCode))
        .reduce((s, r) => ({ amount: s.amount + (r._sum.amount ?? 0), invoiced: s.invoiced + (r._sum.totalInvoiced ?? 0), weighted: s.weighted + (r._sum.weightedPipeline ?? 0), count: s.count + r._count }), { amount: 0, invoiced: 0, weighted: 0, count: 0 });
    }

    const active    = sumStatus([2, 3, 4, 5, 6, 7, 8]);
    const accepted  = sumStatus([6, 7, 8]);
    const delivering = byStatusRaw.find(r => r.statusCode === 7)?._count ?? 0;
    const finished   = byStatusRaw.find(r => r.statusCode === 8)?._count ?? 0;
    const lost       = byStatusRaw.find(r => r.statusCode === 9)?._count ?? 0;
    const presales   = sumStatus([2, 3, 4, 5]);

    // Avg margin still needs a targeted query
    const marginAgg = await prisma.opportunity.aggregate({
      where: { isInternal: false, statusCode: { in: [6, 7, 8] }, margin: { gt: 0 } },
      _avg: { margin: true },
    });

    const byStatus = [2, 3, 4, 5, 6, 7, 8, 9].map(code => {
      const row = byStatusRaw.find(r => r.statusCode === code);
      return { statusCode: code, count: row?._count ?? 0, amount: row?._sum.amount ?? 0 };
    });

    const byCompany = byCompanyRaw.map(r => ({
      company: r.company,
      amount: r._sum.amount ?? 0,
      count: r._count,
    }));

    const businessLines = {
      hardware:    blAgg._sum.blHardware    ?? 0,
      ia:          blAgg._sum.blIa          ?? 0,
      bim:         blAgg._sum.blBim         ?? 0,
      ttioOm:      blAgg._sum.blTtioOm      ?? 0,
      events:      blAgg._sum.blEvents      ?? 0,
      proservices: blAgg._sum.blProservices ?? 0,
    };

    const topClients = topClientsRaw.map(r => ({ name: r.client, amount: r._sum.amount ?? 0 }));

    return NextResponse.json(
      {
        totals: {
          totalPipeline:     active.amount,
          weightedPipeline:  active.weighted,
          totalAccepted:     accepted.amount,
          totalInvoiced:     accepted.invoiced,
          totalPending:      accepted.amount - accepted.invoiced,
          avgMargin:         marginAgg._avg.margin ?? 0,
          openOpportunities: presales.count,
          delivering,
          finished,
          lost,
        },
        byStatus,
        byCompany,
        businessLines,
        topClients,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ error: 'Error al obtener KPIs' }, { status: 500 });
  }
}
