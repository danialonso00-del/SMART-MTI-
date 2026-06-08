import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type      = searchParams.get('type'); // "expense" | "income" | null (all)

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const where = {
      internalProjectId: projectId,
      ...(type ? { entryType: type } : {}),
    };

    const entries = await prisma.accountingEntry.findMany({
      where,
      orderBy: [{ entryDate: 'asc' }, { asiento: 'asc' }],
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        entryDate: true,
        asiento: true,
        concept: true,
        debit: true,
        credit: true,
        balance: true,
        entryType: true,
        rawAnalyticCode: true,
      },
    });

    // Aggregate totals
    const totalIncome  = entries.filter(e => e.entryType === 'income').reduce((s, e) => s + e.credit, 0);
    const totalExpense = entries.filter(e => e.entryType === 'expense').reduce((s, e) => s + e.debit, 0);

    // Group expenses by account
    const byAccount: Record<string, { accountCode: string; accountName: string; total: number; count: number }> = {};
    entries.filter(e => e.entryType === 'expense').forEach(e => {
      if (!byAccount[e.accountCode]) {
        byAccount[e.accountCode] = { accountCode: e.accountCode, accountName: e.accountName, total: 0, count: 0 };
      }
      byAccount[e.accountCode].total += e.debit;
      byAccount[e.accountCode].count++;
    });

    const lastImport = await prisma.accountingEntry.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      entries,
      totalIncome,
      totalExpense,
      byAccount: Object.values(byAccount).sort((a, b) => b.total - a.total),
      lastImportedAt: lastImport?.createdAt ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed';
    console.error('[accounting/entries]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
