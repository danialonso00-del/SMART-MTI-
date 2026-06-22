'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutGrid, List, ChevronUp, ChevronDown, Zap, Pencil, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import StatusSelect from '@/components/ui/StatusSelect';
import CompanyBadge from '@/components/ui/CompanyBadge';
import PageHeader from '@/components/ui/PageHeader';
import EditOpportunityModal, { type EditableOpportunity } from '@/components/ui/EditOpportunityModal';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { StatusCode } from '@/lib/types';
import { formatCurrency, formatCurrencyCompact, formatDate, getCountryFlag, cn } from '@/lib/utils';

interface Project {
  id: string;
  client: string;
  opportunity: string;
  amount: number;
  currency: string;
  statusCode: number;
  company: string;
  owner: string;
  country: string;
  expectedClosingDate: string | null;
  endDate: string | null;
  totalInvoiced: number;
  pendingToInvoice: number;
  wipStatus: number;
  margin: number;
  peopleCost: number;
  materialCost: number;
  costs: number;
  blHardware: number;
  blIa: number;
  blBim: number;
  blTtioOm: number;
  blEvents: number;
  blProservices: number;
  // Budget aggregates from API
  budgetLineCount: number;
  budgetCostTotal: number;
  budgetSaleTotal: number;
}

const BL_COLORS: Record<string, string> = {
  blHardware:    'bg-amber-100 text-amber-700',
  blIa:          'bg-blue-100 text-blue-700',
  blBim:         'bg-violet-100 text-violet-700',
  blTtioOm:      'bg-emerald-100 text-emerald-700',
  blEvents:      'bg-orange-100 text-orange-700',
  blProservices: 'bg-teal-100 text-teal-700',
};

const BL_LABELS: Record<string, string> = {
  blHardware: 'HW', blIa: 'IA', blBim: 'BIM',
  blTtioOm: 'TTIO', blEvents: 'Events', blProservices: 'ProSvc',
};

type SortKey = 'id' | 'amount' | 'client' | 'none';

function parseProjectId(id: string): [number, number] {
  const m = id.match(/^(\d+)-(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [0, 0];
}

function SortTh({ label, sortKey, active, dir, onClick, right }: {
  label: string; sortKey: SortKey; active: boolean; dir: 'asc' | 'desc';
  onClick: () => void; right?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700 select-none',
        right ? 'text-right' : 'text-left'
      )}
    >
      <div className={cn('flex items-center gap-1', right && 'justify-end')}>
        {label}
        {active
          ? (dir === 'asc' ? <ChevronUp size={11} className="text-amber-500" /> : <ChevronDown size={11} className="text-amber-500" />)
          : <ChevronUp size={11} className="text-slate-300" />}
      </div>
    </th>
  );
}

function BlDots({ project }: { project: Project }) {
  const keys = ['blHardware','blIa','blBim','blTtioOm','blEvents','blProservices'] as const;
  const DOT_COLORS: Record<string, string> = {
    blHardware: 'bg-amber-500', blIa: 'bg-blue-500', blBim: 'bg-violet-500',
    blTtioOm: 'bg-emerald-500', blEvents: 'bg-orange-500', blProservices: 'bg-teal-500',
  };
  const active = keys.filter(k => (project[k] ?? 0) > 0);
  if (active.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1">
      {active.map(k => (
        <span key={k} title={BL_LABELS[k]} className={cn('w-2 h-2 rounded-full inline-block', DOT_COLORS[k])} />
      ))}
    </div>
  );
}

