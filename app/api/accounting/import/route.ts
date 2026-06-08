import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseEuroFloat(s: string): number {
  if (!s) return 0;
  const clean = s.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  // DD/MM/YYYY
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
}

function resolveAnalytic(raw: string): {
  projectCode: string | null;
  isGeneralExpense: boolean;
  generalExpenseEntity: string | null;
} {
  const t = raw.trim();
  if (!t) return { projectCode: null, isGeneralExpense: false, generalExpenseEntity: null };

  // General expense: starts with MTI or ING followed by space or end
  const genMatch = t.match(/^(MTI|ING)\s/);
  if (genMatch) {
    return { projectCode: null, isGeneralExpense: true, generalExpenseEntity: genMatch[1] };
  }

  // A + 3 digits → 26-NNN
  const aMatch = t.match(/^A(\d{3})/);
  if (aMatch) return { projectCode: `26-${aMatch[1]}`, isGeneralExpense: false, generalExpenseEntity: null };

  // 3 digits → 25-NNN
  const numMatch = t.match(/^(\d{3})/);
  if (numMatch) return { projectCode: `25-${numMatch[1]}`, isGeneralExpense: false, generalExpenseEntity: null };

  return { projectCode: null, isGeneralExpense: false, generalExpenseEntity: null };
}

// ── CSV parser ───────────────────────────────────────────────────────────────

interface ParsedEntry {
  accountCode: string;
  accountName: string;
  entryDate: Date | null;
  asiento: number | null;
  concept: string;
  rawAnalyticCode: string;
  resolvedProjectCode: string | null;
  isGeneralExpense: boolean;
  generalExpenseEntity: string | null;
  debit: number;
  credit: number;
  balance: number;
  entryType: string; // "expense" | "income"
}

