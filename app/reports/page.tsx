'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Printer, TrendingUp, CheckCircle, Trophy, Globe,
  ArrowUp, ArrowDown, Minus, Target, BarChart2, MapPin,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import CompanyBadge from '@/components/ui/CompanyBadge';
import { formatCurrency, formatDate, truncate, cn } from '@/lib/utils';
import { StatusCode } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string; opportunity: string; client: string;
  owner: string; company: string; statusCode: number;
  amount: number; date: string; probability: number;
  weightedPipeline: number; totalInvoiced: number;
  blHardware: number; blIa: number; blBim: number;
  blTtioOm: number; blEvents: number; blProservices: number;
  country: string; acceptanceDate: string | null;
  expectedClosingDate: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ec4899'];

const BL_CONFIG = [
  { key: 'blHardware'    as const, label: 'Hardware',     fill: '#f59e0b' },
  { key: 'blIa'          as const, label: 'AI',           fill: '#3b82f6' },
  { key: 'blBim'         as const, label: 'BIM',          fill: '#8b5cf6' },
  { key: 'blTtioOm'      as const, label: 'TTIO/O&M',     fill: '#10b981' },
  { key: 'blEvents'      as const, label: 'Events',       fill: '#f97316' },
  { key: 'blProservices' as const, label: 'Pro Services', fill: '#06b6d4' },
];

const STAGE_CONFIG = [
  { code: 2, label: 'Opportunity' },
  { code: 3, label: 'Req. Gathering' },
  { code: 4, label: 'Sol. Definition' },
  { code: 5, label: 'Contract Neg.' },
];

const GCC_COUNTRIES = ['UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'];
const ALL_SPECIAL   = ['Spain', 'Malaysia', 'Kenya', 'Saudi Arabia', ...GCC_COUNTRIES];

const REGIONS = [
  { key: 'spain',    label: 'Spain',         countries: ['Spain'] as string[] },
  { key: 'malaysia', label: 'Malaysia',       countries: ['Malaysia'] as string[] },
  { key: 'kenya',    label: 'Kenya',          countries: ['Kenya'] as string[] },
  { key: 'saudi',    label: 'Saudi Arabia',   countries: ['Saudi Arabia'] as string[] },
  { key: 'gcc',      label: 'GCC',            countries: GCC_COUNTRIES as string[] },
  { key: 'other',    label: 'Rest of World',  countries: [] as string[] },
];

const MONTH_LONG  = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Pure helpers ───────────────────────────────────────────────────────────────

function computeBLMix(opps: Opportunity[]) {
  return BL_CONFIG
    .map(bl => ({
      name:  bl.label,
      value: opps.reduce((s, o) => s + ((o[bl.key] as number) || 0), 0),
      fill:  bl.fill,
    }))
    .filter(d => d.value > 0);
}

function computeStages(opps: Opportunity[]) {
  const total = opps.reduce((s, o) => s + o.amount, 0);
  return STAGE_CONFIG
    .map(st => {
      const items    = opps.filter(o => o.statusCode === st.code);
      const amount   = items.reduce((s, o) => s + o.amount, 0);
      const weighted = items.reduce((s, o) => s + o.weightedPipeline, 0);
      return { ...st, count: items.length, amount, weighted, pct: total > 0 ? (amount / total) * 100 : 0 };
    })
    .filter(st => st.count > 0);
}

