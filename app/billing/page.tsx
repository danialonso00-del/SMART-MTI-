'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Area,
} from 'recharts';
import { Receipt, TrendingUp, Clock, DollarSign, Download, Search, ChevronUp, ChevronDown, AlertCircle, CheckCircle2, CalendarDays, ArrowRight, BarChart2 } from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import CompanyBadge from '@/components/ui/CompanyBadge';
import PageHeader from '@/components/ui/PageHeader';
import { useRouter } from 'next/navigation';
import { StatusCode } from '@/lib/types';
import { formatCurrencyCompact, cn } from '@/lib/utils';

interface Project {
  id: string;
  client: string;
  opportunity: string;
  company: string;
  statusCode: number;
  amount: number;
  currency: string;
  totalInvoiced: number;
  pendingToInvoice: number;
  margin: number;
  wipStatus: number;
  acceptanceDate: string | null;
  date: string;
  owner: string;
}

interface UpcomingItem {
  projectId: string;
  projectName: string;
  client: string;
  company: string;
  owner: string;
  billingType: string;
  amount: number;
  dueDate: string | null;
  status: 'this_month' | 'upcoming' | 'pending_milestone' | 'overdue';
  milestoneName?: string;
  needsConfirmation: boolean;
}

interface UpcomingResponse {
  items: UpcomingItem[];
  summary: { thisMonth: number; overdue: number; upcoming90: number; needsAction: number };
}

