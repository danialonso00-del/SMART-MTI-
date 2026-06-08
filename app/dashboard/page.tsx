'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, DollarSign, CheckCircle, Receipt,
  Activity, Archive, Target, XCircle, ArrowRight,
  Cpu, Sparkles, Building2, Wrench, CalendarDays, UserCheck,
  Trophy, ChevronDown, Clock, Users, Globe, AlertCircle,
} from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import CompanyBadge from '@/components/ui/CompanyBadge';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency, formatCurrencyCompact, formatDate, truncate, cn } from '@/lib/utils';
import { StatusCode } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpisResponse {
  totals: {
    totalPipeline: number;
    weightedPipeline: number;
    totalAccepted: number;
    totalInvoiced: number;
    avgMargin: number;
    openOpportunities: number;
    delivering: number;
    finished: number;
    lost: number;
  };
  byStatus: { statusCode: number; count: number; amount: number }[];
  byCompany: { company: string; amount: number; count: number }[];
  businessLines: {
    hardware: number; ia: number; bim: number;
    ttioOm: number; events: number; proservices: number;
  };
  topClients: { name: string; amount: number }[];
}

interface Opportunity {
  id: string; opportunity: string; client: string;
  owner: string; company: string; statusCode: number;
  amount: number; date: string; probability: number;
  weightedPipeline: number; totalInvoiced: number;
  blHardware: number; blIa: number; blBim: number;
  blTtioOm: number; blEvents: number; blProservices: number;
  country: string; expectedClosingDate: string | null;
  acceptanceDate: string | null; costs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ec4899'];

const STATUS_LABELS: Record<number, string> = {
  2: 'Oport.', 3: 'Req.G', 4: 'Sol.D', 5: 'Neg.',
  6: 'Won', 7: 'Deliv.', 8: 'Final.', 9: 'Perdido',
};

const BL_KEYS = ['hardware', 'ia', 'bim', 'ttioOm', 'events', 'proservices'] as const;
type BLKey = typeof BL_KEYS[number];

const BL_CONFIG: Record<BLKey, { label: string; icon: React.ElementType; activeColor: string; fill: string }> = {
  hardware:    { label: 'Hardware',     icon: Cpu,          activeColor: 'bg-amber-500 text-white border-amber-500',     fill: '#f59e0b' },
  ia:          { label: 'IA',           icon: Sparkles,     activeColor: 'bg-blue-500 text-white border-blue-500',       fill: '#3b82f6' },
  bim:         { label: 'BIM',          icon: Building2,    activeColor: 'bg-violet-500 text-white border-violet-500',   fill: '#8b5cf6' },
  ttioOm:      { label: 'TTIO/O&M',    icon: Wrench,       activeColor: 'bg-emerald-500 text-white border-emerald-500', fill: '#10b981' },
  events:      { label: 'Eventos',      icon: CalendarDays, activeColor: 'bg-orange-500 text-white border-orange-500',   fill: '#f97316' },
  proservices: { label: 'Pro Services', icon: UserCheck,    activeColor: 'bg-teal-500 text-white border-teal-500',       fill: '#06b6d4' },
};

const COMPANY_COLORS: Record<string, string> = {
  MTI: 'bg-amber-500 text-white border-amber-500',
  MTi: 'bg-amber-400 text-white border-amber-400',
  'MTI ARABIA': 'bg-orange-500 text-white border-orange-500',
  BCN: 'bg-blue-500 text-white border-blue-500',
  DIPRO: 'bg-purple-500 text-white border-purple-500',
  INGECO: 'bg-green-600 text-white border-green-600',
  'MARINA EYE-CAM': 'bg-cyan-600 text-white border-cyan-600',
};

const Q_LABELS = ['Q1 (Ene–Mar)', 'Q2 (Abr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dic)'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOppBLValue(opp: Opportunity, bl: BLKey): number {
  const map: Record<BLKey, keyof Opportunity> = {
    hardware: 'blHardware', ia: 'blIa', bim: 'blBim',
    ttioOm: 'blTtioOm', events: 'blEvents', proservices: 'blProservices',
  };
  return (opp[map[bl]] as number) ?? 0;
}

// For won/delivering/finished, use acceptanceDate if available (when they were actually won);
// otherwise fall back to creation date.
function oppEffectiveDate(opp: Opportunity): string {
  if ([6, 7, 8].includes(opp.statusCode) && opp.acceptanceDate) return opp.acceptanceDate;
  return opp.date;
}

function oppYear(opp: Opportunity): number {
  return new Date(oppEffectiveDate(opp)).getFullYear();
}

function oppQuarter(opp: Opportunity): number {
  return Math.floor(new Date(oppEffectiveDate(opp)).getMonth() / 3) + 1;
}

function computeTotalsFromOpps(opps: Opportunity[]) {
  const presales  = opps.filter(o => [2, 3, 4, 5].includes(o.statusCode));
  const accepted  = opps.filter(o => [6, 7, 8].includes(o.statusCode));
  const delivering = opps.filter(o => o.statusCode === 7);
  const finished  = opps.filter(o => o.statusCode === 8);
  const lost      = opps.filter(o => o.statusCode === 9);
  return {
    totalPipeline:     opps.filter(o => o.statusCode !== 9).reduce((s, o) => s + o.amount, 0),
    weightedPipeline:  opps.filter(o => o.statusCode !== 9).reduce((s, o) => s + o.weightedPipeline, 0),
    totalAccepted:     accepted.reduce((s, o) => s + o.amount, 0),
    totalInvoiced:     accepted.reduce((s, o) => s + o.totalInvoiced, 0),
    openOpportunities: presales.length,
    delivering:        delivering.length,
    finished:          finished.length,
    lost:              lost.length,
  };
}

function computeByStatus(opps: Opportunity[]) {
  return [2, 3, 4, 5, 6, 7, 8, 9]
    .map(code => ({
      statusCode: code,
      status: STATUS_LABELS[code] || String(code),
      count:  opps.filter(o => o.statusCode === code).length,
      amount: opps.filter(o => o.statusCode === code).reduce((s, o) => s + o.amount, 0),
    }))
    .filter(d => d.statusCode !== 9);
}

function computeByCompany(opps: Opportunity[]) {
  return Array.from(new Set(opps.map(o => o.company)))
    .map(c => ({
      name:   c,
      amount: opps.filter(o => o.company === c).reduce((s, o) => s + o.amount, 0),
      count:  opps.filter(o => o.company === c).length,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function computeBusinessLines(opps: Opportunity[]) {
  return BL_KEYS.map(key => ({
    name:  BL_CONFIG[key].label,
    value: opps.reduce((s, o) => s + getOppBLValue(o, key), 0),
    fill:  BL_CONFIG[key].fill,
  })).filter(d => d.value > 0);
}

function computeTopClients(opps: Opportunity[], limit = 5) {
  return Array.from(new Set(opps.map(o => o.client)))
    .map(name => ({
      name,
      totalAmount: opps.filter(o => o.client === name).reduce((s, o) => s + o.amount, 0),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}:{' '}
            {typeof entry.value === 'number' && entry.value > 1000
              ? formatCurrencyCompact(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-32 bg-slate-200 rounded mb-2" />
      <div className="h-2 w-20 bg-slate-100 rounded" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [kpisData, setKpisData]         = useState<KpisResponse | null>(null);
  const [allOpps, setAllOpps]           = useState<Opportunity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeBL, setActiveBL]         = useState<BLKey | 'all'>('all');
  const [activeCompany, setActiveCompany] = useState<string>('all');
  const [year, setYear]                 = useState<number | 'all'>('all');
  const [quarter, setQuarter]           = useState<number | 'all'>('all');
  const [month, setMonth]               = useState<number | 'all'>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/kpis').then(r => r.json()),
      fetch('/api/opportunities?lite=true').then(r => r.json()),
    ])
      .then(([kpis, opps]) => {
        setKpisData(kpis);
        setAllOpps(Array.isArray(opps) ? opps : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived filters ──────────────────────────────────────────────────────────

  const availableYears = useMemo(
    () => Array.from(new Set(allOpps.map(o => oppYear(o)))).sort((a, b) => b - a),
    [allOpps]
  );

  const filteredOpps = useMemo(() => {
    let data = allOpps;
    if (activeBL !== 'all')      data = data.filter(o => getOppBLValue(o, activeBL) > 0);
    if (activeCompany !== 'all') data = data.filter(o => o.company === activeCompany);
    if (year !== 'all')          data = data.filter(o => oppYear(o) === year);
    if (quarter !== 'all')       data = data.filter(o => oppQuarter(o) === quarter);
    if (month !== 'all')         data = data.filter(o => new Date(oppEffectiveDate(o)).getMonth() + 1 === month);
    return data;
  }, [allOpps, activeBL, activeCompany, year, quarter, month]);

  const isFiltered = activeBL !== 'all' || activeCompany !== 'all' || year !== 'all' || quarter !== 'all' || month !== 'all';

  // ── KPI Computations ─────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    if (!isFiltered && kpisData) return kpisData.totals;
    return computeTotalsFromOpps(filteredOpps);
  }, [isFiltered, kpisData, filteredOpps]);

  const pipelineByStatus = useMemo(() => {
    if (!isFiltered && kpisData) {
      return kpisData.byStatus
        .filter(d => d.statusCode !== 9)
        .map(d => ({ ...d, status: STATUS_LABELS[d.statusCode] || String(d.statusCode) }));
    }
    return computeByStatus(filteredOpps);
  }, [isFiltered, kpisData, filteredOpps]);

  const businessLines = useMemo(() => {
    if (!isFiltered && kpisData) {
      return BL_KEYS.map(key => ({
        name: BL_CONFIG[key].label,
        value: kpisData.businessLines[key],
        fill: BL_CONFIG[key].fill,
      })).filter(d => d.value > 0);
    }
    return computeBusinessLines(filteredOpps);
  }, [isFiltered, kpisData, filteredOpps]);

  const byCompany = useMemo(() => {
    if (!isFiltered && kpisData) {
      return kpisData.byCompany.map(d => ({ name: d.company, amount: d.amount, count: d.count }));
    }
    return computeByCompany(filteredOpps);
  }, [isFiltered, kpisData, filteredOpps]);

  const topClients = useMemo(() => {
    if (!isFiltered && kpisData) {
      return kpisData.topClients.slice(0, 5).map(c => ({ ...c, totalAmount: c.amount }));
    }
    return computeTopClients(filteredOpps, 5);
  }, [isFiltered, kpisData, filteredOpps]);

  const recentActivity = useMemo(
    () => [...filteredOpps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [filteredOpps]
  );

  const uniqueCompanies = useMemo(
    () => Array.from(new Set(allOpps.map(o => o.company))).sort(),
    [allOpps]
  );

  // Top owners by pipeline value
  const topOwners = useMemo(() => {
    return Array.from(new Set(filteredOpps.map(o => o.owner).filter(Boolean)))
      .map(owner => ({
        owner,
        amount: filteredOpps.filter(o => o.owner === owner && o.statusCode !== 9).reduce((s, o) => s + o.amount, 0),
        count:  filteredOpps.filter(o => o.owner === owner && o.statusCode !== 9).length,
      }))
      .filter(o => o.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);
  }, [filteredOpps]);

  // Upcoming closings in next 60 days (open opportunities)
  const upcomingClosings = useMemo(() => {
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const in60days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    return filteredOpps
      .filter(o => {
        if (!o.expectedClosingDate) return false;
        const d = new Date(o.expectedClosingDate);
        return d >= today && d <= in60days && o.statusCode >= 2 && o.statusCode <= 5;
      })
      .sort((a, b) => new Date(a.expectedClosingDate!).getTime() - new Date(b.expectedClosingDate!).getTime())
      .slice(0, 8);
  }, [filteredOpps]);

  // Overdue — expected closing already passed but still open
  const overdueOpps = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return filteredOpps
      .filter(o => {
        if (!o.expectedClosingDate) return false;
        return new Date(o.expectedClosingDate) < today && o.statusCode >= 2 && o.statusCode <= 5;
      })
      .sort((a, b) => new Date(a.expectedClosingDate!).getTime() - new Date(b.expectedClosingDate!).getTime())
      .slice(0, 5);
  }, [filteredOpps]);

  // Country distribution
  const byCountry = useMemo(() => {
    return Array.from(new Set(filteredOpps.filter(o => o.statusCode !== 9).map(o => o.country).filter(Boolean)))
      .map(country => ({
        country,
        amount: filteredOpps.filter(o => o.country === country && o.statusCode !== 9).reduce((s, o) => s + o.amount, 0),
        count:  filteredOpps.filter(o => o.country === country && o.statusCode !== 9).length,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredOpps]);

  // Win rate
  const winRate = useMemo(() => {
    const resolved = filteredOpps.filter(o => [6, 7, 8, 9].includes(o.statusCode));
    const won      = resolved.filter(o => [6, 7, 8].includes(o.statusCode));
    return resolved.length > 0 ? (won.length / resolved.length) * 100 : 0;
  }, [filteredOpps]);

  // Quarterly trend — always shows all 4 quarters for the selected/current year
  const quarterlyTrend = useMemo(() => {
    const targetYear = year !== 'all' ? year : (availableYears[0] ?? new Date().getFullYear());
    let base = allOpps.filter(o => oppYear(o) === targetYear);
    if (activeBL !== 'all')      base = base.filter(o => getOppBLValue(o, activeBL) > 0);
    if (activeCompany !== 'all') base = base.filter(o => o.company === activeCompany);

    return [1, 2, 3, 4].map(q => {
      const qOpps = base.filter(o => oppQuarter(o) === q);
      const won   = qOpps.filter(o => [6, 7, 8].includes(o.statusCode));
      return {
        quarter:   `Q${q}`,
        Pipeline:  Math.round(qOpps.reduce((s, o) => s + o.amount, 0)),
        Aceptado:  Math.round(won.reduce((s, o) => s + o.amount, 0)),
        Facturado: Math.round(won.reduce((s, o) => s + o.totalInvoiced, 0)),
        isActive:  quarter === q,
      };
    });
  }, [allOpps, year, quarter, activeBL, activeCompany, availableYears]);

  // Monthly activity — last 12 months (independent of filters)
  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months: Record<string, { label: string; creadas: number; ganadas: number; facturado: number; creadasCount: number; ganadasCount: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = {
        label: d.toLocaleString('es', { month: 'short', year: '2-digit' }),
        creadas: 0, ganadas: 0, facturado: 0, creadasCount: 0, ganadasCount: 0,
      };
    }
    for (const o of allOpps) {
      // Created
      const createdKey = o.date ? `${new Date(o.date).getFullYear()}-${String(new Date(o.date).getMonth() + 1).padStart(2, '0')}` : null;
      if (createdKey && months[createdKey]) {
        months[createdKey].creadas += o.amount;
        months[createdKey].creadasCount++;
      }
      // Won/accepted
      if ([6, 7, 8].includes(o.statusCode) && o.acceptanceDate) {
        const wonKey = `${new Date(o.acceptanceDate).getFullYear()}-${String(new Date(o.acceptanceDate).getMonth() + 1).padStart(2, '0')}`;
        if (months[wonKey]) {
          months[wonKey].ganadas += o.amount;
          months[wonKey].ganadasCount++;
          months[wonKey].facturado += o.totalInvoiced;
        }
      }
    }
    return Object.values(months);
  }, [allOpps]);

  // Period subtitle
  const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const periodLabel = useMemo(() => {
    const y = year !== 'all' ? String(year) : null;
    const q = quarter !== 'all' ? `Q${quarter}` : null;
    const m = month !== 'all' ? MONTH_NAMES[(month as number) - 1] : null;
    if (y && m) return `${m} ${y}`;
    if (y && q) return `${q} ${y}`;
    if (y)      return y;
    if (m)      return `${m} · todos los años`;
    if (q)      return `${q} · todos los años`;
    return String(availableYears[0] ?? new Date().getFullYear());
  }, [year, quarter, month, availableYears]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Resumen ejecutivo MTI Group · ${periodLabel}`}
        badge="Live"
        badgeColor="emerald"
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/geo"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-amber-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Dashboard Geográfico <ArrowRight size={12} />
            </a>
          </div>
        }
      />

      {/* ── Period Filter ── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Año</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setYear('all'); setQuarter('all'); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  year === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                Todos
              </button>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => { setYear(y); setQuarter('all'); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    year === y
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200" />

          {/* Quarter selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Trimestre</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setQuarter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  quarter === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                Todo
              </button>
              {[1, 2, 3, 4].map(q => (
                <button
                  key={q}
                  onClick={() => { setQuarter(quarter === q ? 'all' : q); setMonth('all'); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    quarter === q
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  )}
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200" />

          {/* Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mes</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMonth('all')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  month === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                Todos
              </button>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                return (
                  <button
                    key={m}
                    onClick={() => { setMonth(month === m ? 'all' : m); setQuarter('all'); }}
                    className={cn(
                      'px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      month === m
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Business Line Filter Pills ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveBL('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            activeBL === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          Todo
        </button>
        {BL_KEYS.map(key => {
          const cfg = BL_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveBL(activeBL === key ? 'all' : key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                activeBL === key ? cfg.activeColor : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              <Icon size={12} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Company Filter Pills ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCompany('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            activeCompany === 'all'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          Todas
        </button>
        {uniqueCompanies.map(comp => (
          <button
            key={comp}
            onClick={() => setActiveCompany(activeCompany === comp ? 'all' : comp)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              activeCompany === comp
                ? (COMPANY_COLORS[comp] ?? 'bg-slate-700 text-white border-slate-700')
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {comp}
          </button>
        ))}
      </div>

      {/* ── KPI Row 1 ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Pipeline"    value={formatCurrencyCompact(totals.totalPipeline)}    tooltip={formatCurrency(totals.totalPipeline)}    subtitle="Excluyendo perdidos"         icon={<TrendingUp size={22} />} color="amber" />
          <KpiCard label="Pipeline Ponderado" value={formatCurrencyCompact(totals.weightedPipeline)} tooltip={formatCurrency(totals.weightedPipeline)} subtitle="Ajustado por probabilidad"   icon={<Target size={22} />}    color="blue" />
          <KpiCard label="Total Aceptado"    value={formatCurrencyCompact(totals.totalAccepted)}    tooltip={formatCurrency(totals.totalAccepted)}    subtitle="Status 6, 7 y 8"             icon={<CheckCircle size={22} />} color="emerald" />
          <KpiCard label="Total Facturado"   value={formatCurrencyCompact(totals.totalInvoiced)}    tooltip={formatCurrency(totals.totalInvoiced)}    subtitle="Ingresos realizados"         icon={<Receipt size={22} />}   color="violet" />
          <KpiCard label="Tasa de Éxito"     value={`${winRate.toFixed(1)}%`}                       subtitle="Oports. ganadas vs resueltas" icon={<Trophy size={22} />}    color="teal" />
        </div>
      )}

      {/* ── KPI Row 2 ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="En Delivery"           value={String(totals.delivering)}        subtitle="Proyectos activos"      icon={<Activity size={22} />}   color="teal"  size="sm" />
          <KpiCard label="Finalizados"            value={String(totals.finished)}          subtitle="Proyectos completados"  icon={<Archive size={22} />}    color="slate" size="sm" />
          <KpiCard label="Oportunidades Abiertas" value={String(totals.openOpportunities)} subtitle="Status 2, 3, 4, 5"     icon={<DollarSign size={22} />} color="amber" size="sm" />
          <KpiCard label="Perdidas"               value={String(totals.lost)}              subtitle="Oportunidades perdidas" icon={<XCircle size={22} />}    color="rose"  size="sm" />
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline por Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Pipeline por Estado</h3>
            <p className="text-xs text-slate-400 mt-0.5">Importe total por fase</p>
          </div>
          <div className="h-52">
            {loading ? (
              <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStatus} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Importe" radius={[4, 4, 0, 0]}>
                    {pipelineByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Business Line Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Distribución por Línea de Negocio</h3>
            <p className="text-xs text-slate-400 mt-0.5">Pipeline activo por área</p>
          </div>
          {loading ? (
            <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={businessLines} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value">
                      {businessLines.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrencyCompact(v), 'Importe']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {businessLines.map((item, i) => {
                  const total = businessLines.reduce((s, d) => s + d.value, 0);
                  const pct   = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.fill }} />
                      <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-slate-700">{pct}%</span>
                    </div>
                  );
                })}
                {businessLines.length === 0 && <p className="text-xs text-slate-400">Sin datos para el filtro seleccionado</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline by Company */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Pipeline por Empresa</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribución por sociedad</p>
          </div>
          <div className="h-52">
            {loading ? (
              <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={byCompany} margin={{ top: 4, right: 8, left: 60, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Importe" radius={[0, 4, 4, 0]}>
                    {byCompany.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top 5 Clientes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Por importe total</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, i) => {
                const max = topClients[0]?.totalAmount || 1;
                const pct = (client.totalAmount / max) * 100;
                return (
                  <div key={client.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate flex-1">{client.name}</span>
                      <span className="text-xs font-bold text-slate-900 ml-2">{formatCurrencyCompact(client.totalAmount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {topClients.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── New Row: Top Owners + Country Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Responsables */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Responsables</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pipeline activo por owner</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {topOwners.map((item, i) => {
                const max = topOwners[0]?.amount || 1;
                const pct = (item.amount / max) * 100;
                return (
                  <div key={item.owner}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate flex-1">{item.owner}</span>
                      <span className="text-xs text-slate-400 mx-2">{item.count} ops.</span>
                      <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {topOwners.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
            </div>
          )}
        </div>

        {/* Country Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-blue-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribución por País</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pipeline activo por mercado</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {byCountry.map((item, i) => {
                const max = byCountry[0]?.amount || 1;
                const pct = (item.amount / max) * 100;
                return (
                  <div key={item.country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate flex-1">{item.country}</span>
                      <span className="text-xs text-slate-400 mx-2">{item.count}</span>
                      <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {byCountry.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── New Row: Upcoming Closings + Overdue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos Cierres */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Clock size={15} className="text-amber-500" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Próximos Cierres</h3>
              <p className="text-xs text-slate-400">Oportunidades con cierre en los próximos 60 días</p>
            </div>
            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-full">
              {upcomingClosings.length}
            </span>
          </div>
          {loading ? (
            <div className="divide-y divide-slate-50">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-50 animate-pulse m-2 rounded" />)}</div>
          ) : upcomingClosings.length === 0 ? (
            <p className="px-5 py-6 text-xs text-slate-400 text-center">No hay cierres previstos en los próximos 60 días</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingClosings.map(opp => {
                const daysLeft = Math.ceil((new Date(opp.expectedClosingDate!).getTime() - Date.now()) / (86400000));
                const urgency  = daysLeft <= 14 ? 'text-red-600 bg-red-50 border-red-200' : daysLeft <= 30 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200';
                return (
                  <a key={opp.id} href={`/opportunities/${opp.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', urgency)}>
                      {daysLeft}d
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{opp.opportunity}</p>
                      <p className="text-xs text-slate-400">{opp.client} · {opp.owner}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900">{formatCurrencyCompact(opp.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDate(opp.expectedClosingDate!)}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Vencidas / Atrasadas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <AlertCircle size={15} className="text-red-500" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Oportunidades Vencidas</h3>
              <p className="text-xs text-slate-400">Fecha de cierre superada, aún abiertas</p>
            </div>
            {overdueOpps.length > 0 && (
              <span className="text-xs bg-red-50 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded-full">
                {overdueOpps.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="divide-y divide-slate-50">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-50 animate-pulse m-2 rounded" />)}</div>
          ) : overdueOpps.length === 0 ? (
            <p className="px-5 py-6 text-xs text-slate-400 text-center">Sin oportunidades vencidas</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {overdueOpps.map(opp => {
                const daysOverdue = Math.floor((Date.now() - new Date(opp.expectedClosingDate!).getTime()) / 86400000);
                return (
                  <a key={opp.id} href={`/opportunities/${opp.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap text-red-600 bg-red-50 border-red-200">
                      -{daysOverdue}d
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{opp.opportunity}</p>
                      <p className="text-xs text-slate-400">{opp.client} · {opp.owner}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900">{formatCurrencyCompact(opp.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDate(opp.expectedClosingDate!)}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quarterly Trend Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Evolución Trimestral</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pipeline · Aceptado · Facturado por trimestre{' '}
              {year !== 'all' ? `— ${year}` : `— ${availableYears[0] ?? new Date().getFullYear()}`}
            </p>
          </div>
          {/* Quarter legend hint */}
          {quarter !== 'all' && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-medium">
              Filtrando Q{quarter}
            </span>
          )}
        </div>
        <div className="h-64">
          {loading ? (
            <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-600">{v}</span>}
                />
                <Bar dataKey="Pipeline"  fill="#f59e0b" radius={[3, 3, 0, 0]}>
                  {quarterlyTrend.map((d, i) => (
                    <Cell key={i} fill="#f59e0b" fillOpacity={quarter === 'all' || d.isActive ? 1 : 0.35} />
                  ))}
                </Bar>
                <Bar dataKey="Aceptado"  fill="#10b981" radius={[3, 3, 0, 0]}>
                  {quarterlyTrend.map((d, i) => (
                    <Cell key={i} fill="#10b981" fillOpacity={quarter === 'all' || d.isActive ? 1 : 0.35} />
                  ))}
                </Bar>
                <Bar dataKey="Facturado" fill="#8b5cf6" radius={[3, 3, 0, 0]}>
                  {quarterlyTrend.map((d, i) => (
                    <Cell key={i} fill="#8b5cf6" fillOpacity={quarter === 'all' || d.isActive ? 1 : 0.35} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Q labels row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Q_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setQuarter(quarter === (i + 1) ? 'all' : (i + 1))}
              className={cn(
                'text-xs text-center py-1.5 px-2 rounded-lg border transition-all cursor-pointer',
                quarter === (i + 1)
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                  : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Monthly Activity Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Actividad Mensual</h3>
            <p className="text-xs text-slate-400 mt-0.5">Oportunidades creadas vs ganadas vs facturado · últimos 12 meses · independiente de filtros</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Creadas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Ganadas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Facturado</span>
          </div>
        </div>
        <div className="h-56">
          {loading ? (
            <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyActivity} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = monthlyActivity.find(m => m.label === label);
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
                        <p className="font-semibold text-slate-700">{label}</p>
                        {payload.map((e, i) => (
                          <p key={i} style={{ color: e.color }} className="font-medium">
                            {e.name}: {formatCurrencyCompact(Number(e.value))}
                            {e.dataKey === 'creadas' && d ? ` (${d.creadasCount})` : ''}
                            {e.dataKey === 'ganadas' && d ? ` (${d.ganadasCount})` : ''}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="creadas"   name="Creadas"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ganadas"   name="Ganadas"   fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="facturado" name="Facturado" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Actividad Reciente</h3>
            <p className="text-xs text-slate-400 mt-0.5">Últimas oportunidades y proyectos</p>
          </div>
          <a href="/opportunities" className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
            Ver todo <ArrowRight size={12} />
          </a>
        </div>
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2.5 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActivity.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="shrink-0">
                  <StatusBadge statusCode={item.statusCode as StatusCode} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{truncate(item.opportunity, 45)}</p>
                  <p className="text-xs text-slate-400">{item.client} · {item.owner}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrencyCompact(item.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDate(item.date)}</p>
                </div>
                <div className="shrink-0">
                  <CompanyBadge company={item.company} size="sm" />
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="px-5 py-6 text-xs text-slate-400 text-center">Sin actividad para el período seleccionado</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
