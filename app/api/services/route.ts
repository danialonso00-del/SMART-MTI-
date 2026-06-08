import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [services, costSummaries] = await Promise.all([
      prisma.opportunity.findMany({
        where: { serviceType: { not: null } },
        orderBy: [{ serviceType: 'asc' }, { id: 'asc' }],
        select: {
          id: true, client: true, opportunity: true, company: true,
          owner: true, statusCode: true, serviceType: true, acceptanceDate: true,
        },
      }),
      prisma.projectCostSummary.findMany({
        select: { internalProjectId: true, totalHours: true, totalPeopleCost: true, lastSyncedAt: true },
      }),
    ]);

    const costByProject = new Map(costSummaries.map(c => [c.internalProjectId, c]));

    const enriched = services.map(s => ({
      ...s,
      totalHours:     costByProject.get(s.id)?.totalHours     ?? 0,
      totalPeopleCost: costByProject.get(s.id)?.totalPeopleCost ?? 0,
      lastSyncedAt:   costByProject.get(s.id)?.lastSyncedAt    ?? null,
    }));

    const internal = enriched.filter(s => s.serviceType === 'internal');
    const external = enriched.filter(s => s.serviceType === 'external');

    return NextResponse.json(
      { internal, external },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}
