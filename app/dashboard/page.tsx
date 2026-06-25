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
  PlusCircle, Percent, Timer, Printer, MapPin,
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

// ISO 3166-1 alpha-2 codes — used with flagcdn.com for reliable cross-platform flags
const COUNTRY_ISO: Record<string, string> = {
  'spain': 'es', 'españa': 'es',
  'saudi arabia': 'sa', 'arabia saudí': 'sa', 'arabia saudi': 'sa', 'ksa': 'sa', 'saudia': 'sa',
  'uae': 'ae', 'united arab emirates': 'ae', 'emiratos': 'ae', 'dubai': 'ae',
  'france': 'fr', 'francia': 'fr',
  'uk': 'gb', 'united kingdom': 'gb', 'great britain': 'gb',
  'morocco': 'ma', 'marruecos': 'ma',
  'usa': 'us', 'united states': 'us', 'estados unidos': 'us',
  'italy': 'it', 'italia': 'it',
  'germany': 'de', 'alemania': 'de',
  'portugal': 'pt',
  'qatar': 'qa',
  'bahrain': 'bh', 'baréin': 'bh',
  'kuwait': 'kw',
  'jordan': 'jo', 'jordania': 'jo',
  'egypt': 'eg', 'egipto': 'eg',
  'tunisia': 'tn', 'túnez': 'tn',
  'algeria': 'dz', 'argelia': 'dz',
  'libya': 'ly', 'libia': 'ly',
  'mexico': 'mx', 'méxico': 'mx',
  'colombia': 'co',
  'brazil': 'br', 'brasil': 'br',
  'chile': 'cl',
  'argentina': 'ar',
  'peru': 'pe', 'perú': 'pe',
  'panama': 'pa', 'panamá': 'pa',
  'dominican republic': 'do', 'república dominicana': 'do',
  'costa rica': 'cr',
  'guatemala': 'gt',
  'netherlands': 'nl', 'países bajos': 'nl',
  'belgium': 'be', 'bélgica': 'be',
  'switzerland': 'ch', 'suiza': 'ch',
  'poland': 'pl', 'polonia': 'pl',
  'romania': 'ro', 'rumanía': 'ro',
  'turkey': 'tr', 'turquía': 'tr',
  'israel': 'il',
  'lebanon': 'lb', 'líbano': 'lb',
  'oman': 'om', 'omán': 'om',
  'angola': 'ao',
  'kenya': 'ke',
  'malaysia': 'my',
  'singapore': 'sg',
  'uzbekistan': 'uz', 'uzbequistan': 'uz',
  'nigeria': 'ng',
  'ghana': 'gh',
  'south africa': 'za', 'sudáfrica': 'za',
  'ethiopia': 'et',
  'tanzania': 'tz',
  'thailand': 'th',
  'indonesia': 'id',
  'vietnam': 'vn',
  'philippines': 'ph', 'filipinas': 'ph',
  'india': 'in',
  'pakistan': 'pk',
  'china': 'cn',
  'japan': 'jp', 'japón': 'jp',
  'south korea': 'kr', 'corea del sur': 'kr',
  'australia': 'au',
  'new zealand': 'nz', 'nueva zelanda': 'nz',
};

function getCountryIso(country: string): string {
  return COUNTRY_ISO[country?.toLowerCase() ?? ''] ?? '';
}

