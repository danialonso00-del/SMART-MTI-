import { NextRequest, NextResponse } from 'next/server';
import { getFactorialProjects, createFactorialProject, addProjectWorker } from '@/lib/factorial/client';
import type { FactorialProject } from '@/lib/factorial/types';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [factorialProjects, mappings] = await Promise.all([
      getFactorialProjects(),
      prisma.factorialProjectMapping.findMany(),
    ]);

    const mappingByFactorialId = new Map<number, typeof mappings[0]>(
      mappings
        .filter(m => m.factorialProjectId !== null)
        .map(m => [m.factorialProjectId as number, m] as [number, typeof m]),
    );

    const enriched = factorialProjects.map((fp: FactorialProject) => ({
      ...fp,
      mapping: mappingByFactorialId.get(fp.id) ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching Factorial projects';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, name, code, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name es obligatorio' }, { status: 400 });
    }

    // Check if already mapped to avoid creating duplicates in Factorial
    if (opportunityId) {
      const existing = await prisma.factorialProjectMapping.findUnique({
        where: { internalProjectId: opportunityId },
      });
      if (existing?.factorialProjectId) {
        return NextResponse.json(
          { error: `Este proyecto ya está vinculado a Factorial (ID: ${existing.factorialProjectId})` },
          { status: 409 },
        );
      }
    }

    const project = await createFactorialProject({ name, code, description });

    // If an opportunityId was provided, create or update the mapping
    if (opportunityId) {
      await prisma.factorialProjectMapping.upsert({
        where: { internalProjectId: opportunityId },
        create: {
          internalProjectId:    opportunityId,
          factorialProjectId:   project.id,
          factorialProjectCode: project.code ?? code ?? null,
          factorialProjectName: project.name,
          matchStatus:          'matched',
          notes:                'Creado desde MTI Business Control',
        },
        update: {
          factorialProjectId:   project.id,
          factorialProjectCode: project.code ?? code ?? null,
          factorialProjectName: project.name,
          matchStatus:          'matched',
        },
      });
    }

    // Assign selected employees as project workers
    const workerEmployeeIds: string[] = Array.isArray(body.workerEmployeeIds) ? body.workerEmployeeIds : [];

    // If no employees explicitly selected, fall back to Daniel Alonso
    const employeeWhere = workerEmployeeIds.length > 0
      ? { id: { in: workerEmployeeIds }, isActive: true }
      : {
          isActive: true,
          OR: [
            { name: { contains: 'Daniel Alonso', mode: 'insensitive' as const } },
            { factorialId: '1543043' },
          ],
        };

    const selectedEmployees = await prisma.employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true, factorialId: true },
    });

    let assignedCount = 0;
    const workerErrors: string[] = [];

    for (const emp of selectedEmployees) {
      if (!emp.factorialId) continue;
      try {
        await addProjectWorker(project.id, Number(emp.factorialId));
        assignedCount++;
      } catch (workerErr) {
        const msg = workerErr instanceof Error ? workerErr.message : 'Error';
        workerErrors.push(`${emp.name}: ${msg}`);
        console.warn(`[Factorial] Could not add ${emp.name} as worker:`, workerErr);
      }
    }

    return NextResponse.json({
      ...project,
      workerAssignment: { assignedCount, errors: workerErrors },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creating Factorial project';
    console.error('[Factorial] create project error:', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