function regionFilter(region: typeof REGIONS[number], opps: Opportunity[]) {
  if (region.key === 'other') return opps.filter(o => !ALL_SPECIAL.includes(o.country || ''));
  return opps.filter(o => region.countries.includes(o.country || ''));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden avoid-break', className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-amber-600" />
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatTile({
  label, value, sub, comparison, color = 'slate',
}: {
  label: string; value: string; sub?: string;
  comparison?: { curr: number; prev: number; prevLabel: string };
  color?: 'amber' | 'emerald' | 'blue' | 'violet' | 'rose' | 'slate' | 'teal';
}) {
  const bg:  Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200', emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',   violet: 'bg-violet-50 border-violet-200',
    rose: 'bg-rose-50 border-rose-200',   slate: 'bg-slate-50 border-slate-200',
    teal: 'bg-teal-50 border-teal-200',
  };
  const tx:  Record<string, string> = {
    amber: 'text-amber-800', emerald: 'text-emerald-800', blue: 'text-blue-800',
    violet: 'text-violet-800', rose: 'text-rose-800', slate: 'text-slate-700', teal: 'text-teal-800',
  };

  let compEl = null;
  if (comparison) {
    const diff = comparison.curr - comparison.prev;
    const pct  = comparison.prev > 0 ? (diff / comparison.prev) * 100 : null;
    if (diff > 0)
      compEl = <div className="flex items-center gap-1 text-emerald-600 mt-1.5"><ArrowUp size={11}/><span className="text-xs font-semibold">{pct !== null ? `+${pct.toFixed(0)}%` : `+${diff}`} vs {comparison.prevLabel}</span></div>;
    else if (diff < 0)
      compEl = <div className="flex items-center gap-1 text-rose-600 mt-1.5"><ArrowDown size={11}/><span className="text-xs font-semibold">{pct !== null ? `${pct.toFixed(0)}%` : diff} vs {comparison.prevLabel}</span></div>;
    else
      compEl = <div className="flex items-center gap-1 text-slate-400 mt-1.5"><Minus size={11}/><span className="text-xs font-semibold">No change vs {comparison.prevLabel}</span></div>;
  }

  return (
    <div className={cn('rounded-2xl border p-4', bg[color])}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1 opacity-70', tx[color])}>{label}</p>
      <p className={cn('text-2xl font-bold leading-tight', tx[color])}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {compEl}
    </div>
  );
}

