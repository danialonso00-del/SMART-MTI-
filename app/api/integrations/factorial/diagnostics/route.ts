import { NextRequest, NextResponse } from 'next/server';
import { getFactorialProjects, getAllProjectWorkers, getAllTimeRecords, buildProjectCodeMap } from '@/lib/factorial/client';
import { prisma } from '@/lib/prisma';
import type { FactorialProject, FactorialProjectWorker, FactorialTimeRecord } from '@/lib/factorial/types';

// GET — cross-reference Factorial projects vs internal projects and show raw codes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ?? '2025-01-01';
    const endDate   = searchParams.get('endDate')   ?? new Date().toISOString().slice(0, 10);

    const [internalProjects, factorialProjects, projectWorkers, timeRecords] = await Promise.all([
      prisma.opportunity.findMany({
        where: { statusCode: { in: [6, 7, 8] } },
        select: { id: true, opportunity: true, statusCode: true },
        orderBy: { id: 'asc' },
      }),
      getFactorialProjects(),
      getAllProjectWorkers(),
      getAllTimeRecords({ startDate, endDate }),
    ]);

    // Time record counts per project_worker
    const trCountByPw = new Map<number, number>();
    const trMinutesByPw = new Map<number, number>();
    for (const tr of timeRecords as FactorialTimeRecord[]) {
      trCountByPw.set(tr.project_worker_id, (trCountByPw.get(tr.project_worker_id) ?? 0) + 1);
      trMinutesByPw.set(tr.project_worker_id, (trMinutesByPw.get(tr.project_worker_id) ?? 0) + (tr.imputed_minutes ?? 0));
    }

    // Project-worker counts per project
    const pwByProject = new Map<number, FactorialProjectWorker[]>();
    for (const pw of projectWorkers as FactorialProjectWorker[]) {
      const list = pwByProject.get(pw.project_id) ?? [];
      list.push(pw);
      pwByProject.set(pw.project_id, list);
    }

    const internalIds = new Set(internalProjects.map(ip => ip.id));
    const factorialCodeMap = buildProjectCodeMap(factorialProjects as FactorialProject[]);

    // Factorial projects enriched
    const factorialEnriched = (factorialProjects as FactorialProject[]).map(fp => {
      const workers = pwByProject.get(fp.id) ?? [];
      const totalTrMinutes = workers.reduce((s, pw) => s + (trMinutesByPw.get(pw.id) ?? 0), 0);
      const totalTrCount   = workers.reduce((s, pw) => s + (trCountByPw.get(pw.id) ?? 0), 0);
      return {
        factorialId:   fp.id,
        factorialCode: fp.code,
        factorialName: fp.name,
        status:        fp.status,
        workersCount:  workers.length,
        timeRecords:   totalTrCount,
        totalMinutes:  totalTrMinutes,
        totalHours:    Math.round(totalTrMinutes / 60 * 10) / 10,
        matchesInternal: fp.code ? (internalIds.has(fp.code.trim()) || (fp.code.match(/^(\d{2}-\d{3})/)?.[1] ? internalIds.has(fp.code.match(/^(\d{2}-\d{3})/)![1]) : false)) : false,
      };
    }).sort((a, b) => (a.factorialCode ?? '').localeCompare(b.factorialCode ?? ''));

    // Internal projects: which ones matched (exact code OR prefix)?
    const internalEnriched = internalProjects.map(ip => ({
      internalId:    ip.id,
      name:          ip.opportunity,
      statusCode:    ip.statusCode,
      matchedInFactorial: factorialCodeMap.has(ip.id),
      factorialCode: factorialCodeMap.get(ip.id)?.code ?? null,
    }));

    return NextResponse.json({
      dateRange: { startDate, endDate },
      counts: {
        internalProjects: internalProjects.length,
        factorialProjects: (factorialProjects as FactorialProject[]).length,
        projectWorkers: (projectWorkers as FactorialProjectWorker[]).length,
        timeRecords: (timeRecords as FactorialTimeRecord[]).length,
        factorialWithCode: (factorialProjects as FactorialProject[]).filter(fp => fp.code).length,
        factorialWithoutCode: (factorialProjects as FactorialProject[]).filter(fp => !fp.code).length,
        matchedProjects: factorialEnriched.filter(fp => fp.matchesInternal).length,
        unmatchedInternal: internalEnriched.filter(ip => !ip.matchedInFactorial).length,
      },
      factorialProjects: factorialEnriched,
      internalUnmatched: internalEnriched.filter(ip => !ip.matchedInFactorial),
      internalMatched:   internalEnriched.filter(ip => ip.matchedInFactorial),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Diagnostics failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
