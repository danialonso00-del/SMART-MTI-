'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Download, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import StatusSelect from '@/components/ui/StatusSelect';
import CompanyBadge from '@/components/ui/CompanyBadge';
import PageHeader from '@/components/ui/PageHeader';
import EditOpportunityModal, { type EditableOpportunity } from '@/components/ui/EditOpportunityModal';
import { formatCurrencyCompact, formatDate, cn } from '@/lib/utils';
import type { StatusCode } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Opportunity {
  id: string;
  client: string;
  date: string;
  opportunity: string;
  description: string;
  amount: number;
  currency: string;
  statusCode: number;
  company: string;
  probability: number;
  weightedPipeline: number;
  owner: string;
  country: string;
  expectedClosingDate: string | null;
  blHardware: number;
  blIa: number;
  blBim: number;
  blTtioOm: number;
  blEvents: number;
  blProservices: number;
  acceptanceDate: string | null;
  margin: number;
  totalInvoiced: number;
  pendingToInvoice: number;
  wipStatus: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'all' | 'opportunities' | 'projects' | 'finished';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',          label: 'Todas' },
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'projects',     label: 'Proyectos' },
  { key: 'finished',     label: 'Finalizados / Perdidos' },
];

function matchesTab(statusCode: number, tab: TabKey): boolean {
  if (tab === 'all')           return true;
  if (tab === 'opportunities') return statusCode >= 2 && statusCode <= 5;
  if (tab === 'projects')      return statusCode === 6 || statusCode === 7;
  if (tab === 'finished')      return statusCode === 8 || statusCode === 9;
  return true;
}

// ---------------------------------------------------------------------------
// BL dots
// ---------------------------------------------------------------------------

const BL_DOTS = [
  { key: 'blHardware',  color: 'bg-amber-500',   title: 'Hardware' },
  { key: 'blIa',        color: 'bg-blue-500',    title: 'IA' },
  { key: 'blBim',       color: 'bg-violet-500',  title: 'BIM' },
  { key: 'blTtioOm',   color: 'bg-emerald-500', title: 'TTIO/O&M' },
  { key: 'blEvents',   color: 'bg-orange-500',  title: 'Eventos' },
  { key: 'blProservices', color: 'bg-teal-500', title: 'Pro Services' },
] as const;

