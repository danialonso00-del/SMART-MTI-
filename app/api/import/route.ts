import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Historial de importaciones
export async function GET() {
  try {
    const history = await prisma.importHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}

// POST - Registrar una nueva importación (el procesamiento real del Excel se haría aquí)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const importRecord = await prisma.importHistory.create({
      data: {
        fileName:       body.fileName || 'import.xlsx',
        uploadedBy:     body.uploadedBy || 'Usuario',
        recordsTotal:   body.recordsTotal || 0,
        recordsOk:      body.recordsOk || 0,
        recordsError:   body.recordsError || 0,
        recordsWarning: body.recordsWarning || 0,
        status:         'processing',
        errorLog:       body.errorLog ? JSON.stringify(body.errorLog) : null,
      },
    });

    // Aquí iría la lógica real de importación:
    // 1. Parsear el Excel con librería como 'xlsx' o 'exceljs'
    // 2. Validar cada fila contra el schema
    // 3. Upsert en la tabla opportunities
    // 4. Actualizar el registro de importHistory con el resultado

    // Por ahora marcamos como completado inmediatamente
    const completed = await prisma.importHistory.update({
      where: { id: importRecord.id },
      data: {
        status:      'completed',
        completedAt: new Date(),
      },
    });

    return NextResponse.json(completed, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error en importación' }, { status: 500 });
  }
}
