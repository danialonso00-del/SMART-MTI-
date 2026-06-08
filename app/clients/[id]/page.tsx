'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, Globe, User, TrendingUp, FileText,
  Clock, CheckCircle, AlertCircle, BarChart2
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatusBadge from '@/components/ui/StatusBadge';
import CompanyBadge from '@/components/ui/CompanyBadge';
import { StatusCode } from '@/lib/types';
import {
  formatCurrency, formatCurrencyCompact, formatDate, getCountryFlag,
  getStatusColor, getCompanyColor, cn
} from '@/lib/utils';

const BL_COLORS: Record<string, string> = {
  hardware:    '#F59E0B',
  ia:          '#3B82F6',
  bim:         '#8B5CF6',
  ttioOm:      '#10B981',
  events:      '#F97316',
  proservices: '#14B8A6',
};
const BL_LABELS: Record<string, string> = {
  hardware: 'Hardware', ia: 'IA', bim: 'BIM',
  ttioOm: 'TTIO/O&M', events: 'Eventos', proservices: 'Pro Services',
};

interface Opportunity {
  id: string; client: string; opportunity: string; amount: number;
  currency: string; statusCode: number; company: string; probability: number;
  weightedPipeline: number; owner: string; country: string;
  expectedClosingDate: string | null; acceptanceDate: string | null;
  endDate: string | null; date: string; totalInvoiced: number;
  pendingToInvoice: number; wipStatus: number; margin: number; costs: number;
  observations: string | null;
  blHardware: number; blIa: number; blBim: number; blTtioOm: number;
  blEvents: number; blProservices: number;
}

interface ClientData {
  client: { id: string; name: string; country: string; primaryOwner: string; notes?: string };
  opportunities: Opportunity[];
  projects: Opportunity[];
  presales: Opportunity[];
  summary: {
    totalAmount: number; totalInvoiced: number; pendingToInvoice: number;
    activeProjects: number; openOpportunities: number; weightedPipeline: number;
    totalCosts: number;
    blBreakdown: Record<string, number>;
  };
}