function BLDonut({ data }: { data: ReturnType<typeof computeBLMix> }) {
  if (data.length === 0) return <p className="text-xs text-slate-400 text-center py-10">No data for this period</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={65} paddingAngle={2} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [formatCurrency(v), 'Amount']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
            <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
            <span className="text-xs font-bold text-slate-700">{((item.value / total) * 100).toFixed(1)}%</span>
            <span className="text-xs text-slate-400">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageTable({ stages, compact }: { stages: ReturnType<typeof computeStages>; compact?: boolean }) {
  if (stages.length === 0)
    return <p className="text-xs text-slate-400 text-center py-4">No open opportunities</p>;
  const totAmt = stages.reduce((s, st) => s + st.amount, 0);
  const totWgt = stages.reduce((s, st) => s + st.weighted, 0);
  const totCnt = stages.reduce((s, st) => s + st.count, 0);
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
          <th className="text-left py-2 px-3">Stage</th>
          <th className="text-right py-2 px-3">Deals</th>
          <th className="text-right py-2 px-3">Amount</th>
          {!compact && <th className="text-right py-2 px-3">Weighted</th>}
          <th className="text-right py-2 px-3">% Total</th>
        </tr>
      </thead>
      <tbody>
        {stages.map(st => (
          <tr key={st.code} className="border-b border-slate-50 hover:bg-slate-50">
            <td className="py-2 px-3 font-medium text-slate-700">{st.label}</td>
            <td className="py-2 px-3 text-right text-slate-600">{st.count}</td>
            <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatCurrency(st.amount)}</td>
            {!compact && <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(st.weighted)}</td>}
            <td className="py-2 px-3 text-right">
              <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                {st.pct.toFixed(1)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-slate-50 font-bold text-slate-700 border-t border-slate-200">
          <td className="py-2 px-3">Total</td>
          <td className="py-2 px-3 text-right">{totCnt}</td>
          <td className="py-2 px-3 text-right text-slate-900">{formatCurrency(totAmt)}</td>
          {!compact && <td className="py-2 px-3 text-right">{formatCurrency(totWgt)}</td>}
          <td className="py-2 px-3 text-right">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}

function OppRow({ opp, rank }: { opp: Opportunity; rank?: number }) {
  return (
    <a
      href={`/projects/${opp.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
    >
      {rank !== undefined && (
        <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{truncate(opp.opportunity, 50)}</p>
        <p className="text-xs text-slate-400 truncate">{opp.client} · {opp.country}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-slate-900">{formatCurrency(opp.amount)}</p>
        {opp.acceptanceDate && <p className="text-xs text-slate-400">{formatDate(opp.acceptanceDate)}</p>}
        {!opp.acceptanceDate && opp.expectedClosingDate && <p className="text-xs text-slate-400">{formatDate(opp.expectedClosingDate)}</p>}
      </div>
    </a>
  );
}

// Regional section
function RegionBlock({
  label, wonMonth, wonYTD: wonYtd, openOpps, selectedMonth, selectedYear,
}: {
  label: string; wonMonth: Opportunity[]; wonYTD: Opportunity[];
  openOpps: Opportunity[]; selectedMonth: number; selectedYear: number;
}) {
  const stages  = computeStages(openOpps);
  const top5    = [...openOpps].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const mLabel  = `${MONTH_SHORT[selectedMonth - 1]} ${selectedYear}`;

  const totalWonMonth = wonMonth.reduce((s, o) => s + o.amount, 0);
  const totalWonYtd   = wonYtd.reduce((s, o) => s + o.amount, 0);
  const totalOpen     = openOpps.reduce((s, o) => s + o.amount, 0);
  const totalWeighted = openOpps.reduce((s, o) => s + o.weightedPipeline, 0);

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-amber-400 shrink-0" />
          <h3 className="text-sm font-bold text-white">{label}</h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Mini KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">Wins {mLabel}</p>
            <p className="text-lg font-bold text-emerald-800">{wonMonth.length}</p>
            <p className="text-[10px] text-emerald-600">{formatCurrency(totalWonMonth)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Wins YTD {selectedYear}</p>
            <p className="text-lg font-bold text-amber-800">{wonYtd.length}</p>
            <p className="text-[10px] text-amber-600">{formatCurrency(totalWonYtd)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Open Pipeline</p>
            <p className="text-lg font-bold text-blue-800">{openOpps.length}</p>
            <p className="text-[10px] text-blue-600">{formatCurrency(totalOpen)}</p>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide mb-0.5">Weighted Pipeline</p>
            <p className="text-lg font-bold text-violet-800">{formatCurrency(totalWeighted)}</p>
            <p className="text-[10px] text-violet-600">adjusted</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pipeline by stage */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Pipeline by Stage</p>
            <StageTable stages={stages} compact />
          </div>

          {/* Top open opps */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Top Open Opportunities</p>
            {top5.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No open opportunities</p>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {top5.map((o, i) => (
                  <a
                    key={o.id}
                    href={`/projects/${o.id}`}
                    className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-slate-300 w-3 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{truncate(o.opportunity, 40)}</p>
                      <p className="text-[10px] text-slate-400">{o.client}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 shrink-0">{formatCurrency(o.amount)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Won this month list */}
        {wonMonth.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Deals Won in {mLabel}
            </p>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              {wonMonth.map(o => (
                <a
                  key={o.id}
                  href={`/projects/${o.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <StatusBadge statusCode={o.statusCode as StatusCode} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{truncate(o.opportunity, 45)}</p>
                    <p className="text-xs text-slate-400">{o.client} · {o.owner}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-slate-900">{formatCurrency(o.amount)}</p>
                    {o.acceptanceDate && <p className="text-xs text-slate-400">{formatDate(o.acceptanceDate)}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [allOpps, setAllOpps]           = useState<Opportunity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedYear, setSelectedYear]   = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  useEffect(() => {
    fetch('/api/opportunities?lite=true')
      .then(r => r.json())
      .then(data => setAllOpps(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => {
    const s = new Set<number>([new Date().getFullYear()]);
    allOpps.forEach(o => {
      if (o.date) s.add(new Date(o.date).getFullYear());
      if (o.acceptanceDate) s.add(new Date(o.acceptanceDate).getFullYear());
    });
    return [...s].sort((a, b) => b - a);
  }, [allOpps]);

  // ── Computed sets ─────────────────────────────────────────────────────────

  const activeBacklog = useMemo(
    () => allOpps.filter(o => [6, 7].includes(o.statusCode)),
    [allOpps]
  );

  const wonYTD = useMemo(() => {
    const today = new Date();
    // End of the selected month (new Date(y, m, 0) = last day of month m, 1-indexed)
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
    // Cutoff = whichever is earlier: end of selected month OR today
    const cutoff = endOfMonth.getTime() < today.getTime() ? endOfMonth : today;
    return allOpps.filter(o => {
      if (![6, 7, 8].includes(o.statusCode) || !o.acceptanceDate) return false;
      const d = new Date(o.acceptanceDate);
      return d.getFullYear() === selectedYear && d <= cutoff;
    });
  }, [allOpps, selectedYear, selectedMonth]);

  const wonThisMonth = useMemo(
    () => wonYTD.filter(o => new Date(o.acceptanceDate!).getMonth() + 1 === selectedMonth),
    [wonYTD, selectedMonth]
  );

  const wonPrevYearMonth = useMemo(
    () => allOpps.filter(o => {
      if (![6, 7, 8].includes(o.statusCode) || !o.acceptanceDate) return false;
      const d = new Date(o.acceptanceDate);
      return d.getFullYear() === selectedYear - 1 && d.getMonth() + 1 === selectedMonth;
    }),
    [allOpps, selectedYear, selectedMonth]
  );

  const newPipelineThisMonth = useMemo(
    () => allOpps.filter(o => {
      if (!o.date) return false;
      const d = new Date(o.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    }),
    [allOpps, selectedYear, selectedMonth]
  );

  const selectedQ = useMemo(() => Math.ceil(selectedMonth / 3), [selectedMonth]);
  const wonThisQ  = useMemo(
    () => wonYTD.filter(o => Math.ceil((new Date(o.acceptanceDate!).getMonth() + 1) / 3) === selectedQ),
    [wonYTD, selectedQ]
  );

  const openPipeline = useMemo(
    () => allOpps.filter(o => [2, 3, 4, 5].includes(o.statusCode)),
    [allOpps]
  );

  const blMixYTD   = useMemo(() => computeBLMix(wonYTD),       [wonYTD]);
  const blMixMonth = useMemo(() => computeBLMix(wonThisMonth), [wonThisMonth]);

  const geoYTD = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    wonYTD.forEach(o => {
      const c = o.country || 'N/A';
      const e = map.get(c) || { count: 0, amount: 0 };
      map.set(c, { count: e.count + 1, amount: e.amount + o.amount });
    });
    return [...map.entries()]
      .map(([country, d]) => ({ country, ...d }))
      .sort((a, b) => b.amount - a.amount);
  }, [wonYTD]);

  const topRegionYTD = geoYTD[0] ?? null;
  const top10YTD     = useMemo(() => [...wonYTD].sort((a, b) => b.amount - a.amount).slice(0, 10), [wonYTD]);
  const stageData    = useMemo(() => computeStages(openPipeline), [openPipeline]);
  const totalOpenAmt = useMemo(() => openPipeline.reduce((s, o) => s + o.amount, 0), [openPipeline]);
  const totalOpenWgt = useMemo(() => openPipeline.reduce((s, o) => s + o.weightedPipeline, 0), [openPipeline]);
  const top10Open    = useMemo(() => [...openPipeline].sort((a, b) => b.amount - a.amount).slice(0, 10), [openPipeline]);

  const prevMonthLabel = `${MONTH_SHORT[selectedMonth - 1]} ${selectedYear - 1}`;
  const monthLabel     = `${MONTH_LONG[selectedMonth - 1]} ${selectedYear}`;
  const qLabel         = `Q${selectedQ} ${selectedYear}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-16">
      {/* Print styles — layout visibility handled by Tailwind print: utilities on AppShell/Sidebar/Topbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-section { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      ` }} />

      <PageHeader
        title="Reports"
        subtitle={`Executive Report · ${monthLabel}`}
        badge="Report"
        badgeColor="blue"
        actions={
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 px-4 py-2 rounded-xl transition-colors"
          >
            <Printer size={15} />
            Export PDF
          </button>
        }
      />

      {/* Year + Month selectors — hidden when printing */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</span>
            <div className="flex gap-1.5 flex-wrap">
              {availableYears.map(y => (
                <button key={y} onClick={() => setSelectedYear(y)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    selectedYear === y ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  )}
                >{y}</button>
              ))}
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</span>
            <div className="flex flex-wrap gap-1">
              {MONTH_SHORT.map((name, i) => {
                const m = i + 1;
                return (
                  <button key={m} onClick={() => setSelectedMonth(m)}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      selectedMonth === m ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    )}
                  >{name}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 1 · GENERAL KPIs ══ */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
          General KPIs
        </p>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Active Accepted Pipeline"
              value={formatCurrency(activeBacklog.reduce((s, o) => s + o.amount, 0))}
              sub={`${activeBacklog.length} projects in Won/Delivering`}
              color="amber"
            />
            <StatTile
              label={`Total Won YTD ${selectedYear}`}
              value={formatCurrency(wonYTD.reduce((s, o) => s + o.amount, 0))}
              sub={`${wonYTD.length} projects won`}
              color="emerald"
            />
            <StatTile
              label={`Wins ${MONTH_SHORT[selectedMonth - 1]} ${selectedYear} — Count`}
              value={String(wonThisMonth.length)}
              sub="deals closed this month"
              comparison={{ curr: wonThisMonth.length, prev: wonPrevYearMonth.length, prevLabel: prevMonthLabel }}
              color="blue"
            />
            <StatTile
              label={`Wins ${MONTH_SHORT[selectedMonth - 1]} ${selectedYear} — Value`}
              value={formatCurrency(wonThisMonth.reduce((s, o) => s + o.amount, 0))}
              sub={`${prevMonthLabel}: ${formatCurrency(wonPrevYearMonth.reduce((s, o) => s + o.amount, 0))}`}
              comparison={{
                curr: wonThisMonth.reduce((s, o) => s + o.amount, 0),
                prev: wonPrevYearMonth.reduce((s, o) => s + o.amount, 0),
                prevLabel: prevMonthLabel,
              }}
              color="violet"
            />
          </div>
        )}
      </div>

      {/* ══ SECTION 2 · YEAR OVERVIEW ══ */}
      <div className="print-section">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
          Year {selectedYear} Overview
        </p>

        {/* All won deals table */}
        <Card className="mb-4">
          <CardHeader
            title={`Deals Won in ${selectedYear}`}
            subtitle={`${wonYTD.length} projects · ${formatCurrency(wonYTD.reduce((s, o) => s + o.amount, 0))} total value`}
            icon={Trophy}
          />
          {loading ? (
            <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : wonYTD.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No projects won in {selectedYear}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4">#</th>
                    <th className="text-left py-2.5 px-4">Project</th>
                    <th className="text-left py-2.5 px-4">Client</th>
                    <th className="text-left py-2.5 px-4">Country</th>
                    <th className="text-left py-2.5 px-4">Status</th>
                    <th className="text-right py-2.5 px-4">Amount</th>
                    <th className="text-right py-2.5 px-4">Accepted</th>
                    <th className="text-left py-2.5 px-4">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {[...wonYTD].sort((a, b) => b.amount - a.amount).map((o, i) => (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-4 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-4">
                        <a href={`/projects/${o.id}`} className="font-semibold text-slate-800 hover:text-amber-600 transition-colors">
                          {truncate(o.opportunity, 40)}
                        </a>
                        <p className="text-[10px] text-slate-400 font-mono">{o.id}</p>
                      </td>
                      <td className="py-2 px-4 text-slate-600">{truncate(o.client, 25)}</td>
                      <td className="py-2 px-4 text-slate-500">{o.country}</td>
                      <td className="py-2 px-4"><StatusBadge statusCode={o.statusCode as StatusCode} size="sm" /></td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">{formatCurrency(o.amount)}</td>
                      <td className="py-2 px-4 text-right text-slate-500">{o.acceptanceDate ? formatDate(o.acceptanceDate) : '—'}</td>
                      <td className="py-2 px-4"><CompanyBadge company={o.company} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td colSpan={5} className="py-2.5 px-4 text-slate-700">Total</td>
                    <td className="py-2.5 px-4 text-right text-slate-900">{formatCurrency(wonYTD.reduce((s, o) => s + o.amount, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* BL Mix + Top Region */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card className="lg:col-span-2">
            <CardHeader title="Business Line Mix" subtitle={`Won projects in ${selectedYear} by business line`} icon={BarChart2} />
            <div className="p-5"><BLDonut data={blMixYTD} /></div>
          </Card>

          <Card>
            <CardHeader title="Top Region" subtitle={`By won value in ${selectedYear}`} icon={Globe} />
            <div className="p-5 space-y-3">
              {geoYTD.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No data</p>
              ) : (
                <>
                  {topRegionYTD && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{topRegionYTD.country}</p>
                      <p className="text-sm font-semibold text-amber-600 mt-1">{formatCurrency(topRegionYTD.amount)}</p>
                      <p className="text-xs text-amber-500">{topRegionYTD.count} project{topRegionYTD.count !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {geoYTD.slice(0, 6).map((item, i) => {
                      const max = geoYTD[0]?.amount || 1;
                      return (
                        <div key={item.country}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium text-slate-700">{item.country}</span>
                            <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(item.amount / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Geographical Performance full table */}
        <Card className="mb-4">
          <CardHeader title="Geographical Performance" subtitle={`Won projects by country in ${selectedYear}`} icon={Globe} />
          {geoYTD.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No data</p>
          ) : (
            <div className="p-5 space-y-2">
              {geoYTD.map((item, i) => {
                const max      = geoYTD[0]?.amount || 1;
                const totalAmt = wonYTD.reduce((s, o) => s + o.amount, 0);
                return (
                  <div key={item.country} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-semibold text-slate-700">{item.country}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(item.amount / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{item.count} deal{item.count !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      {totalAmt > 0 ? ((item.amount / totalAmt) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top 10 projects YTD */}
        <Card>
          <CardHeader title={`Top 10 Won Projects ${selectedYear}`} subtitle="By contract value" icon={Trophy} />
          {top10YTD.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No projects</p>
          ) : (
            <div>{top10YTD.map((opp, i) => <OppRow key={opp.id} opp={opp} rank={i + 1} />)}</div>
          )}
        </Card>
      </div>

      {/* ══ SECTION 3 · MONTHLY FOCUS ══ */}
      <div className="print-section">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
          Monthly Focus · {monthLabel}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <StatTile
              label="New Pipeline (count)"
              value={String(newPipelineThisMonth.length)}
              sub="opportunities opened"
              color="slate"
            />
            <StatTile
              label="New Pipeline (value)"
              value={formatCurrency(newPipelineThisMonth.reduce((s, o) => s + o.amount, 0))}
              sub="value of new opportunities"
              color="slate"
            />
            <StatTile
              label="Projects Won"
              value={String(wonThisMonth.length)}
              sub="deals closed this month"
              comparison={{ curr: wonThisMonth.length, prev: wonPrevYearMonth.length, prevLabel: prevMonthLabel }}
              color="emerald"
            />
            <StatTile
              label="Won Value"
              value={formatCurrency(wonThisMonth.reduce((s, o) => s + o.amount, 0))}
              sub="total won amount"
              comparison={{
                curr: wonThisMonth.reduce((s, o) => s + o.amount, 0),
                prev: wonPrevYearMonth.reduce((s, o) => s + o.amount, 0),
                prevLabel: prevMonthLabel,
              }}
              color="emerald"
            />
            <StatTile
              label={`${qLabel} Total`}
              value={formatCurrency(wonThisQ.reduce((s, o) => s + o.amount, 0))}
              sub={`${wonThisQ.length} deals · ${qLabel}`}
              color="amber"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              title={`Projects Won in ${monthLabel}`}
              subtitle={`${wonThisMonth.length} deals · ${formatCurrency(wonThisMonth.reduce((s, o) => s + o.amount, 0))}`}
              icon={CheckCircle}
            />
            {wonThisMonth.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No projects won in {monthLabel}</p>
            ) : (
              <div>{wonThisMonth.map(opp => <OppRow key={opp.id} opp={opp} />)}</div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Business Line Mix — This Month"
              subtitle={`Business line breakdown · ${monthLabel}`}
              icon={BarChart2}
            />
            <div className="p-5">
              <BLDonut data={blMixMonth} />
              {blMixMonth.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-1">
                  {blMixMonth.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ══ SECTION 4 · OPEN PIPELINE ══ */}
      <div className="print-section">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
          Open Pipeline
        </p>

        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <StatTile
              label="Total Pipeline"
              value={formatCurrency(totalOpenAmt)}
              sub={`${openPipeline.length} opportunities in stages 2–5`}
              color="blue"
            />
            <StatTile
              label="Weighted Pipeline"
              value={formatCurrency(totalOpenWgt)}
              sub="adjusted by probability"
              color="violet"
            />
            <StatTile
              label="# Opportunities"
              value={String(openPipeline.length)}
              sub="in active process"
              color="slate"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Pipeline by Stage" subtitle="Value, weighted value and % per stage" icon={Target} />
            <div className="p-4 overflow-x-auto">
              <StageTable stages={stageData} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Top Open Opportunities"
              subtitle={`Largest opportunities in pipeline · ${openPipeline.length} total`}
              icon={TrendingUp}
            />
            {top10Open.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No opportunities</p>
            ) : (
              <div>
                {top10Open.map((opp, i) => (
                  <a
                    key={opp.id}
                    href={`/projects/${opp.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-slate-300 w-4 text-center shrink-0">{i + 1}</span>
                    <StatusBadge statusCode={opp.statusCode as StatusCode} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{truncate(opp.opportunity, 40)}</p>
                      <p className="text-xs text-slate-400">{opp.client} · {opp.country}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(opp.amount)}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(opp.weightedPipeline)} weighted</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ══ SECTION 5 · REGIONAL FOCUS ══ */}
      <div className="print-section">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
          Regional Focus
        </p>
        <div className="space-y-4">
          {REGIONS.map(region => (
            <RegionBlock
              key={region.key}
              label={region.label}
              wonMonth={regionFilter(region, wonThisMonth)}
              wonYTD={regionFilter(region, wonYTD)}
              openOpps={regionFilter(region, openPipeline)}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
