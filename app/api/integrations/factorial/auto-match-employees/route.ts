import { NextResponse } from 'next/server';
import { getFactorialEmployees, normalizeName } from '@/lib/factorial/client';
import { prisma } from '@/lib/prisma';
import type { FactorialEmployee } from '@/lib/factorial/types';

// POST — Auto-match unlinked internal employees to Factorial employees by email then normalized name
export async function POST() {
  try {
    const [internalEmployees, factorialEmployees] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true, factorialId: null },
        select: { id: true, name: true, factorialName: true, email: true },
      }),
      getFactorialEmployees(),
    ]);

    if (internalEmployees.length === 0) {
      return NextResponse.json({ matched: 0, unmatched: 0, details: { matched: [], unmatched: [] } });
    }

    // Build Factorial lookup maps
    const feByEmail = new Map<string, FactorialEmployee>();
    const feByNorm  = new Map<string, FactorialEmployee>();

    for (const fe of (factorialEmployees as FactorialEmployee[])) {
      const fullName = fe.full_name ?? `${fe.first_name} ${fe.last_name}`;
      if (fe.email) feByEmail.set(fe.email.toLowerCase(), fe);
      feByNorm.set(normalizeName(fullName), fe);
    }

    // Track which Factorial IDs are claimed during this run to avoid duplicates
    const claimedFactorialIds = new Set<number>(
      (await prisma.employee.findMany({
        where: { factorialId: { not: null } },
        select: { factorialId: true },
      })).map(e => Number(e.factorialId)),
    );

    const matched:   { internalName: string; factorialName: string; method: string }[] = [];
    const unmatched: { internalName: string }[] = [];

    for (const emp of internalEmployees) {
      const byEmail    = emp.email         ? feByEmail.get(emp.email.toLowerCase())              : undefined;
      const byFactName = emp.factorialName ? feByNorm.get(normalizeName(emp.factorialName))      : undefined;
      const byNorm     =                     feByNorm.get(normalizeName(emp.name));
      const fe         = byEmail ?? byFactName ?? byNorm ?? null;

      if (!fe || claimedFactorialIds.has(fe.id)) {
        unmatched.push({ internalName: emp.name });
        continue;
      }

      await prisma.employee.update({
        where: { id: emp.id },
        data:  { factorialId: String(fe.id) },
      });

      claimedFactorialIds.add(fe.id);
      const factorialName = fe.full_name ?? `${fe.first_name} ${fe.last_name}`;
      matched.push({
        internalName: emp.name,
        factorialName,
        method: byEmail ? 'email' : byFactName ? 'factorialName' : 'nombre',
      });
    }

    return NextResponse.json({
      matched:   matched.length,
      unmatched: unmatched.length,
      details:   { matched, unmatched },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto-match failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
