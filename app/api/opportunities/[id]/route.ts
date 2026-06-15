import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, cleanText, optionalDate, readJsonObject } from '@/lib/api-security';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: params.id },
    });
    if (!opportunity) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json(opportunity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al obtener oportunidad' }, { status: 500 });
  }
}

// Fields that the PATCH endpoint is allowed to update
const UPDATABLE_FIELDS = [
  'opportunity', 'client', 'description', 'statusCode', 'company', 'owner',
  'country', 'date', 'expectedClosingDate', 'currency', 'amount', 'probability',
  'costs', 'totalInvoiced', 'blHardware', 'blIa', 'blBim', 'blTtioOm',
  'blEvents', 'blProservices', 'observations', 'acceptanceDate', 'endDate',
  'materialCost', 'peopleCost', 'margin', 'isInternal', 'wipStatus',
  'totalPercentage', 'week', 'nextYears',
] as const;

type UpdatePayload = Record<string, unknown>;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await readJsonObject(req);

    // Fetch current record — needed for deriving weighted/pending when partial updates come in
    const current = await prisma.opportunity.findUnique({ where: { id: params.id } });
    if (!current) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }

    // Only keep fields that are present in the request body AND are in the allow-list
    const data: UpdatePayload = {};
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        data[field] = body[field];
      }
    }

    // Coerce numeric fields if present
    const numericFields = [
      'amount', 'probability', 'costs', 'totalInvoiced',
      'blHardware', 'blIa', 'blBim', 'blTtioOm', 'blEvents', 'blProservices',
      'materialCost', 'peopleCost', 'margin', 'wipStatus', 'totalPercentage',
      'week', 'nextYears',
    ] as const;
    for (const f of numericFields) {
      if (f in data) data[f] = Number(data[f]) || 0;
    }

    // Convert date strings to Date objects (Prisma requires full ISO-8601, not "YYYY-MM-DD")
    const dateFields = ['date', 'expectedClosingDate', 'acceptanceDate', 'endDate'] as const;
    for (const f of dateFields) {
      if (f in data) {
        data[f] = optionalDate(data, f);
      }
    }

    // Recompute derived fields using the effective values (from patch or from current record)
    const effectiveAmount      = 'amount'      in data ? (data.amount      as number) : current.amount;
    const effectiveProbability = 'probability' in data ? (data.probability as number) : current.probability;
    const effectiveInvoiced    = 'totalInvoiced' in data ? (data.totalInvoiced as number) : current.totalInvoiced;

    data.weightedPipeline = effectiveAmount * (effectiveProbability / 100);
    data.pendingToInvoice = effectiveAmount - effectiveInvoiced;

    const updated = await prisma.opportunity.update({
      where: { id: params.id },
      data,
    });

    // Log activity (fire-and-forget — don't fail the request if logging fails)
    prisma.activityLog.create({
      data: {
        entityType:  'opportunity',
        entityId:    params.id,
        action:      'updated',
        oldValue:    JSON.stringify(current),
        newValue:    JSON.stringify(updated),
        performedBy: cleanText(body.updatedBy, 120) || 'Sistema',
      },
    }).catch(err => console.error('activityLog error:', err));

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH opportunity error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (/JSON|numérico|fecha/.test(message)) return badRequest(message);
    return NextResponse.json({ error: `Error al actualizar: ${message}` }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.opportunity.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