function BlDots({ row }: { row: Opportunity }) {
  const active = BL_DOTS.filter(
    (bl) => (row[bl.key as keyof Opportunity] as number) > 0
  );
  if (active.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map((bl) => (
        <span
          key={bl.key}
          title={bl.title}
          className={cn('w-2 h-2 rounded-full inline-block shrink-0', bl.color)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Margin cell
// ---------------------------------------------------------------------------

function MarginCell({ margin }: { margin: number }) {
  const color =
    margin > 30
      ? 'text-emerald-600'
      : margin >= 10
      ? 'text-amber-600'
      : 'text-red-600';
  return (
    <span className={cn('font-medium tabular-nums', color)}>
      {margin > 0 ? `${Math.round(margin)}%` : '—'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Closing date cell
// ---------------------------------------------------------------------------

function ClosingDateCell({
  date,
  statusCode,
}: {
  date: string | null;
  statusCode: number;
}) {
  if (!date) return <span className="text-slate-300 text-xs">—</span>;
  const isPastDue = statusCode < 6 && new Date(date) < new Date();
  return (
    <span className={cn('text-xs', isPastDue ? 'text-red-500 font-medium' : 'text-slate-500')}>
      {formatDate(date)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-px">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-3 py-2.5 bg-white border-b border-slate-100">
          <div className="h-3 bg-slate-200 rounded w-16 shrink-0" />
          <div className="h-3 bg-slate-200 rounded flex-1" />
          <div className="h-3 bg-slate-200 rounded w-24 shrink-0" />
          <div className="h-3 bg-slate-200 rounded w-16 shrink-0" />
          <div className="h-3 bg-slate-200 rounded w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({ rows }: { rows: Opportunity[] }) {
  const count    = rows.length;
  const total    = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const invoiced = rows.reduce((s, r) => s + (r.totalInvoiced ?? 0), 0);
  const weighted = rows.reduce((s, r) => s + (r.weightedPipeline ?? 0), 0);

  const stat = (label: string, value: string, color = 'text-slate-900') => (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400 leading-none mb-0.5">{label}</span>
      <span className={cn('text-sm font-bold', color)}>{value}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-5 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm mb-4 flex-wrap">
      {stat('Registros', String(count))}
      <div className="w-px h-7 bg-slate-200" />
      {stat('Importe Total', formatCurrencyCompact(total))}
      <div className="w-px h-7 bg-slate-200" />
      {stat('Facturado', formatCurrencyCompact(invoiced), 'text-emerald-600')}
      <div className="w-px h-7 bg-slate-200" />
      {stat('Ponderado', formatCurrencyCompact(weighted), 'text-blue-600')}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export helper
// ---------------------------------------------------------------------------

function exportCsv(rows: Opportunity[]) {
  const headers = [
    'ID', 'Nombre', 'Cliente', 'Empresa', 'Estado', 'Owner',
    'Importe', 'Ponderado', 'Facturado', 'Pendiente', 'Margen%',
    'Hardware', 'IA', 'BIM', 'TTIO', 'Eventos', 'ProServices',
    'Fecha Cierre',
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id, r.opportunity, r.client, r.company, r.statusCode, r.owner,
        r.amount, r.weightedPipeline, r.totalInvoiced, r.pendingToInvoice,
        Math.round(r.margin),
        r.blHardware, r.blIa, r.blBim, r.blTtioOm, r.blEvents, r.blProservices,
        r.expectedClosingDate ?? '',
      ]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PipelinePage() {
  const router = useRouter();

  const [data, setData]       = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);

  function updateRowStatus(id: string, newCode: StatusCode) {
    setData(prev => prev.map(r => r.id === id ? { ...r, statusCode: newCode } : r));
  }

  const [activeTab, setActiveTab]       = useState<TabKey>('all');
  const [search, setSearch]             = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [ownerFilter, setOwnerFilter]   = useState('all');
  const [sortKey, setSortKey]           = useState<'id' | 'amount' | 'client' | 'none'>('id');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc');

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function parseId(id: string): [number, number] {
    const m = id.match(/^(\d+)-(\d+)/);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [0, 0];
  }

  // Fetch all records once
  useEffect(() => {
    setLoading(true);
    fetch('/api/opportunities?lite=true')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Opportunity[]) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar los datos.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique filter options derived from data
  const companies = useMemo(
    () => ['all', ...Array.from(new Set(data.map((r) => r.company))).sort()],
    [data]
  );
  const owners = useMemo(
    () => ['all', ...Array.from(new Set(data.map((r) => r.owner))).sort()],
    [data]
  );

  // Filtered + sorted rows
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = data.filter((r) => {
      if (!matchesTab(r.statusCode, activeTab)) return false;
      if (companyFilter !== 'all' && r.company !== companyFilter) return false;
      if (ownerFilter !== 'all' && r.owner !== ownerFilter) return false;
      if (q) {
        return (
          r.opportunity?.toLowerCase().includes(q) ||
          r.client?.toLowerCase().includes(q) ||
          r.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sortKey === 'none') return rows;
    return [...rows].sort((a, b) => {
      if (sortKey === 'id') {
        const [ay, an] = parseId(a.id);
        const [by, bn] = parseId(b.id);
        const yearDiff = sortDir === 'asc' ? ay - by : by - ay;
        if (yearDiff !== 0) return yearDiff;
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      let av: number | string, bv: number | string;
      if (sortKey === 'amount') { av = a.amount; bv = b.amount; }
      else { av = a.client; bv = b.client; }
      if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
  }, [data, activeTab, search, companyFilter, ownerFilter, sortKey, sortDir]);

  // Tab counts
  const tabCount = (key: TabKey) => data.filter((r) => matchesTab(r.statusCode, key)).length;

  return (
    <div className="pb-10">
      {editingOpp && (
        <EditOpportunityModal
          opportunity={editingOpp as EditableOpportunity}
          onClose={() => setEditingOpp(null)}
          onSaved={updated => {
            setData(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } as Opportunity : r));
            setEditingOpp(null);
          }}
        />
      )}
      {/* Header */}
      <PageHeader
        title="Vista General"
        subtitle="Todos los registros del pipeline comercial"
        actions={
          <>
            <button
              onClick={() => router.push('/opportunities/new')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm"
            >
              <Plus size={14} />
              Nueva Oportunidad
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'text-xs rounded-full px-1.5 py-px font-bold',
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              )}
            >
              {tabCount(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <SummaryBar rows={filtered} />

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar nombre, cliente, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 w-56"
          />
        </div>

        {/* Company */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg bg-white px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-600"
        >
          <option value="all">Todas las empresas</option>
          {companies.filter((c) => c !== 'all').map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Owner */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg bg-white px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-600"
        >
          <option value="all">Todos los owners</option>
          {owners.filter((o) => o !== 'all').map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={13} />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap w-24 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    ID
                    {sortKey === 'id'
                      ? (sortDir === 'asc' ? <ChevronUp size={11} className="text-amber-500" /> : <ChevronDown size={11} className="text-amber-500" />)
                      : <ChevronUp size={11} className="text-slate-300" />}
                  </div>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 min-w-[200px]">Nombre</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 min-w-[120px] cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">
                    Cliente
                    {sortKey === 'client'
                      ? (sortDir === 'asc' ? <ChevronUp size={11} className="text-amber-500" /> : <ChevronDown size={11} className="text-amber-500" />)
                      : <ChevronUp size={11} className="text-slate-300" />}
                  </div>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-20">Empresa</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-32">Estado</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-24">Owner</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-24 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Importe
                    {sortKey === 'amount'
                      ? (sortDir === 'asc' ? <ChevronUp size={11} className="text-amber-500" /> : <ChevronDown size={11} className="text-amber-500" />)
                      : <ChevronUp size={11} className="text-slate-300" />}
                  </div>
                </th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-24">Ponderado</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-24">Facturado</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-24">Pendiente</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-20">Margen</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-24">BLs</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-28">Fecha Cierre</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={13} className="p-0">
                    <TableSkeleton />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-slate-400">
                    <p className="text-sm font-medium text-red-500 mb-1">Error al cargar</p>
                    <p className="text-xs">{error}</p>
                  </td>
                </tr>
              )}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-slate-400">
                    <p className="text-sm font-medium mb-1">Sin resultados</p>
                    <p className="text-xs">Prueba a ajustar los filtros o la búsqueda.</p>
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filtered.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/projects/${row.id}`)}
                      className={cn(
                        'cursor-pointer border-b border-slate-100 last:border-0 transition-colors hover:bg-amber-50/60',
                        isEven ? 'bg-white' : 'bg-slate-50/50'
                      )}
                    >
                      {/* ID */}
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {row.id}
                      </td>

                      {/* Nombre */}
                      <td className="px-3 py-2 font-medium text-slate-800 max-w-[220px]">
                        <span
                          title={row.opportunity}
                          className="block truncate hover:text-amber-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${row.id}`);
                          }}
                        >
                          {row.opportunity?.length > 35
                            ? row.opportunity.slice(0, 35) + '…'
                            : row.opportunity}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-2 text-slate-500 max-w-[140px]">
                        <span className="block truncate" title={row.client}>
                          {row.client}
                        </span>
                      </td>

                      {/* Empresa */}
                      <td className="px-3 py-2">
                        <CompanyBadge company={row.company} size="sm" />
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-2">
                        <StatusSelect
                          id={row.id}
                          statusCode={row.statusCode as StatusCode}
                          size="sm"
                          onChange={(code) => updateRowStatus(row.id, code)}
                        />
                      </td>

                      {/* Owner */}
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {row.owner}
                      </td>

                      {/* Importe */}
                      <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrencyCompact(row.amount)}
                      </td>

                      {/* Ponderado */}
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {row.weightedPipeline > 0 ? (
                          <span className="text-blue-600 font-medium">
                            {formatCurrencyCompact(row.weightedPipeline)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Facturado */}
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {row.totalInvoiced > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {formatCurrencyCompact(row.totalInvoiced)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Pendiente */}
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {row.pendingToInvoice > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {formatCurrencyCompact(row.pendingToInvoice)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Margen */}
                      <td className="px-3 py-2 text-right">
                        <MarginCell margin={row.margin} />
                      </td>

                      {/* BLs */}
                      <td className="px-3 py-2">
                        <BlDots row={row} />
                      </td>

                      {/* Fecha Cierre */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <ClosingDateCell
                          date={row.expectedClosingDate}
                          statusCode={row.statusCode}
                        />
                      </td>
                      {/* Edit */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingOpp(row); }}
                          title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer row count */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== data.length && ` de ${data.length} totales`}
            </span>
            <span className="text-slate-300">
              Haz clic en una fila para abrir el detalle
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