function KpiCard({ label, value, sub, color = 'slate' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    slate: 'bg-white border-slate-200',
    amber: 'bg-amber-50 border-amber-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    violet: 'bg-violet-50 border-violet-200',
    teal: 'bg-teal-50 border-teal-200',
  };
  const textMap: Record<string, string> = {
    slate: 'text-slate-900', amber: 'text-amber-900', emerald: 'text-emerald-900',
    blue: 'text-blue-900', violet: 'text-violet-900', teal: 'text-teal-900',
  };
  const labelMap: Record<string, string> = {
    slate: 'text-slate-500', amber: 'text-amber-600', emerald: 'text-emerald-600',
    blue: 'text-blue-600', violet: 'text-violet-600', teal: 'text-teal-600',
  };
  return (
    <div className={cn('border rounded-2xl p-4 shadow-sm', colorMap[color] || colorMap.slate)}>
      <p className={cn('text-xs font-medium mb-1', labelMap[color] || labelMap.slate)}>{label}</p>
      <p className={cn('text-xl font-bold', textMap[color] || textMap.slate)}>{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<number, string> = {
  7: 'bg-emerald-50', 8: 'bg-slate-50', 6: 'bg-teal-50',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'resumen' | 'proyectos' | 'oportunidades' | 'todo'>('resumen');

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('No se pudo cargar el cliente'); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-slate-500">{error || 'Cliente no encontrado'}</p>
        <button onClick={() => router.push('/clients')} className="text-amber-600 hover:underline text-sm">
          Volver a clientes
        </button>
      </div>
    );
  }

  const { client, opportunities, projects, presales, summary } = data;
  const blData = Object.entries(summary.blBreakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: BL_LABELS[k] || k, value: v, color: BL_COLORS[k] || '#94a3b8' }));

  const TABS = [
    { key: 'resumen',        label: 'Resumen' },
    { key: 'proyectos',      label: `Proyectos (${projects.length})` },
    { key: 'oportunidades',  label: `Oportunidades (${presales.length})` },
    { key: 'todo',           label: `Todo (${opportunities.length})` },
  ] as const;

  return (
    <div className="space-y-4 pb-10">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push('/clients')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Volver a Clientes
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl">{getCountryFlag(client.country)}</span>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              {client.primaryOwner && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                  {client.primaryOwner}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Globe size={13} />{client.country}</span>
              {client.primaryOwner && (
                <span className="flex items-center gap-1"><User size={13} />Owner: {client.primaryOwner}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard label="Total Importe"         value={formatCurrencyCompact(summary.totalAmount)}      color="slate" />
        <KpiCard label="Total Facturado"       value={formatCurrencyCompact(summary.totalInvoiced)}    color="emerald" />
        <KpiCard label="Pendiente Facturar"    value={formatCurrencyCompact(summary.pendingToInvoice)} color="amber" />
        <KpiCard label="Proyectos Activos"     value={String(summary.activeProjects)}                  color="teal" />
        <KpiCard label="Oportunidades Abiertas" value={String(summary.openOpportunities)}              color="blue"
          sub={`Pond: ${formatCurrencyCompact(summary.weightedPipeline)}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* RESUMEN TAB */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Business lines donut */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-500" /> Distribución por Línea de Negocio
            </h3>
            {blData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={blData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {blData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos de líneas de negocio</p>
            )}
          </div>

          {/* Recent projects */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Actividad Reciente
            </h3>
            <div className="space-y-2">
              {opportunities.slice(0, 8).map(opp => (
                <div key={opp.id}
                  className="flex items-start justify-between gap-2 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors"
                  onClick={() => router.push(`/projects/${opp.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-400">{opp.id}</span>
                      <StatusBadge statusCode={opp.statusCode as StatusCode} size="sm" />
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-1">{opp.opportunity}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                    {formatCurrencyCompact(opp.amount)}
                  </span>
                </div>
              ))}
              {opportunities.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Sin registros</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROYECTOS TAB */}
      {tab === 'proyectos' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['ID', 'Proyecto', 'Estado', 'Empresa', 'Importe', 'Facturado', 'Pendiente', 'WIP%', 'Margen%', 'Aceptación', 'Fin'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                  <tr><td colSpan={11} className="text-center text-slate-400 py-10 text-sm">Sin proyectos</td></tr>
                ) : projects.map(p => {
                  const isFullyInvoiced = p.amount > 0 && p.totalInvoiced >= p.amount;
                  const hasPending      = p.pendingToInvoice > 0;
                  const rowBg = isFullyInvoiced ? 'bg-emerald-50/40' : hasPending ? '' : '';
                  return (
                    <tr key={p.id}
                      className={cn('hover:bg-amber-50/30 cursor-pointer transition-colors', rowBg)}
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.id}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs font-medium text-slate-800 line-clamp-2">{p.opportunity}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge statusCode={p.statusCode as StatusCode} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CompanyBadge company={p.company} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-bold text-slate-900">
                        {formatCurrencyCompact(p.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold text-emerald-700">
                        {formatCurrencyCompact(p.totalInvoiced)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold text-amber-700">
                        {formatCurrencyCompact(p.pendingToInvoice)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 w-20">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(p.wipStatus, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 w-7 shrink-0">{p.wipStatus}%</span>
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 whitespace-nowrap text-xs font-semibold',
                        p.margin >= 50 ? 'text-emerald-600' : p.margin >= 20 ? 'text-amber-600' : 'text-red-600')}>
                        {p.margin > 0 ? `${p.margin.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {p.acceptanceDate ? formatDate(p.acceptanceDate) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {p.endDate ? formatDate(p.endDate) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OPORTUNIDADES TAB */}
      {tab === 'oportunidades' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['ID', 'Oportunidad', 'Estado', 'Prob%', 'Importe', 'Ponderado', 'Cierre Esperado', 'Owner'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presales.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-slate-400 py-10 text-sm">Sin oportunidades abiertas</td></tr>
                ) : presales.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/projects/${o.id}`)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{o.id}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-700 line-clamp-2">{o.opportunity}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge statusCode={o.statusCode as StatusCode} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('text-xs font-bold',
                        o.probability >= 60 ? 'text-emerald-600' : o.probability >= 20 ? 'text-amber-600' : 'text-red-500')}>
                        {o.probability}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-bold text-slate-900">
                      {formatCurrencyCompact(o.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold text-blue-700">
                      {formatCurrencyCompact(o.weightedPipeline)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {o.expectedClosingDate ? formatDate(o.expectedClosingDate) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{o.owner}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TODO TAB */}
      {tab === 'todo' && (
        <div className="space-y-2">
          {opportunities.map(o => (
            <div key={o.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-amber-300 cursor-pointer transition-colors shadow-sm"
              onClick={() => router.push(`/projects/${o.id}`)}
            >
              <span className="text-xs font-mono text-slate-400 w-20 shrink-0">{o.id}</span>
              <StatusBadge statusCode={o.statusCode as StatusCode} size="sm" />
              <CompanyBadge company={o.company} size="sm" />
              <p className="flex-1 text-xs text-slate-700 line-clamp-1">{o.opportunity}</p>
              <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{formatCurrencyCompact(o.amount)}</span>
              <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(o.date)}</span>
            </div>
          ))}
          {opportunities.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">Sin registros para este cliente</div>
          )}
        </div>
      )}
    </div>
  );
}
