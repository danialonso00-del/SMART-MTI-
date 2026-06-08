import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProjectFolder } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const { opportunityId } = await req.json();
    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId es obligatorio' }, { status: 400 });
    }

    const opp = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, client: true, opportunity: true, driveFolderId: true },
    });

    if (!opp) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }

    if (opp.driveFolderId) {
      return NextResponse.json({
        folderId: opp.driveFolderId,
        folderUrl: `https://drive.google.com/drive/folders/${opp.driveFolderId}`,
        alreadyExists: true,
      });
    }

    const { folderId, folderUrl } = await createProjectFolder(
      opp.id,
      opp.client,
      opp.opportunity,
    );

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { driveFolderId: folderId },
    });

    return NextResponse.json({ folderId, folderUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear carpeta en Drive';
    console.error('[Drive] create-folder error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