function MarginBadge({ project }: { project: Project }) {
  const totalCosts = (project.peopleCost ?? 0) + (project.materialCost ?? 0) + (project.costs ?? 0);
  const realMargin   = (totalCosts > 0 && project.amount > 0) ? ((project.amount - totalCosts) / project.amount) * 100 : null;
  const budgetMargin = (project.budgetSaleTotal > 0) ? ((project.budgetSaleTotal - project.budgetCostTotal) / project.budgetSaleTotal) * 100 : null;

  if (realMargin === null && budgetMargin === null) return <span className="text-slate-300 text-xs">—</span>;

  const realColor = realMargin === null ? '' : realMargin > 30 ? 'text-emerald-600' : realMargin >= 10 ? 'text-amber-600' : 'text-red-600';
  const budgetColor = budgetMargin === null ? '' : budgetMargin > 30 ? 'text-emerald-600' : budgetMargin >= 10 ? 'text-amber-600' : 'text-red-600';
  const delta = (realMargin !== null && budgetMargin !== null) ? realMargin - budgetMargin : null;

  return (
    <div className="flex flex-col gap-0.5">
      {budgetMargin !== null && (
        <span className={cn('text-xs tabular-nums', budgetColor)} title="Margen esperado (presupuesto)">
          {budgetMargin.toFixed(1)}% <span className="text-slate-400 font-normal">esp.</span>
        </span>
      )}
      {realMargin !== null && (
        <span className={cn('text-xs font-bold tabular-nums', realColor)} title="Margen real (costes)">
          {realMargin.toFixed(1)}%
          {delta !== null && (
            <span className={cn('ml-1 font-normal text-xs', delta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              ({delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp)
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick, onEdit, onDelete }: { project: Project; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const totalCosts = (project.peopleCost ?? 0) + (project.materialCost ?? 0) + (project.costs ?? 0);
  const hasCosts = totalCosts > 0;
  const margin = hasCosts && project.amount > 0 ? ((project.amount - totalCosts) / project.amount) * 100 : null;
  const marginColor = margin === null ? '' : margin >= 30 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-600' : 'text-red-600';
  const invoicedPct = project.amount > 0 ? (project.totalInvoiced / project.amount) * 100 : 0;

  const blKeys = ['blHardware','blIa','blBim','blTtioOm','blEvents','blProservices'] as const;
  const activeKeys = blKeys.filter(k => (project[k] ?? 0) > 0);

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400 font-semibold">{project.id}</span>
            <CompanyBadge company={project.company} size="sm" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{project.opportunity}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge statusCode={project.statusCode as StatusCode} size="sm" />
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Editar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">{getCountryFlag(project.country)}</span>
        <span className="text-xs font-semibold text-slate-700">{project.client}</span>
        <span className="text-xs text-slate-400">· {project.country}</span>
      </div>

      {activeKeys.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {activeKeys.map(k => (
            <span key={k} className={cn('text-xs px-2 py-0.5 rounded-full font-medium', BL_COLORS[k])}>
              {BL_LABELS[k]}
            </span>
          ))}
        </div>
      )}

      {/* WIP progress */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Progreso WIP</span>
          <span className="text-xs font-bold text-slate-700">{project.wipStatus}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', project.statusCode === 8 ? 'bg-slate-400' : 'bg-teal-500')}
            style={{ width: `${Math.min(project.wipStatus, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
          <p className="text-xs text-slate-400 mb-0.5">Importe</p>
          <p className="text-xs font-bold text-slate-900" title={formatCurrency(project.amount, project.currency)}>{formatCurrencyCompact(project.amount)}</p>
        </div>
        <div className="text-center bg-emerald-50 rounded-xl py-2 px-1">
          <p className="text-xs text-emerald-500 mb-0.5">Facturado</p>
          <p className="text-xs font-bold text-emerald-700" title={formatCurrency(project.totalInvoiced, project.currency)}>{formatCurrencyCompact(project.totalInvoiced)}</p>
        </div>
        <div className="text-center bg-amber-50 rounded-xl py-2 px-1">
          <p className="text-xs text-amber-500 mb-0.5">Pendiente</p>
          <p className="text-xs font-bold text-amber-700" title={formatCurrency(project.pendingToInvoice, project.currency)}>{formatCurrencyCompact(project.pendingToInvoice)}</p>
        </div>
      </div>

      {/* Margin analysis row — shows when budget exists */}
      {project.budgetLineCount > 0 && (() => {
        const budgetMargin = project.budgetSaleTotal > 0
          ? ((project.budgetSaleTotal - project.budgetCostTotal) / project.budgetSaleTotal) * 100
          : null;
        const totalCostsLocal = (project.peopleCost ?? 0) + (project.materialCost ?? 0) + (project.costs ?? 0);
        const realMargin = totalCostsLocal > 0 && project.amount > 0
          ? ((project.amount - totalCostsLocal) / project.amount) * 100
          : null;
        const delta = budgetMargin !== null && realMargin !== null ? realMargin - budgetMargin : null;
        return (
          <div className="mb-3 bg-slate-50 rounded-xl px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Margen esperado</span>
              <span className={cn('font-semibold', budgetMargin !== null && budgetMargin >= 20 ? 'text-blue-600' : 'text-amber-600')}>
                {budgetMargin !== null ? `${budgetMargin.toFixed(1)}%` : '—'}
              </span>
            </div>
            {realMargin !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Margen real</span>
                <span className={cn('font-bold', realMargin >= 30 ? 'text-emerald-600' : realMargin >= 10 ? 'text-amber-600' : 'text-red-600')}>
                  {realMargin.toFixed(1)}%
                  {delta !== null && (
                    <span className={cn('ml-1 font-normal', delta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      ({delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-700">{project.owner.charAt(0)}</span>
          </div>
          <span className="text-xs text-slate-500">{project.owner}</span>
        </div>
        <div className="flex items-center gap-2">
          {margin !== null ? (
            <span className={cn('text-xs font-bold', marginColor)}>
              Margen: {margin.toFixed(1)}%
            </span>
          ) : (
            <span className="text-xs text-slate-300">Sin coste</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();

  const [data, setData]       = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusCode | 'all'>('all');
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');
  const [sortKey, setSortKey]           = useState<SortKey>('id');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc');
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState('');

  function loadProjects() {
    setLoading(true);
    setError(null);
    fetch('/api/opportunities?lite=true')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((all: Project[]) => {
        setData(all.filter(o => [6, 7, 8].includes(o.statusCode)));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { loadProjects(); }, []);

  async function handleSync() {
    if (filtered.length === 0) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const start = '2025-01-01';
      const end   = new Date().toISOString().slice(0, 10);
      const res   = await fetch('/api/integrations/factorial/sync-project-costs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ startDate: start, endDate: end, projectIds: filtered.map(p => p.id) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error en sync');
      setSyncMsg(`${result.timeEntriesUpserted} registros · ${result.projectsProcessed} proyectos · ${result.warnings?.length ?? 0} avisos`);
      loadProjects();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Error en sync');
    } finally {
      setSyncing(false);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = data.filter(p => {
      if (statusFilter !== 'all' && p.statusCode !== statusFilter) return false;
      if (q) return p.opportunity.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === 'id') {
        const [ay, an] = parseProjectId(a.id);
        const [by, bn] = parseProjectId(b.id);
        const yd = sortDir === 'asc' ? ay - by : by - ay;
        return yd !== 0 ? yd : (sortDir === 'asc' ? an - bn : bn - an);
      }
      if (sortKey === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortKey === 'client') {
        return sortDir === 'asc' ? a.client.localeCompare(b.client) : b.client.localeCompare(a.client);
      }
      return 0;
    });

    return rows;
  }, [data, search, statusFilter, sortKey, sortDir]);

  const totalAmount   = filtered.reduce((s, p) => s + p.amount, 0);
  const totalInvoiced = filtered.reduce((s, p) => s + p.totalInvoiced, 0);
  const totalPending  = filtered.reduce((s, p) => s + p.pendingToInvoice, 0);

  const statusCounts = (code: StatusCode | 'all') =>
    code === 'all' ? data.length : data.filter(p => p.statusCode === code).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Error al eliminar');
    }
    setData(prev => prev.filter(p => p.id !== id));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4 pb-8">
      {editingProj && (
        <EditOpportunityModal
          opportunity={editingProj as unknown as EditableOpportunity}
          onClose={() => setEditingProj(null)}
          onSaved={updated => {
            setData(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } as Project : p));
            setEditingProj(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          id={deleteTarget.id}
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      <PageHeader
        title="Proyectos"
        subtitle="Proyectos ganados, en entrega y finalizados"
        badge={`${filtered.length} proyectos`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-60"
            >
              <Zap size={13} className={syncing ? 'animate-pulse' : ''} />
              {syncing ? 'Sincronizando...' : `Sincronizar costes (${filtered.length})`}
            </button>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-600')}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')}
                className={cn('p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-600')}>
                <List size={16} />
              </button>
            </div>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {syncMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 flex items-center gap-2">
          <Zap size={13} className="text-emerald-500 shrink-0" />
          Sync completado — {syncMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([['all','Todos'],[6,'Ganado'],[7,'Delivering'],[8,'Finalizado']] as const).map(([val, label]) => (
            <button
              key={String(val)}
              onClick={() => setStatusFilter(val as StatusCode | 'all')}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-xl border transition-colors',
                statusFilter === val
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {label} ({statusCounts(val as StatusCode | 'all')})
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400">Importe Total</p>
          <p className="text-lg font-bold text-slate-900" title={formatCurrency(totalAmount)}>{formatCurrencyCompact(totalAmount)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-600">Total Facturado</p>
          <p className="text-lg font-bold text-emerald-800" title={formatCurrency(totalInvoiced)}>{formatCurrencyCompact(totalInvoiced)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-600">Pendiente Facturar</p>
          <p className="text-lg font-bold text-amber-800" title={formatCurrency(totalPending)}>{formatCurrencyCompact(totalPending)}</p>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${encodeURIComponent(project.id)}`)}
              onEdit={() => setEditingProj(project)}
              onDelete={() => setDeleteTarget({ id: project.id, name: project.opportunity })}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-3 text-center py-16 text-slate-400">No se encontraron proyectos</div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <SortTh label="ID"       sortKey="id"     active={sortKey==='id'}     dir={sortDir} onClick={() => handleSort('id')} />
                  <SortTh label="Proyecto" sortKey="none"   active={false}               dir={sortDir} onClick={() => {}} />
                  <SortTh label="Cliente"  sortKey="client" active={sortKey==='client'} dir={sortDir} onClick={() => handleSort('client')} />
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Empresa</th>
                  <SortTh label="Importe"  sortKey="amount" active={sortKey==='amount'} dir={sortDir} onClick={() => handleSort('amount')} right />
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Facturado</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Pendiente</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Margen</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">BLs</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Owner</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Fecha Fin</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center text-slate-400 py-12 text-sm">No se encontraron proyectos</td>
                  </tr>
                ) : filtered.map((project, idx) => (
                  <tr
                    key={project.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-amber-50/60 border-b border-slate-100 last:border-0',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    )}
                    onClick={() => router.push(`/projects/${encodeURIComponent(project.id)}`)}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold text-slate-400">{project.id}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px]">
                      <p className="text-xs font-medium text-slate-800 truncate">{project.opportunity}</p>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{getCountryFlag(project.country)}</span>
                        <span className="text-xs text-slate-700">{project.client}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge statusCode={project.statusCode as StatusCode} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <CompanyBadge company={project.company} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-slate-900" title={formatCurrency(project.amount, project.currency)}>
                      {formatCurrencyCompact(project.amount)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-semibold text-emerald-600" title={project.totalInvoiced > 0 ? formatCurrency(project.totalInvoiced, project.currency) : undefined}>
                      {project.totalInvoiced > 0 ? formatCurrencyCompact(project.totalInvoiced) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-semibold text-amber-600" title={project.pendingToInvoice > 0 ? formatCurrency(project.pendingToInvoice, project.currency) : undefined}>
                      {project.pendingToInvoice > 0 ? formatCurrencyCompact(project.pendingToInvoice) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <MarginBadge project={project} />
                    </td>
                    <td className="px-4 py-2.5">
                      <BlDots project={project} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{project.owner}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">
                      {project.endDate ? formatDate(project.endDate) : '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingProj(project); }}
                          title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.opportunity }); }}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} proyectos</p>
            <span className="text-xs text-slate-400">Total: <span className="font-bold text-slate-800" title={formatCurrency(totalAmount)}>{formatCurrencyCompact(totalAmount)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
