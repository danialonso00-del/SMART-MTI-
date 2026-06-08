import { NextRequest, NextResponse } from 'next/server';
import { getFactorialEmployees, normalizeName } from '@/lib/factorial/client';
import { prisma } from '@/lib/prisma';
import type { FactorialEmployee } from '@/lib/factorial/types';

// GET — Returns internal employees with their Factorial match status
export async function GET() {
  try {
    const [internalEmployees, factorialEmployees] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, factorialId: true, email: true, hourlyCost: true, department: true },
        orderBy: { name: 'asc' },
      }),
      getFactorialEmployees(),
    ]);

    // Map Factorial employees by id for quick lookup
    const factorialById = new Map<number, FactorialEmployee>(
      (factorialEmployees as FactorialEmployee[]).map(
        (fe: FactorialEmployee) => [fe.id, fe] as [number, FactorialEmployee],
      ),
    );

    // Set of Factorial IDs already linked to an internal employee
    const linkedFactorialIds = new Set<number>(
      internalEmployees
        .filter(e => e.factorialId)
        .map(e => Number(e.factorialId)),
    );

    // Enrich internal employees with their Factorial counterpart
    const internal = internalEmployees.map(emp => {
      const factorialEmp = emp.factorialId ? factorialById.get(Number(emp.factorialId)) ?? null : null;
      return {
        id:                emp.id,
        name:              emp.name,
        department:        emp.department,
        hourlyCost:        emp.hourlyCost,
        factorialId:       emp.factorialId,
        factorialName:     factorialEmp ? (factorialEmp.full_name ?? `${factorialEmp.first_name} ${factorialEmp.last_name}`) : null,
        factorialEmail:    factorialEmp?.email ?? null,
        linked:            !!emp.factorialId,
      };
    });

    // Factorial employees not yet linked to any internal employee
    const factorialUnmatched = (factorialEmployees as FactorialEmployee[])
      .filter(fe => !linkedFactorialIds.has(fe.id))
      .map(fe => ({
        id:    fe.id,
        name:  fe.full_name ?? `${fe.first_name} ${fe.last_name}`,
        email: fe.email,
      }));

    // All Factorial employees (for the dropdown when linking manually)
    const factorialAll = (factorialEmployees as FactorialEmployee[]).map(fe => ({
      id:    fe.id,
      name:  fe.full_name ?? `${fe.first_name} ${fe.last_name}`,
      email: fe.email,
    }));

    const linked   = internal.filter(e => e.linked).length;
    const unlinked = internal.filter(e => !e.linked).length;

    return NextResponse.json({ internal, factorialAll, factorialUnmatched, stats: { total: internal.length, linked, unlinked } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading employee mappings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — Manually link or unlink an internal employee to a Factorial employee
export async function POST(request: NextRequest) {
  try {
    const { internalEmployeeId, factorialEmployeeId } = await request.json();
    if (!internalEmployeeId) return NextResponse.json({ error: 'internalEmployeeId required' }, { status: 400 });

    await prisma.employee.update({
      where: { id: internalEmployeeId },
      data:  { factorialId: factorialEmployeeId ? String(factorialEmployeeId) : null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error updating employee mapping';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