function FlagImg({ country, size = 'md' }: { country: string; size?: 'sm' | 'md' | 'lg' }) {
  const iso = getCountryIso(country);
  const cls = size === 'sm' ? 'w-5 h-3.5' : size === 'lg' ? 'w-12 h-8' : 'w-8 h-5';
  if (!iso) {
    return (
      <span className={`${cls} inline-flex items-center justify-center bg-slate-200 rounded text-xs font-bold text-slate-500`}>
        {country.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={country}
      className={`${cls} object-cover rounded shadow-sm`}
    />
  );
}

const COUNTRY_GRADIENTS = [
  { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', bar: '#f59e0b', text: 'text-amber-700' },
  { bg: 'from-blue-50 to-indigo-50',  border: 'border-blue-200',  bar: '#3b82f6', text: 'text-blue-700'  },
  { bg: 'from-violet-50 to-purple-50',border: 'border-violet-200',bar: '#8b5cf6', text: 'text-violet-700'},
  { bg: 'from-emerald-50 to-green-50',border: 'border-emerald-200',bar: '#10b981',text: 'text-emerald-700'},
  { bg: 'from-orange-50 to-red-50',   border: 'border-orange-200',bar: '#f97316', text: 'text-orange-700' },
  { bg: 'from-teal-50 to-cyan-50',    border: 'border-teal-200',  bar: '#06b6d4', text: 'text-teal-700'  },
  { bg: 'from-pink-50 to-rose-50',    border: 'border-pink-200',  bar: '#ec4899', text: 'text-pink-700'  },
  { bg: 'from-indigo-50 to-blue-50',  border: 'border-indigo-200',bar: '#6366f1', text: 'text-indigo-700'},
];

type Lang = 'es' | 'en';

const T = {
  es: {
    title: 'Dashboard', subtitle: 'Resumen ejecutivo MTI Group',
    geoDashboard: 'Dashboard Geográfico', exportPdf: 'Exportar PDF',
    year: 'Año', all: 'Todos', allF: 'Todas', allN: 'Todo', quarter: 'Trimestre', month: 'Mes',
    currentState: 'Estado actual', periodActivity: 'Actividad del período',
    totalPipeline: 'Total Pipeline', weightedPipeline: 'Pipeline Ponderado',
    totalAccepted: 'Total Aceptado', totalInvoiced: 'Total Facturado', winRate: 'Tasa de Éxito',
    inDelivery: 'En Delivery', finished: 'Finalizados', openOpps: 'Oport. Abiertas', lost: 'Perdidas',
    excLost: 'Excluyendo perdidos', probWeighted: 'Ajustado por probabilidad',
    wonDelivFin: 'Status 6, 7 y 8', realizedRev: 'Ingresos realizados',
    wonVsResolved: 'Ganadas vs resueltas', activeProjects: 'Proyectos activos',
    completedProjects: 'Proyectos completados', openStatus: 'Status 2, 3, 4, 5', lostOpps: 'Oportunidades perdidas',
    newOpps: 'Nuevas Oportunidades', conversionRate: 'Tasa de Conversión', velocity: 'Velocidad de Pipeline',
    pipelineByStatus: 'Pipeline por Estado', pipelineByStatusSub: 'Importe total por fase',
    blDistrib: 'Distribución por Línea de Negocio', blDistribSub: 'Pipeline activo por área',
    pipelineByCompany: 'Pipeline por Empresa', pipelineByCompanySub: 'Distribución por sociedad',
    top5Clients: 'Top 5 Clientes', byAmount: 'Por importe total',
    topOwners: 'Top Responsables', topOwnersSub: 'Pipeline activo por owner',
    countryDistrib: 'Distribución por País', countryDistribSub: 'Pipeline activo por mercado',
    globalPresence: 'Presencia Global', markets: 'mercado', marketsPlural: 'mercados',
    won: 'Ganados', pipeline: 'Pipeline', lostLabel: 'Perdidos', openOppCount: 'op. abiertas',
    quarterlyTrend: 'Evolución Trimestral', quarterlyTrendSub: 'Pipeline · Aceptado · Facturado por trimestre',
    monthlyActivity: 'Actividad Mensual', monthlyActivitySub: 'Últimas 12 meses · independiente de filtros',
    created: 'Creadas', gained: 'Ganadas', invoiced: 'Facturado',
    recentActivity: 'Actividad Reciente', recentActivitySub: 'Últimas oportunidades y proyectos',
    viewAll: 'Ver todo', filteringQ: 'Filtrando Q',
    upcomingClosings: 'Próximos Cierres', upcomingClosingsSub: 'Oportunidades con cierre en los próximos 60 días',
    overdueOpps: 'Oportunidades Vencidas', overdueOppsSub: 'Fecha de cierre superada, aún abiertas',
    noUpcoming: 'No hay cierres previstos en los próximos 60 días',
    noOverdue: 'Sin oportunidades vencidas', noData: 'Sin datos',
    globalNote: 'Datos globales · sin filtro temporal',
    periodNote: 'oportunidades abiertas en el período',
    wonAvg: 'ganadas de', openedIn: 'abiertas en período',
    daysAvg: 'Promedio apertura → aceptación',
    noWonDates: 'Sin proyectos ganados con fechas',
    noPeriodData: 'Sin oportunidades en el período',
    filteringBy: 'Filtrando por',
  },
  en: {
    title: 'Dashboard', subtitle: 'MTI Group Executive Summary',
    geoDashboard: 'Geographic Dashboard', exportPdf: 'Export PDF',
    year: 'Year', all: 'All', allF: 'All', allN: 'All', quarter: 'Quarter', month: 'Month',
    currentState: 'Current State', periodActivity: 'Period Activity',
    totalPipeline: 'Total Pipeline', weightedPipeline: 'Weighted Pipeline',
    totalAccepted: 'Total Accepted', totalInvoiced: 'Total Invoiced', winRate: 'Win Rate',
    inDelivery: 'In Delivery', finished: 'Finished', openOpps: 'Open Opps', lost: 'Lost',
    excLost: 'Excl. lost', probWeighted: 'Probability-weighted',
    wonDelivFin: 'Status 6, 7 & 8', realizedRev: 'Realized revenue',
    wonVsResolved: 'Won vs resolved', activeProjects: 'Active projects',
    completedProjects: 'Completed projects', openStatus: 'Status 2, 3, 4, 5', lostOpps: 'Lost opportunities',
    newOpps: 'New Opportunities', conversionRate: 'Conversion Rate', velocity: 'Pipeline Velocity',
    pipelineByStatus: 'Pipeline by Stage', pipelineByStatusSub: 'Total amount by phase',
    blDistrib: 'Business Line Distribution', blDistribSub: 'Active pipeline by area',
    pipelineByCompany: 'Pipeline by Company', pipelineByCompanySub: 'Distribution by entity',
    top5Clients: 'Top 5 Clients', byAmount: 'By total amount',
    topOwners: 'Top Owners', topOwnersSub: 'Active pipeline by owner',
    countryDistrib: 'Country Distribution', countryDistribSub: 'Active pipeline by market',
    globalPresence: 'Global Presence', markets: 'market', marketsPlural: 'markets',
    won: 'Won', pipeline: 'Pipeline', lostLabel: 'Lost', openOppCount: 'open opps',
    quarterlyTrend: 'Quarterly Trend', quarterlyTrendSub: 'Pipeline · Accepted · Invoiced by quarter',
    monthlyActivity: 'Monthly Activity', monthlyActivitySub: 'Last 12 months · independent of filters',
    created: 'Created', gained: 'Won', invoiced: 'Invoiced',
    recentActivity: 'Recent Activity', recentActivitySub: 'Latest opportunities and projects',
    viewAll: 'View all', filteringQ: 'Filtering Q',
    upcomingClosings: 'Upcoming Closings', upcomingClosingsSub: 'Opportunities closing in the next 60 days',
    overdueOpps: 'Overdue Opportunities', overdueOppsSub: 'Closing date passed, still open',
    noUpcoming: 'No closings expected in the next 60 days',
    noOverdue: 'No overdue opportunities', noData: 'No data',
    globalNote: 'Global data · no time filter',
    periodNote: 'opportunities opened in period',
    wonAvg: 'won from', openedIn: 'opened in period',
    daysAvg: 'Avg. open → accepted',
    noWonDates: 'No won projects with dates',
    noPeriodData: 'No opportunities in period',
    filteringBy: 'Filtering by',
  },
} satisfies Record<Lang, Record<string, string>>;

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
  const [lang, setLang]                 = useState<Lang>('es');
  const L = T[lang];

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
  const isTimeFiltered = year !== 'all' || quarter !== 'all' || month !== 'all';

  // Opps filtered by BL+company only (no time filter) — used for global KPIs and country cards
  const nonTimeFilteredOpps = useMemo(() => {
    let data = allOpps;
    if (activeBL !== 'all')      data = data.filter(o => getOppBLValue(o, activeBL) > 0);
    if (activeCompany !== 'all') data = data.filter(o => o.company === activeCompany);
    return data;
  }, [allOpps, activeBL, activeCompany]);

  // ── KPI Computations ─────────────────────────────────────────────────────────

  // Global totals — always show current state regardless of time filter
  const globalTotals = useMemo(() => {
    if (activeBL === 'all' && activeCompany === 'all' && kpisData) return kpisData.totals;
    return computeTotalsFromOpps(nonTimeFilteredOpps);
  }, [activeBL, activeCompany, kpisData, nonTimeFilteredOpps]);

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

  // Country distribution — uses nonTimeFilteredOpps so global state is always visible
  const byCountry = useMemo(() => {
    return Array.from(new Set(nonTimeFilteredOpps.filter(o => o.country).map(o => o.country)))
      .map(country => {
        const all       = nonTimeFilteredOpps.filter(o => o.country === country);
        const openOpps  = all.filter(o => o.statusCode >= 2 && o.statusCode <= 5);
        const wonOpps   = all.filter(o => [6, 7, 8].includes(o.statusCode));
        const lostOpps  = all.filter(o => o.statusCode === 9);
        // Period-specific (time-filtered) open opps for the "new this period" indicator
        const periodOpps = filteredOpps.filter(o => o.country === country && o.statusCode >= 2 && o.statusCode <= 5);
        const pipelineAmount = openOpps.reduce((s, o) => s + o.amount, 0);
        const wonAmount      = wonOpps.reduce((s, o) => s + o.amount, 0);
        const lostAmount     = lostOpps.reduce((s, o) => s + o.amount, 0);
        return {
          country,
          pipelineAmount,
          wonAmount,
          lostAmount,
          openCount:    openOpps.length,
          periodCount:  periodOpps.length,
          periodAmount: periodOpps.reduce((s, o) => s + o.amount, 0),
          amount:       pipelineAmount + wonAmount,
          count:        all.filter(o => o.statusCode !== 9).length,
        };
      })
      .filter(d => d.amount > 0 || d.lostAmount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);
  }, [nonTimeFilteredOpps, filteredOpps]);

  // Win rate
  const winRate = useMemo(() => {
    const resolved = filteredOpps.filter(o => [6, 7, 8, 9].includes(o.statusCode));
    const won      = resolved.filter(o => [6, 7, 8].includes(o.statusCode));
    return resolved.length > 0 ? (won.length / resolved.length) * 100 : 0;
  }, [filteredOpps]);

  // Actividad del período — usa opp.date (fecha de apertura), no effectiveDate
  // para reflejar cuántas oportunidades se ABRIERON en el período filtrado
  const nuevasEnPeriodo = useMemo(() => {
    let base = allOpps;
    if (activeBL !== 'all')      base = base.filter(o => getOppBLValue(o, activeBL) > 0);
    if (activeCompany !== 'all') base = base.filter(o => o.company === activeCompany);
    if (year !== 'all')          base = base.filter(o => new Date(o.date).getFullYear() === year);
    if (quarter !== 'all')       base = base.filter(o => Math.floor(new Date(o.date).getMonth() / 3) + 1 === quarter);
    if (month !== 'all')         base = base.filter(o => new Date(o.date).getMonth() + 1 === (month as number));
    return base;
  }, [allOpps, activeBL, activeCompany, year, quarter, month]);

  // Tasa de conversión: de las oportunidades abiertas en el período,
  // qué porcentaje han llegado a Won/Delivering/Finished
  const tasaConversion = useMemo(() => {
    if (nuevasEnPeriodo.length === 0) return null;
    const ganadas = nuevasEnPeriodo.filter(o => [6, 7, 8].includes(o.statusCode));
    return (ganadas.length / nuevasEnPeriodo.length) * 100;
  }, [nuevasEnPeriodo]);

  // Velocidad de pipeline: días promedio desde apertura (date) hasta aceptación
  // Solo para oportunidades ganadas con ambas fechas definidas
  const velocidadPipeline = useMemo(() => {
    const wonWithDates = filteredOpps.filter(
      o => [6, 7, 8].includes(o.statusCode) && o.date && o.acceptanceDate
    );
    if (wonWithDates.length === 0) return null;
    const totalDays = wonWithDates.reduce((sum, o) => {
      const days = (new Date(o.acceptanceDate!).getTime() - new Date(o.date).getTime()) / 86400000;
      return sum + Math.max(0, days);
    }, 0);
    return totalDays / wonWithDates.length;
  }, [filteredOpps]);

  // Won in period — deals accepted/won within the filtered time window
  const wonInPeriod = useMemo(() => {
    return filteredOpps.filter(o => [6, 7, 8].includes(o.statusCode));
  }, [filteredOpps]);

  // Lost in period — deals opened in the period that are now lost
  const lostInPeriod = useMemo(() => {
    return nuevasEnPeriodo.filter(o => o.statusCode === 9);
  }, [nuevasEnPeriodo]);

  // Country breakdown for the selected period only (time-filtered)
  const byCountryPeriod = useMemo(() => {
    if (!isTimeFiltered) return [];
    return Array.from(new Set(filteredOpps.filter(o => o.country).map(o => o.country)))
      .map(country => {
        const all       = filteredOpps.filter(o => o.country === country);
        const openOpps  = all.filter(o => o.statusCode >= 2 && o.statusCode <= 5);
        const wonOpps   = all.filter(o => [6, 7, 8].includes(o.statusCode));
        const lostOpps  = all.filter(o => o.statusCode === 9);
        const pipelineAmount = openOpps.reduce((s, o) => s + o.amount, 0);
        const wonAmount      = wonOpps.reduce((s, o) => s + o.amount, 0);
        const lostAmount     = lostOpps.reduce((s, o) => s + o.amount, 0);
        return {
          country,
          pipelineAmount,
          wonAmount,
          lostAmount,
          openCount:  openOpps.length,
          wonCount:   wonOpps.length,
          lostCount:  lostOpps.length,
          amount:     pipelineAmount + wonAmount,
          count:      all.filter(o => o.statusCode !== 9).length,
        };
      })
      .filter(d => d.amount > 0 || d.lostAmount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);
  }, [filteredOpps, isTimeFiltered]);

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

  // Period subtitle — Spanish (for screen) and English (for print)
  const MONTH_NAMES    = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  const periodLabelEn = useMemo(() => {
    const y = year !== 'all' ? String(year) : null;
    const q = quarter !== 'all' ? `Q${quarter}` : null;
    const m = month !== 'all' ? MONTH_NAMES_EN[(month as number) - 1] : null;
    if (y && m) return `${m} ${y}`;
    if (y && q) return `${q} ${y}`;
    if (y)      return y;
    if (m)      return `${m} (all years)`;
    if (q)      return `${q} (all years)`;
    return String(availableYears[0] ?? new Date().getFullYear());
  }, [year, quarter, month, availableYears]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    <style>{`@media print { @page { size: A4 landscape; margin: 0.6cm; } }`}</style>
    <div className="space-y-5 pb-8 print:hidden">
      <PageHeader
        title={L.title}
        subtitle={`${L.subtitle} · ${periodLabel}`}
        badge="Live"
        badgeColor="emerald"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setLang('es')}
                className={cn('px-2.5 py-1.5 transition-colors', lang === 'es' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
              >ES</button>
              <button
                onClick={() => setLang('en')}
                className={cn('px-2.5 py-1.5 transition-colors', lang === 'en' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
              >EN</button>
            </div>
            <a
              href="/geo"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-amber-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              {L.geoDashboard} <ArrowRight size={12} />
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors"
            >
              <Printer size={13} />
              {L.exportPdf}
            </button>
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

      {/* ── KPI Section: Current State (always global, not time-filtered) ── */}
      {!loading && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{L.currentState}</p>
            {isTimeFiltered && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{L.globalNote}</span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <KpiCard label={L.totalPipeline}    value={formatCurrencyCompact(globalTotals.totalPipeline)}    tooltip={formatCurrency(globalTotals.totalPipeline)}    subtitle={L.excLost}         icon={<TrendingUp size={22} />} color="amber" />
            <KpiCard label={L.weightedPipeline} value={formatCurrencyCompact(globalTotals.weightedPipeline)} tooltip={formatCurrency(globalTotals.weightedPipeline)} subtitle={L.probWeighted}   icon={<Target size={22} />}    color="blue" />
            <KpiCard label={L.totalAccepted}    value={formatCurrencyCompact(globalTotals.totalAccepted)}    tooltip={formatCurrency(globalTotals.totalAccepted)}    subtitle={L.wonDelivFin}    icon={<CheckCircle size={22} />} color="emerald" />
            <KpiCard label={L.totalInvoiced}    value={formatCurrencyCompact(globalTotals.totalInvoiced)}    tooltip={formatCurrency(globalTotals.totalInvoiced)}    subtitle={L.realizedRev}    icon={<Receipt size={22} />}   color="violet" />
            <KpiCard label={L.winRate}          value={`${winRate.toFixed(1)}%`}                             subtitle={L.wonVsResolved}   icon={<Trophy size={22} />}    color="teal" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={L.inDelivery}  value={String(globalTotals.delivering)}        subtitle={L.activeProjects}    icon={<Activity size={22} />}   color="teal"  size="sm" />
            <KpiCard label={L.finished}    value={String(globalTotals.finished)}          subtitle={L.completedProjects} icon={<Archive size={22} />}    color="slate" size="sm" />
            <KpiCard label={L.openOpps}    value={String(globalTotals.openOpportunities)} subtitle={L.openStatus}        icon={<DollarSign size={22} />} color="amber" size="sm" />
            <KpiCard label={L.lost}        value={String(globalTotals.lost)}              subtitle={L.lostOpps}          icon={<XCircle size={22} />}    color="rose"  size="sm" />
          </div>
        </div>
      )}
      {loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
        </>
      )}

      {/* ── KPI Section: Period Activity ── */}
      {!loading && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{L.periodActivity}</p>
            {isTimeFiltered && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {periodLabel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KpiCard
              label={L.newOpps}
              value={String(nuevasEnPeriodo.length)}
              tooltip={nuevasEnPeriodo.length > 0 ? formatCurrency(nuevasEnPeriodo.reduce((s, o) => s + o.amount, 0)) : undefined}
              subtitle={nuevasEnPeriodo.length > 0
                ? `${formatCurrencyCompact(nuevasEnPeriodo.reduce((s, o) => s + o.amount, 0))} ${lang === 'es' ? 'valor total' : 'total value'}`
                : L.noPeriodData}
              icon={<PlusCircle size={22} />}
              color="amber"
              size="sm"
            />
            <KpiCard
              label={L.conversionRate}
              value={tasaConversion !== null ? `${tasaConversion.toFixed(1)}%` : '—'}
              subtitle={tasaConversion !== null
                ? `${nuevasEnPeriodo.filter(o => [6, 7, 8].includes(o.statusCode)).length} ${L.wonAvg} ${nuevasEnPeriodo.length} ${L.openedIn}`
                : L.noPeriodData}
              icon={<Percent size={22} />}
              color="emerald"
              size="sm"
            />
            <KpiCard
              label={L.velocity}
              value={velocidadPipeline !== null ? `${Math.round(velocidadPipeline)} ${lang === 'es' ? 'días' : 'days'}` : '—'}
              subtitle={velocidadPipeline !== null
                ? `${L.daysAvg} · ${filteredOpps.filter(o => [6,7,8].includes(o.statusCode) && o.acceptanceDate).length} ${lang === 'es' ? 'proyectos' : 'projects'}`
                : L.noWonDates}
              icon={<Timer size={22} />}
              color="blue"
              size="sm"
            />
          </div>

          {/* Won + Lost in period row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <KpiCard
              label={lang === 'es' ? 'Ganados en Período' : 'Won in Period'}
              value={formatCurrencyCompact(wonInPeriod.reduce((s, o) => s + o.amount, 0))}
              tooltip={formatCurrency(wonInPeriod.reduce((s, o) => s + o.amount, 0))}
              subtitle={`${wonInPeriod.length} ${lang === 'es' ? 'oportunidades ganadas' : 'deals won'}`}
              icon={<CheckCircle size={22} />}
              color="emerald"
              size="sm"
            />
            <KpiCard
              label={lang === 'es' ? 'Revenue Generado' : 'Revenue Generated'}
              value={formatCurrencyCompact(wonInPeriod.reduce((s, o) => s + o.totalInvoiced, 0))}
              tooltip={formatCurrency(wonInPeriod.reduce((s, o) => s + o.totalInvoiced, 0))}
              subtitle={lang === 'es' ? 'Facturado en deals ganados del período' : 'Invoiced from period won deals'}
              icon={<Receipt size={22} />}
              color="violet"
              size="sm"
            />
            <KpiCard
              label={lang === 'es' ? 'Perdidos en Período' : 'Lost in Period'}
              value={lostInPeriod.length > 0 ? formatCurrencyCompact(lostInPeriod.reduce((s, o) => s + o.amount, 0)) : '—'}
              tooltip={lostInPeriod.length > 0 ? formatCurrency(lostInPeriod.reduce((s, o) => s + o.amount, 0)) : undefined}
              subtitle={`${lostInPeriod.length} ${lang === 'es' ? 'oportunidades perdidas' : 'deals lost'}`}
              icon={<XCircle size={22} />}
              color="rose"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* ── Period Presencia Global (only when time filter is active) ── */}
      {!loading && isTimeFiltered && byCountryPeriod.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-6 shadow-xl border border-indigo-900/40">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <MapPin size={16} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'es' ? 'Actividad por País' : 'Country Activity'}{' '}
                <span className="font-normal text-indigo-300">— {periodLabel}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {byCountryPeriod.length} {byCountryPeriod.length === 1 ? L.markets : L.marketsPlural} ·{' '}
                <span className="text-emerald-400 font-semibold">
                  {formatCurrencyCompact(byCountryPeriod.reduce((s, c) => s + c.wonAmount, 0))}
                </span>{' '}{L.won.toLowerCase()} ·{' '}
                <span className="text-amber-400 font-semibold">
                  {formatCurrencyCompact(byCountryPeriod.reduce((s, c) => s + c.pipelineAmount, 0))}
                </span>{' '}{L.pipeline.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {byCountryPeriod.map((item, i) => {
              const totalAmt = byCountryPeriod.reduce((s, c) => s + c.wonAmount + c.pipelineAmount, 0);
              const pct = totalAmt > 0 ? ((item.wonAmount + item.pipelineAmount) / totalAmt) * 100 : 0;
              const grad = COUNTRY_GRADIENTS[i % COUNTRY_GRADIENTS.length];
              return (
                <div key={item.country} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FlagImg country={item.country} size="lg" />
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{item.country}</p>
                        <p className="text-xs text-slate-400">{item.openCount} {L.openOppCount}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-emerald-400 font-semibold mb-0.5">{L.won}</p>
                      <p className="text-sm font-black text-emerald-300">{item.wonAmount > 0 ? formatCurrencyCompact(item.wonAmount) : '—'}</p>
                      {item.wonCount > 0 && <p className="text-xs text-emerald-600 mt-0.5">{item.wonCount} deals</p>}
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-amber-400 font-semibold mb-0.5">{L.pipeline}</p>
                      <p className="text-sm font-black text-amber-300">{item.pipelineAmount > 0 ? formatCurrencyCompact(item.pipelineAmount) : '—'}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-red-400 font-semibold mb-0.5">{L.lostLabel}</p>
                      <p className="text-sm font-black text-red-300">{item.lostAmount > 0 ? formatCurrencyCompact(item.lostAmount) : '—'}</p>
                      {item.lostCount > 0 && <p className="text-xs text-red-600 mt-0.5">{item.lostCount} deals</p>}
                    </div>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: grad.bar }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline por Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{L.pipelineByStatus}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{L.pipelineByStatusSub}</p>
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
            <h3 className="text-sm font-bold text-slate-900">{L.blDistrib}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{L.blDistribSub}</p>
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
            <h3 className="text-sm font-bold text-slate-900">{L.pipelineByCompany}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{L.pipelineByCompanySub}</p>
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
            <h3 className="text-sm font-bold text-slate-900">{L.top5Clients}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{L.byAmount}</p>
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
              <h3 className="text-sm font-bold text-slate-900">{L.topOwners}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{L.topOwnersSub}</p>
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
              <h3 className="text-sm font-bold text-slate-900">{L.countryDistrib}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{L.countryDistribSub}</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {byCountry.map((item, i) => {
                const max = byCountry[0]?.amount || 1;
                const pct = (item.amount / max) * 100;
                const grad = COUNTRY_GRADIENTS[i % COUNTRY_GRADIENTS.length];
                return (
                  <div key={item.country} className={`bg-gradient-to-r ${grad.bg} border ${grad.border} rounded-xl px-3 py-2`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <FlagImg country={item.country} size="sm" />
                        <span className="text-xs font-semibold text-slate-800">{item.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${grad.text}`}>{item.count} ops</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrencyCompact(item.amount)}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: grad.bar }} />
                    </div>
                  </div>
                );
              })}
              {byCountry.length === 0 && <p className="text-xs text-slate-400">{L.noData}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Presencia Global ── */}
      {!loading && byCountry.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <MapPin size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{L.globalPresence}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {byCountry.length} {byCountry.length === 1 ? L.markets : L.marketsPlural} ·{' '}
                <span className="text-emerald-400 font-semibold">
                  {formatCurrencyCompact(byCountry.reduce((s, c) => s + c.wonAmount, 0))}
                </span>{' '}{L.won.toLowerCase()} ·{' '}
                <span className="text-amber-400 font-semibold">
                  {formatCurrencyCompact(byCountry.reduce((s, c) => s + c.pipelineAmount, 0))}
                </span>{' '}{L.pipeline.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {byCountry.map((item, i) => {
              const totalAmt = byCountry.reduce((s, c) => s + c.wonAmount + c.pipelineAmount, 0);
              const pct = totalAmt > 0 ? ((item.wonAmount + item.pipelineAmount) / totalAmt) * 100 : 0;
              const grad = COUNTRY_GRADIENTS[i % COUNTRY_GRADIENTS.length];
              return (
                <div
                  key={item.country}
                  className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 transition-all"
                >
                  {/* Country header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FlagImg country={item.country} size="lg" />
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{item.country}</p>
                        <p className="text-xs text-slate-400">{item.openCount} {L.openOppCount}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300">
                        {pct.toFixed(0)}%
                      </span>
                      {isTimeFiltered && item.periodCount > 0 && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          +{item.periodCount} {lang === 'es' ? 'este período' : 'this period'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-emerald-400 font-semibold mb-0.5">{L.won}</p>
                      <p className="text-sm font-black text-emerald-300 leading-tight">
                        {item.wonAmount > 0 ? formatCurrencyCompact(item.wonAmount) : '—'}
                      </p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-amber-400 font-semibold mb-0.5">{L.pipeline}</p>
                      <p className="text-sm font-black text-amber-300 leading-tight">
                        {item.pipelineAmount > 0 ? formatCurrencyCompact(item.pipelineAmount) : '—'}
                      </p>
                      {isTimeFiltered && item.periodAmount > 0 && (
                        <p className="text-xs text-amber-500 mt-0.5">+{formatCurrencyCompact(item.periodAmount)}</p>
                      )}
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-red-400 font-semibold mb-0.5">{L.lostLabel}</p>
                      <p className="text-sm font-black text-red-300 leading-tight">
                        {item.lostAmount > 0 ? formatCurrencyCompact(item.lostAmount) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: grad.bar }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

    {/* ═══════════════════════════════════════════════════════
        PRINT-ONLY ONE-PAGER — A4 Landscape · Always English · Fits one page
        ═══════════════════════════════════════════════════════ */}
    <div className="hidden print:block" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', fontSize: '11px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', paddingBottom: '7px', borderBottom: '2px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '28px', height: '28px', background: '#f59e0b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '900', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>MTI Group</div>
            <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>Business Performance · Shareholder Report</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{periodLabelEn}</div>
          <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '1px' }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Confidential
          </div>
        </div>
      </div>

      {/* Global KPI Strip — 8 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '5px', marginBottom: '8px' }}>
        {[
          { label: 'Total Pipeline',    value: formatCurrencyCompact(globalTotals.totalPipeline),    sub: 'Excl. lost',          color: '#f59e0b' },
          { label: 'Weighted Pipeline', value: formatCurrencyCompact(globalTotals.weightedPipeline), sub: 'Prob.-adjusted',      color: '#3b82f6' },
          { label: 'Total Accepted',    value: formatCurrencyCompact(globalTotals.totalAccepted),    sub: 'Won/Deliv./Done',     color: '#10b981' },
          { label: 'Total Invoiced',    value: formatCurrencyCompact(globalTotals.totalInvoiced),    sub: 'Realized revenue',    color: '#8b5cf6' },
          { label: 'Win Rate',          value: `${winRate.toFixed(1)}%`,                             sub: 'Won vs resolved',     color: '#0d9488' },
          { label: 'In Delivery',       value: String(globalTotals.delivering),                      sub: 'Active projects',     color: '#f97316' },
          { label: 'Open Opps',         value: String(globalTotals.openOpportunities),               sub: 'Status 2–5',          color: '#6366f1' },
          { label: 'Lost',              value: String(globalTotals.lost),                            sub: 'Closed lost',         color: '#ef4444' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', borderTop: `2px solid ${kpi.color}` }}>
            <div style={{ fontSize: '6.5px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '2px', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '6px', color: '#94a3b8', marginTop: '1px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Main content: 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.3fr', gap: '7px', marginBottom: '7px' }}>

        {/* Business Lines */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#0f172a', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Business Lines</div>
          {(() => {
            const total = businessLines.reduce((s, d) => s + d.value, 0);
            return businessLines.map((bl, i) => {
              const pct = total > 0 ? (bl.value / total) * 100 : 0;
              return (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: bl.fill, flexShrink: 0 }} />
                      <span style={{ fontSize: '7px', color: '#475569' }}>{bl.name}</span>
                    </div>
                    <span style={{ fontSize: '7.5px', fontWeight: '700', color: '#0f172a' }}>{formatCurrencyCompact(bl.value)} <span style={{ fontWeight: '400', color: '#94a3b8' }}>{pct.toFixed(0)}%</span></span>
                  </div>
                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: bl.fill }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Top Clients */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#0f172a', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Top Clients</div>
          {(() => {
            const max = topClients[0]?.totalAmount || 1;
            return topClients.map((c, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', alignItems: 'center' }}>
                  <span style={{ fontSize: '7px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{c.name}</span>
                  <span style={{ fontSize: '7.5px', fontWeight: '700', color: '#0f172a' }}>{formatCurrencyCompact(c.totalAmount)}</span>
                </div>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c.totalAmount / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Top Owners */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#0f172a', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Top Owners</div>
          {(() => {
            const maxAmt = topOwners[0]?.amount || 1;
            return topOwners.slice(0, 6).map((item, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', alignItems: 'center' }}>
                  <span style={{ fontSize: '7px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '58%' }}>{item.owner}</span>
                  <span style={{ fontSize: '7.5px', fontWeight: '700', color: '#0f172a' }}>{formatCurrencyCompact(item.amount)} <span style={{ fontWeight: '400', color: '#94a3b8', fontSize: '6.5px' }}>{item.count}op</span></span>
                </div>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(item.amount / maxAmt) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Global Presence */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#f1f5f9', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Global Presence · {byCountry.length} {byCountry.length === 1 ? 'market' : 'markets'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px' }}>
            {byCountry.slice(0, 8).map((item, i) => {
              const iso = getCountryIso(item.country);
              const totalAmt = byCountry.reduce((s, c) => s + c.wonAmount + c.pipelineAmount, 0);
              const pct = totalAmt > 0 ? ((item.wonAmount + item.pipelineAmount) / totalAmt) * 100 : 0;
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '4px', padding: '4px 5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                    {iso ? <img src={`https://flagcdn.com/w20/${iso}.png`} alt={item.country} style={{ width: '13px', height: '9px', objectFit: 'cover', borderRadius: '1px' }} />
                         : <span style={{ fontSize: '6.5px', color: '#64748b', fontWeight: '700' }}>{item.country.slice(0,2).toUpperCase()}</span>}
                    <span style={{ fontSize: '7px', color: '#cbd5e1', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.country}</span>
                    <span style={{ fontSize: '6px', color: '#475569', marginLeft: 'auto', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#f1f5f9', lineHeight: 1 }}>{formatCurrencyCompact(item.wonAmount + item.pipelineAmount)}</div>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '1px' }}>
                    <span style={{ fontSize: '6px', color: '#34d399' }}>W:{formatCurrencyCompact(item.wonAmount)}</span>
                    <span style={{ fontSize: '6px', color: '#fbbf24' }}>P:{formatCurrencyCompact(item.pipelineAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quarterly trend + Period side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: isTimeFiltered ? '1fr 1.6fr' : '1fr', gap: '7px', marginBottom: '7px' }}>

        {/* Quarterly trend */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#0f172a', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Quarterly Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {quarterlyTrend.map((q, i) => {
              const maxVal = Math.max(...quarterlyTrend.map(d => d.Pipeline), 1);
              return (
                <div key={i}>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>{q.quarter}</div>
                  {[
                    { label: 'Pipeline', val: q.Pipeline, color: '#f59e0b' },
                    { label: 'Accepted', val: q.Aceptado, color: '#10b981' },
                    { label: 'Invoiced', val: q.Facturado, color: '#8b5cf6' },
                  ].map((row, j) => (
                    <div key={j} style={{ marginBottom: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                        <span style={{ fontSize: '6px', color: '#94a3b8' }}>{row.label}</span>
                        <span style={{ fontSize: '6.5px', fontWeight: '700', color: '#0f172a' }}>{formatCurrencyCompact(row.val)}</span>
                      </div>
                      <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(row.val / maxVal) * 100}%`, background: row.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Period Activity — shown only when a time filter is selected */}
        {isTimeFiltered && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '8px' }}>
            <div style={{ fontSize: '7.5px', fontWeight: '800', color: '#0c4a6e', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Period Activity — {periodLabelEn}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '6px' }}>
              {[
                { label: 'New Opps',     value: String(nuevasEnPeriodo.length),                                              sub: `${formatCurrencyCompact(nuevasEnPeriodo.reduce((s,o)=>s+o.amount,0))}`,   color: '#f59e0b' },
                { label: 'Won',          value: formatCurrencyCompact(wonInPeriod.reduce((s,o)=>s+o.amount,0)),              sub: `${wonInPeriod.length} deals`,                                             color: '#10b981' },
                { label: 'Revenue',      value: formatCurrencyCompact(wonInPeriod.reduce((s,o)=>s+o.totalInvoiced,0)),       sub: 'Invoiced',                                                                color: '#8b5cf6' },
                { label: 'Lost',         value: lostInPeriod.length > 0 ? String(lostInPeriod.length) : '—',                sub: lostInPeriod.length > 0 ? formatCurrencyCompact(lostInPeriod.reduce((s,o)=>s+o.amount,0)) : 'deals',  color: '#ef4444' },
                { label: 'Conv. Rate',   value: tasaConversion !== null ? `${tasaConversion.toFixed(0)}%` : '—',             sub: `${nuevasEnPeriodo.filter(o=>[6,7,8].includes(o.statusCode)).length}/${nuevasEnPeriodo.length}`, color: '#0d9488' },
                { label: 'Velocity',     value: velocidadPipeline !== null ? `${Math.round(velocidadPipeline)}d` : '—',     sub: 'avg open→close',                                                          color: '#6366f1' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #bae6fd', borderRadius: '5px', padding: '5px 6px', borderTop: `2px solid ${kpi.color}` }}>
                  <div style={{ fontSize: '6px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{kpi.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', lineHeight: 1, marginTop: '2px' }}>{kpi.value}</div>
                  <div style={{ fontSize: '6px', color: '#94a3b8', marginTop: '1px' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>
            {/* Period country mini-table */}
            {byCountryPeriod.length > 0 && (
              <div style={{ background: '#1e293b', borderRadius: '4px', padding: '5px 7px' }}>
                <div style={{ fontSize: '6.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Country Activity · {periodLabelEn}</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(byCountryPeriod.length, 6)}, 1fr)`, gap: '3px' }}>
                  {byCountryPeriod.slice(0, 6).map((item, i) => {
                    const iso = getCountryIso(item.country);
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '4px 5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                          {iso ? <img src={`https://flagcdn.com/w20/${iso}.png`} alt={item.country} style={{ width: '12px', height: '8px', objectFit: 'cover', borderRadius: '1px' }} />
                               : <span style={{ fontSize: '6px', color: '#64748b', fontWeight: '700' }}>{item.country.slice(0,2).toUpperCase()}</span>}
                          <span style={{ fontSize: '6.5px', color: '#cbd5e1', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.country}</span>
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: '900', color: '#f1f5f9' }}>{formatCurrencyCompact(item.wonAmount + item.pipelineAmount)}</div>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {item.wonAmount > 0 && <span style={{ fontSize: '5.5px', color: '#34d399' }}>W:{formatCurrencyCompact(item.wonAmount)}</span>}
                          {item.pipelineAmount > 0 && <span style={{ fontSize: '5.5px', color: '#fbbf24' }}>P:{formatCurrencyCompact(item.pipelineAmount)}</span>}
                          {item.lostAmount > 0 && <span style={{ fontSize: '5.5px', color: '#f87171' }}>L:{formatCurrencyCompact(item.lostAmount)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '7.5px', color: '#94a3b8' }}>MTI Group · Confidential · For shareholder and internal use only</div>
        <div style={{ fontSize: '7.5px', color: '#94a3b8' }}>
          Open: {globalTotals.openOpportunities} · In Delivery: {globalTotals.delivering} · Finished: {globalTotals.finished} · Lost: {globalTotals.lost} · Win Rate: {winRate.toFixed(1)}%
          {isTimeFiltered && ` · Period won: ${wonInPeriod.length} deals (${formatCurrencyCompact(wonInPeriod.reduce((s,o)=>s+o.amount,0))})`}
        </div>
      </div>
    </div>
    </>
  );
}