interface ForecastMonth {
  key: string;
  label: string;
  expected: number;
  invoiced: number;
  items: { projectId: string; projectName: string; client: string; company: string; amount: number; type: string; detail: string }[];
}
interface ForecastResponse {
  months: ForecastMonth[];
  totals: { totalExpected: number; totalInvoiced: number; thisMonthExpected: number; nextMonthExpected: number };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {formatCurrencyCompact(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function buildMonthlyChart(projects: Project[]) {
  const months: Record<string, { month: string; importe: number; facturado: number; count: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('es', { month: 'short', year: '2-digit' });
    months[key] = { month: label, importe: 0, facturado: 0, count: 0 };
  }
  for (const p of projects) {
    const ref = p.acceptanceDate || p.date;
    if (!ref) continue;
    const d = new Date(ref);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].importe   += p.amount;
      months[key].facturado += p.totalInvoiced;
      months[key].count++;
    }
  }
  return Object.values(months);
}

type SortKey = 'client' | 'amount' | 'totalInvoiced' | 'pendingToInvoice' | 'margin' | 'statusCode';
type SortDir = 'asc' | 'desc';

export default function BillingPage() {
  const router = useRouter();
  const [projects, setProjects]           = useState<Project[]>([]);
  const [upcoming, setUpcoming]           = useState<UpcomingResponse | null>(null);
  const [loading, setLoading]             = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [forecast, setForecast]           = useState<ForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastDetail, setForecastDetail] = useState<string | null>(null); // selected month key
  const [search, setSearch]               = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter]   = useState<number | 'all'>('all');
  const [sortKey, setSortKey]             = useState<SortKey>('amount');
  const [sortDir, setSortDir]             = useState<SortDir>('desc');

  useEffect(() => {
    fetch('/api/opportunities?lite=true')
      .then(r => r.json())
      .then((d: Project[]) => {
        const proj = Array.isArray(d) ? d.filter(o => [6, 7, 8].includes(o.statusCode)) : [];
        setProjects(proj);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/billing/upcoming')
      .then(r => r.json())
      .then((d: UpcomingResponse) => { setUpcoming(d); setLoadingUpcoming(false); })
      .catch(() => setLoadingUpcoming(false));

    fetch('/api/billing/forecast')
      .then(r => r.json())
      .then((d: ForecastResponse) => { setForecast(d); setForecastLoading(false); })
      .catch(() => setForecastLoading(false));
  }, []);

  const companies = useMemo(() => Array.from(new Set(projects.map(p => p.company))).sort(), [projects]);

  const filtered = useMemo(() => {
    let d = [...projects];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(p => p.client.toLowerCase().includes(q) || p.opportunity.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (companyFilter !== 'all') d = d.filter(p => p.company === companyFilter);
    if (statusFilter !== 'all')  d = d.filter(p => p.statusCode === statusFilter);
    d.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
    return d;
  }, [projects, search, companyFilter, statusFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp size={11} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-amber-500" />
      : <ChevronDown size={11} className="text-amber-500" />;
  }

  const totalAccepted = filtered.reduce((s, o) => s + o.amount, 0);
  const totalInvoiced = filtered.reduce((s, o) => s + o.totalInvoiced, 0);
  const totalPending  = filtered.reduce((s, o) => s + o.pendingToInvoice, 0);
  const forecast3m    = totalPending * 0.35;
  const avgMargin     = filtered.length > 0 ? filtered.reduce((s, p) => s + p.margin, 0) / filtered.length : 0;

  const monthlyData = useMemo(() => buildMonthlyChart(projects), [projects]);

  function exportCsv() {
    const headers = ['ID','Cliente','Proyecto','Empresa','Estado','Importe','Facturado','Pendiente','Margen%'];
    const rows = filtered.map(r => [r.id, r.client, r.opportunity, r.company, r.statusCode, r.amount, r.totalInvoiced, r.pendingToInvoice, r.margin.toFixed(1)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'facturacion.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Facturación"
        subtitle={`Control de facturación por proyecto · ${loading ? '…' : projects.length} proyectos (status 6-8)`}
        actions={
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <Download size={16} /> Exportar
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Aceptado"
          value={formatCurrencyCompact(totalAccepted)}
          subtitle={`${filtered.length} proyectos (6/7/8)`}
          icon={<DollarSign size={22} />}
          color="emerald"
        />
        <KpiCard
          label="Total Facturado"
          value={formatCurrencyCompact(totalInvoiced)}
          subtitle={`${totalAccepted > 0 ? ((totalInvoiced / totalAccepted) * 100).toFixed(1) : 0}% del total aceptado`}
          icon={<Receipt size={22} />}
          color="amber"
        />
        <KpiCard
          label="Pendiente Facturar"
          value={formatCurrencyCompact(totalPending)}
          subtitle="En cartera por facturar"
          icon={<Clock size={22} />}
          color="violet"
        />
        <KpiCard
          label="Forecast 3 Meses"
          value={formatCurrencyCompact(forecast3m)}
          subtitle={`Margen medio: ${avgMargin.toFixed(1)}%`}
          icon={<TrendingUp size={22} />}
          color="teal"
        />
      </div>

      {/* ── Upcoming Invoices Widget ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Próximas Facturas a Generar</h3>
              <p className="text-xs text-slate-400 mt-0.5">Basado en la planificación de facturación de cada proyecto</p>
            </div>
          </div>
          {upcoming && (
            <div className="flex items-center gap-3">
              {upcoming.summary.overdue > 0 && (
                <span className="text-xs bg-red-50 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  Vencido: {formatCurrencyCompact(upcoming.summary.overdue)}
                </span>
              )}
              <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                Este mes: {formatCurrencyCompact(upcoming.summary.thisMonth)}
              </span>
              {upcoming.summary.needsAction > 0 && (
                <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                  {upcoming.summary.needsAction} pendientes confirmar
                </span>
              )}
            </div>
          )}
        </div>

        {loadingUpcoming ? (
          <div className="divide-y divide-slate-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2.5 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !upcoming || upcoming.items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">Sin facturas pendientes configuradas</p>
            <p className="text-xs text-slate-400 mt-1">Configura la planificación de facturación en cada proyecto</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-2.5">Estado</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Cliente / Proyecto</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Tipo / Hito</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Fecha</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-2.5">Importe</th>
                  <th className="text-xs font-semibold text-slate-500 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {upcoming.items.map((item, i) => {
                  const statusConfig = {
                    overdue:           { label: 'Vencido',    cls: 'bg-red-50 text-red-700 border-red-200' },
                    this_month:        { label: 'Este mes',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    upcoming:          { label: 'Próximo',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    pending_milestone: { label: 'Pendiente',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                  }[item.status];
                  const typeLabel = { milestones: 'Por hitos', monthly: 'Mensual', fixed: 'Precio fijo' }[item.billingType] ?? item.billingType;
                  return (
                    <tr key={i} className={cn('hover:bg-slate-50/60 transition-colors', i % 2 === 1 ? 'bg-slate-50/30' : '')}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', statusConfig.cls)}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{item.client}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{item.projectName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">{typeLabel}</p>
                        {item.milestoneName && (
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{item.milestoneName}</p>
                        )}
                        {item.needsConfirmation && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertCircle size={10} className="text-violet-500" />
                            <span className="text-xs text-violet-600">Requiere confirmación</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(item.amount)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a href={`/projects/${item.projectId}`} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                          Ver <ArrowRight size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PREVISIÓN DE FACTURACIÓN ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-violet-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Previsión de Facturación</h3>
              <p className="text-xs text-slate-400 mt-0.5">Proyección mes a mes basada en hitos, contratos mensuales y precio fijo · próximos 13 meses</p>
            </div>
          </div>
          {forecast && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-xs text-slate-400">Este mes</p>
                <p className="text-sm font-bold text-violet-700">{formatCurrencyCompact(forecast.totals.thisMonthExpected)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Próximo mes</p>
                <p className="text-sm font-bold text-blue-700">{formatCurrencyCompact(forecast.totals.nextMonthExpected)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total previsto</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrencyCompact(forecast.totals.totalExpected)}</p>
              </div>
            </div>
          )}
        </div>

        {forecastLoading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : !forecast || forecast.months.every(m => m.expected === 0 && m.invoiced === 0) ? (
          <div className="px-5 py-10 text-center">
            <CalendarDays size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay previsión configurada</p>
            <p className="text-xs text-slate-400 mt-1">Configura la planificación de facturación en cada proyecto activo</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.months} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => formatCurrencyCompact(v)} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
                          <p className="font-semibold text-slate-700 mb-1">{label}</p>
                          {payload.map((e, i) => (
                            <p key={i} style={{ color: e.color }} className="text-xs font-medium">
                              {e.name}: {formatCurrencyCompact(Number(e.value))}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="invoiced"  name="Facturado"  fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Area dataKey="expected" name="Previsto"   fill="#ede9fe" stroke="#8b5cf6" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-semibold text-slate-500 py-2 pr-4">Mes</th>
                    <th className="text-right font-semibold text-slate-500 py-2 px-3">Facturado</th>
                    <th className="text-right font-semibold text-slate-500 py-2 px-3">Previsto</th>
                    <th className="text-right font-semibold text-slate-500 py-2 px-3">Proyectos</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {forecast.months.filter(m => m.expected > 0 || m.invoiced > 0).map(m => (
                    <>
                      <tr key={m.key}
                        className={cn('hover:bg-slate-50 transition-colors cursor-pointer',
                          forecastDetail === m.key && 'bg-violet-50')}
                        onClick={() => setForecastDetail(forecastDetail === m.key ? null : m.key)}
                      >
                        <td className="py-2 pr-4 font-medium text-slate-700">{m.label}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                          {m.invoiced > 0 ? formatCurrencyCompact(m.invoiced) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-violet-700 font-bold">
                          {m.expected > 0 ? formatCurrencyCompact(m.expected) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {m.items.length > 0 ? `${new Set(m.items.map(i => i.projectId)).size} proy.` : '—'}
                        </td>
                        <td className="py-2 pl-2 text-slate-400 text-right">
                          {m.items.length > 0 && (
                            <span className="text-xs">{forecastDetail === m.key ? '▲' : '▼'}</span>
                          )}
                        </td>
                      </tr>
                      {forecastDetail === m.key && m.items.map((item, idx) => (
                        <tr key={`${m.key}-${idx}`} className="bg-violet-50/50">
                          <td className="py-1.5 pl-4 pr-4 text-slate-500 italic">{item.client}</td>
                          <td className="py-1.5 px-3" colSpan={2}>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mr-2',
                              item.type === 'milestone' ? 'bg-amber-100 text-amber-700' :
                              item.type === 'monthly'   ? 'bg-blue-100 text-blue-700' :
                                                          'bg-slate-100 text-slate-600')}>
                              {item.type === 'milestone' ? 'Hito' : item.type === 'monthly' ? 'Mensual' : 'Fijo'}
                            </span>
                            <span className="text-slate-500">{item.detail}</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold text-violet-700">
                            {formatCurrencyCompact(item.amount)}
                          </td>
                          <td className="py-1.5 pl-2 text-right">
                            <a href={`/projects/${item.projectId}`} className="text-xs text-amber-600 hover:underline">Ver</a>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Proyectos Aceptados por Mes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Importe y facturado acumulado — últimos 12 meses</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrencyCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="importe"   name="Importe"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="facturado" name="Facturado" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado cartera */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Estado de Cartera</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribución ingresos</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-500">Facturado</span>
                <span className="text-xs font-bold text-emerald-700">{formatCurrencyCompact(totalInvoiced)}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${totalAccepted > 0 ? (totalInvoiced / totalAccepted) * 100 : 0}%` }} />
              </div>
              <div className="text-xs text-slate-400 mt-0.5 text-right">
                {totalAccepted > 0 ? ((totalInvoiced / totalAccepted) * 100).toFixed(1) : 0}% del total
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-500">Pendiente</span>
                <span className="text-xs font-bold text-amber-700">{formatCurrencyCompact(totalPending)}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${totalAccepted > 0 ? (totalPending / totalAccepted) * 100 : 0}%` }} />
              </div>
              <div className="text-xs text-slate-400 mt-0.5 text-right">
                {totalAccepted > 0 ? ((totalPending / totalAccepted) * 100).toFixed(1) : 0}% del total
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div className="text-center bg-slate-50 rounded-xl py-3">
                <p className="text-xs text-slate-400 mb-1">Proyectos</p>
                <p className="text-xl font-bold text-slate-900">{projects.length}</p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl py-3">
                <p className="text-xs text-amber-500 mb-1">Margen Medio</p>
                <p className="text-xl font-bold text-amber-700">{avgMargin.toFixed(1)}%</p>
              </div>
            </div>
            {/* By status breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {[6, 7, 8].map(code => {
                const count = projects.filter(p => p.statusCode === code).length;
                const labels: Record<number, string> = { 6: 'Won/Aceptado', 7: 'Delivering', 8: 'Finalizado' };
                const colors: Record<number, string> = { 6: 'text-emerald-700 bg-emerald-50', 7: 'text-blue-700 bg-blue-50', 8: 'text-slate-700 bg-slate-100' };
                return (
                  <div key={code} className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', colors[code])}>{labels[code]}</span>
                    <span className="text-xs font-bold text-slate-700">{count} proyectos</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, proyecto o ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-600">
          <option value="all">Todas las empresas</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {([['all', 'Todos'], [6, 'Won'], [7, 'Delivering'], [8, 'Finalizado']] as const).map(([val, label]) => (
            <button key={String(val)} onClick={() => setStatusFilter(val)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                String(statusFilter) === String(val) ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Detalle por Proyecto</h3>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} proyectos · Haz clic en una fila para ver el detalle</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">ID</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">Cliente / Proyecto <SortIcon k="client" /></div>
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Empresa</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => handleSort('statusCode')}>
                  <div className="flex items-center justify-center gap-1">Estado <SortIcon k="statusCode" /></div>
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">Importe <SortIcon k="amount" /></div>
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => handleSort('totalInvoiced')}>
                  <div className="flex items-center justify-end gap-1">Facturado <SortIcon k="totalInvoiced" /></div>
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => handleSort('pendingToInvoice')}>
                  <div className="flex items-center justify-end gap-1">Pendiente <SortIcon k="pendingToInvoice" /></div>
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Avance</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => handleSort('margin')}>
                  <div className="flex items-center justify-end gap-1">Margen <SortIcon k="margin" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-slate-400 py-12 text-sm">
                    No se encontraron proyectos
                  </td>
                </tr>
              ) : filtered.map((row, idx) => {
                const invoicedPct = row.amount > 0 ? (row.totalInvoiced / row.amount) * 100 : 0;
                const marginColor = row.margin >= 35 ? 'text-emerald-600' : row.margin >= 20 ? 'text-amber-600' : row.margin > 0 ? 'text-orange-600' : 'text-slate-400';
                return (
                  <tr
                    key={row.id}
                    className={cn('cursor-pointer transition-colors hover:bg-amber-50/30', idx % 2 === 1 ? 'bg-slate-50/40' : '')}
                    onClick={() => router.push(`/projects/${row.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{row.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{row.client}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[220px] mt-0.5">{row.opportunity}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CompanyBadge company={row.company} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <StatusBadge statusCode={row.statusCode as StatusCode} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(row.amount)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-semibold text-emerald-700">{formatCurrencyCompact(row.totalInvoiced)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-semibold text-amber-700">{formatCurrencyCompact(row.pendingToInvoice)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(invoicedPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{invoicedPct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={cn('text-xs font-bold', marginColor)}>
                        {row.margin > 0 ? `${row.margin.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t-2 border-amber-200">
                <td className="px-4 py-3 text-xs font-bold text-slate-700" colSpan={4}>
                  TOTALES · {filtered.length} proyectos
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">{formatCurrencyCompact(totalAccepted)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-emerald-700">{formatCurrencyCompact(totalInvoiced)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-amber-700">{formatCurrencyCompact(totalPending)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