function parseCSV(text: string): ParsedEntry[] {
  // Split quoted CSV fields
  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ';' && !inQ) { fields.push(cur); cur = ''; continue; }
      cur += ch;
    }
    fields.push(cur);
    return fields;
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const entries: ParsedEntry[] = [];

  let curAccountCode = '';
  let curAccountName = '';
  let curDate: Date | null = null;
  let curAsiento: number | null = null;
  let curConcept = '';

  for (const line of lines) {
    const c = splitLine(line);
    if (c.length < 7) continue;

    const planCol = (c[6] ?? '').trim();

    // Skip subtotal / total rows
    if (planCol === 'SUBTOTAL PLAN01' || planCol.startsWith('TOTAL PLAN')) continue;

    // Update running account code/name if present
    if (c[0]?.trim()) curAccountCode = c[0].trim();
    if (c[1]?.trim()) curAccountName = c[1].trim();

    // Update running date, asiento, concept if present
    const dateStr = (c[2] ?? '').trim();
    const asientoStr = (c[3] ?? '').trim();
    const conceptStr = (c[4] ?? '').trim();

    if (dateStr) curDate = parseDate(dateStr);
    if (asientoStr) curAsiento = parseInt(asientoStr, 10) || null;
    if (conceptStr) curConcept = conceptStr;

    // Analytic code is always in col[10]
    const rawAnalytic = (c[10] ?? '').trim();
    if (!rawAnalytic) continue;

    // Skip MTI/ING rows that are just general overhead — we still record them
    const debit  = parseEuroFloat(c[7] ?? '');
    const credit = parseEuroFloat(c[8] ?? '');
    const balance = parseEuroFloat(c[9] ?? '');

    // Skip zero-amount entries (informational splits)
    if (debit === 0 && credit === 0 && balance === 0) continue;

    if (!curAccountCode) continue;

    // Classify expense vs income by account code prefix
    const entryType = curAccountCode.startsWith('7') ? 'income' : 'expense';

    const { projectCode, isGeneralExpense, generalExpenseEntity } = resolveAnalytic(rawAnalytic);

    entries.push({
      accountCode: curAccountCode,
      accountName: curAccountName,
      entryDate: curDate,
      asiento: curAsiento,
      concept: curConcept,
      rawAnalyticCode: rawAnalytic,
      resolvedProjectCode: projectCode,
      isGeneralExpense,
      generalExpenseEntity,
      debit,
      credit,
      balance,
      entryType,
    });
  }

  return entries;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let csvText = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      const buf = await file.arrayBuffer();
      // Try UTF-8 then latin1
      try {
        csvText = new TextDecoder('utf-8').decode(buf);
      } catch {
        csvText = new TextDecoder('latin1').decode(buf);
      }
    } else {
      csvText = await request.text();
    }

    if (!csvText.trim()) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 });

    const parsed = parseCSV(csvText);

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No valid entries found in CSV' }, { status: 400 });
    }

    // Collect all resolved project codes to check which exist in DB
    const projectCodes = [...new Set(parsed.map(e => e.resolvedProjectCode).filter(Boolean) as string[])];
    const existingOpps = await prisma.opportunity.findMany({
      where: { id: { in: projectCodes } },
      select: { id: true },
    });
    const existingIds = new Set(existingOpps.map(o => o.id));

    // Clear existing accounting entries and replace
    await prisma.accountingEntry.deleteMany({});

    // Batch insert
    const toInsert = parsed.map(e => ({
      accountCode:          e.accountCode,
      accountName:          e.accountName,
      entryDate:            e.entryDate ?? undefined,
      asiento:              e.asiento ?? undefined,
      concept:              e.concept,
      rawAnalyticCode:      e.rawAnalyticCode,
      resolvedProjectCode:  e.resolvedProjectCode ?? undefined,
      internalProjectId:    e.resolvedProjectCode && existingIds.has(e.resolvedProjectCode)
                              ? e.resolvedProjectCode
                              : undefined,
      debit:                e.debit,
      credit:               e.credit,
      balance:              e.balance,
      isGeneralExpense:     e.isGeneralExpense,
      generalExpenseEntity: e.generalExpenseEntity ?? undefined,
      entryType:            e.entryType,
    }));

    // Insert in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await prisma.accountingEntry.createMany({ data: toInsert.slice(i, i + CHUNK) });
    }

    const incomeCount  = toInsert.filter(e => e.entryType === 'income').length;
    const expenseCount = toInsert.filter(e => e.entryType === 'expense').length;
    const matchedCount = toInsert.filter(e => e.internalProjectId).length;
    const unmatchedProjectCodes = projectCodes.filter(c => !existingIds.has(c));

    // General expense totals
    const generalMTI = toInsert
      .filter(e => e.isGeneralExpense && e.generalExpenseEntity === 'MTI')
      .reduce((s, e) => s + e.debit - e.credit, 0);
    const generalING = toInsert
      .filter(e => e.isGeneralExpense && e.generalExpenseEntity === 'ING')
      .reduce((s, e) => s + e.debit - e.credit, 0);

    // ── Sync totalInvoiced and costs to opportunity records from Sage data ──
    // This is the source of truth: Sage CSV overrides manually-entered values
    const projectsToSync = Array.from(existingIds);
    if (projectsToSync.length > 0) {
      const [incomeByProject, expenseByProject] = await Promise.all([
        prisma.accountingEntry.groupBy({
          by: ['internalProjectId'],
          where: { internalProjectId: { in: projectsToSync }, entryType: 'income' },
          _sum: { credit: true },
        }),
        prisma.accountingEntry.groupBy({
          by: ['internalProjectId'],
          where: { internalProjectId: { in: projectsToSync }, entryType: 'expense' },
          _sum: { debit: true },
        }),
      ]);

      const incomeMap  = new Map(incomeByProject.map(r => [r.internalProjectId, r._sum.credit ?? 0]));
      const expenseMap = new Map(expenseByProject.map(r => [r.internalProjectId, r._sum.debit ?? 0]));

      const oppsToSync = await prisma.opportunity.findMany({
        where: { id: { in: projectsToSync } },
        select: { id: true, amount: true },
      });

      await Promise.all(oppsToSync.map(opp => {
        const sageIncome  = incomeMap.get(opp.id) ?? 0;
        const sageExpense = expenseMap.get(opp.id) ?? 0;
        const pending     = Math.max(0, opp.amount - sageIncome);
        return prisma.opportunity.update({
          where: { id: opp.id },
          data: {
            totalInvoiced:   sageIncome,
            pendingToInvoice: pending,
            // Only update costs if Sage has expense data (don't zero out Factorial people costs)
            ...(sageExpense > 0 ? { costs: sageExpense } : {}),
          },
        });
      }));
    }

    return NextResponse.json({
      imported: toInsert.length,
      incomeEntries:  incomeCount,
      expenseEntries: expenseCount,
      matchedEntries: matchedCount,
      generalExpenseMTI: generalMTI,
      generalExpenseING: generalING,
      unmatchedProjectCodes,
      projectsWithData: existingIds.size,
      syncedOpportunities: projectsToSync.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    console.error('[accounting/import]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
