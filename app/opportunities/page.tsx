'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, Download, ChevronUp, ChevronDown, X, LayoutList, Kanban, Pencil } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import StatusSelect from '@/components/ui/StatusSelect';
import CompanyBadge from '@/components/ui/CompanyBadge';
import PageHeader from '@/components/ui/PageHeader';
import EditOpportunityModal, { type EditableOpportunity } from '@/components/ui/EditOpportunityModal';
import { StatusCode } from '@/lib/types';
import { formatCurrencyCompact, formatDate, getCountryFlag, cn } from '@/lib/utils';

interface Opportunity {
  id: string;
  client: string;
  date: string;
  opportunity: string;
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
  totalInvoiced: number;
  pendingToInvoice: number;
  acceptanceDate: string | null;
  margin: number;
}

const STATUS_MAP: Record<number, { label: string }> = {
  2: { label: 'Oportunidad' },
  3: { label: 'Req. Gathering' },
  4: { label: 'Sol. Definition' },
  5: { label: 'Contract Neg.' },
  6: { label: 'Won' },
  7: { label: 'Delivering' },
  8: { label: 'Finished' },
  9: { label: 'Lost' },
};

const PRESALE_STATUSES: number[] = [2, 3, 4, 5];

const BL_COLORS: Record<string, string> = {
  blHardware:    'bg-amber-400',
  blIa:          'bg-blue-500',
  blBim:         'bg-violet-500',
  blTtioOm:      'bg-emerald-500',
  blEvents:      'bg-orange-500',
  blProservices: 'bg-teal-500',
};
const BL_KEYS = ['blHardware', 'blIa', 'blBim', 'blTtioOm', 'blEvents', 'blProservices'] as const;

type SortKey = 'client' | 'amount' | 'probability' | 'expectedClosingDate' | 'weightedPipeline';
type SortDir = 'asc' | 'desc';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [data, setData] = useState<Opportunity[]>([]);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    fetch('/api/opportunities?lite=true')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const baseData = useMemo(() => data.filter(o => PRESALE_STATUSES.includes(o.statusCode)), [data]);
  const owners    = useMemo(() => Array.from(new Set(baseData.map(o => o.owner))).sort(), [baseData]);
  const countries = useMemo(() => Array.from(new Set(baseData.map(o => o.country))).sort(), [baseData]);
  const companies = useMemo(() => Array.from(new Set(baseData.map(o => o.company))).sort(), [baseData]);

  const filtered = useMemo(() => {
    let d = [...baseData];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(o =>
        o.client.toLowerCase().includes(q) ||
        o.opportunity.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.owner.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') d = d.filter(o => o.statusCode === statusFilter);
    if (companyFilter !== 'all') d = d.filter(o => o.company === companyFilter);
    if (ownerFilter !== 'all')   d = d.filter(o => o.owner === ownerFilter);
    if (countryFilter !== 'all') d = d.filter(o => o.country === countryFilter);
    d.sort((a, b) => {
      const av = a[sortKey] as string | number | null;
      const bv = b[sortKey] as string | number | null;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
    return d;
  }, [baseData, search, statusFilter, companyFilter, ownerFilter, countryFilter, sortKey, sortDir]);

  const totalAmount   = filtered.reduce((s, o) => s + o.amount, 0);
  const totalWeighted = filtered.reduce((s, o) => s + o.weightedPipeline, 0);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-amber-500" />
      : <ChevronDown size={12} className="text-amber-500" />;
  }

  function resetFilters() {
    setSearch(''); setStatusFilter('all'); setCompanyFilter('all');
    setOwnerFilter('all'); setCountryFilter('all');
  }

  const hasFilters = !!(search || statusFilter !== 'all' || companyFilter !== 'all' || ownerFilter !== 'all' || countryFilter !== 'all');
  const today = new Date();

  const kanbanGroups = PRESALE_STATUSES.map(code => ({
    code,
    label: STATUS_MAP[code].label,
    items: filtered.filter(o => o.statusCode === code),
  }));

  return (
    <div className="space-y-4 pb-8">
      {editingOpp && (
        <EditOpportunityModal
          opportunity={editingOpp as EditableOpportunity}
          onClose={() => setEditingOpp(null)}
          onSaved={updated => {
            setData(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            setEditingOpp(null);
          }}
        />
      )}
      <PageHeader
        title="Oportunidades"
        subtitle="Pipeline comercial activo (Status 2-5)"
        badge={loading ? '...' : `${filtered.length} registros`}
        actions={
          <>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700')}
              >
                <LayoutList size={13} /> Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  viewMode === 'kanban' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700')}
              >
                <Kanban size={13} /> Kanban
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Download size={16} /> Exportar
            </button>
            <button
              onClick={() => router.push('/opportunities/new')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} /> Nueva Oportunidad
            </button>
          </>
        }
      />

      {/* Search + filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, oportunidad, ID u owner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors',
              showFilters || hasFilters
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            )}
          >
            <Filter size={15} /> Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select value={statusFilter}
                onChange={e => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="all">Todos</option>
                {PRESALE_STATUSES.map(code => (
                  <option key={code} value={code}>{STATUS_MAP[code].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Empresa</label>
              <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="all">Todas</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Owner</label>
              <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="all">Todos</option>
                {owners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">País</label>
              <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="all">Todos</option>
                {countries.map(c => <option key={c} value={c}>{getCountryFlag(c)} {c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
        <div>
          <p className="text-xs text-amber-600">Registros filtrados</p>
          <p className="text-sm font-bold text-amber-900">{filtered.length}</p>
        </div>
        <div className="w-px h-6 bg-amber-200" />
        <div>
          <p className="text-xs text-amber-600">Importe Total</p>
          <p className="text-sm font-bold text-amber-900">{formatCurrencyCompact(totalAmount)}</p>
        </div>
        <div className="w-px h-6 bg-amber-200" />
        <div>
          <p className="text-xs text-amber-600">Pipeline Ponderado</p>
          <p className="text-sm font-bold text-blue-700">{formatCurrencyCompact(totalWeighted)}</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="animate-pulse space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {!loading && viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">ID</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort('client')}>
                    <div className="flex items-center gap-1">Cliente <SortIcon k="client" /></div>
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Nombre</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1">Importe <SortIcon k="amount" /></div>
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort('probability')}>
                    <div className="flex items-center justify-end gap-1">Prob% <SortIcon k="probability" /></div>
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort('weightedPipeline')}>
                    <div className="flex items-center justify-end gap-1">Ponderado <SortIcon k="weightedPipeline" /></div>
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Owner</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">Empresa</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort('expectedClosingDate')}>
                    <div className="flex items-center gap-1">Cierre <SortIcon k="expectedClosingDate" /></div>
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">BL</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-slate-400 py-12 text-sm">
                      No se encontraron oportunidades
                    </td>
                  </tr>
                ) : filtered.map(opp => {
                  const closingDate = opp.expectedClosingDate ? new Date(opp.expectedClosingDate) : null;
                  const isPastDue = closingDate && closingDate < today;
                  const activeBL = BL_KEYS.filter(k => opp[k] > 0);
                  return (
                    <tr
                      key={opp.id}
                      className="hover:bg-amber-50/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/projects/${opp.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {opp.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{getCountryFlag(opp.country)}</span>
                          <span className="text-xs font-semibold text-slate-800">{opp.client}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-slate-600 truncate" title={opp.opportunity}>
                          {opp.opportunity}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(opp.amount)}</span>
                        {opp.currency === 'USD' && <span className="ml-1 text-xs text-slate-400">USD</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                        <StatusSelect
                          id={opp.id}
                          statusCode={opp.statusCode as StatusCode}
                          size="sm"
                          onChange={newCode => setData(prev => prev.map(o => o.id === opp.id ? { ...o, statusCode: newCode } : o))}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full',
                              opp.probability >= 60 ? 'bg-emerald-500' : opp.probability >= 20 ? 'bg-amber-500' : 'bg-red-400'
                            )} style={{ width: `${opp.probability}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold w-7',
                            opp.probability >= 60 ? 'text-emerald-600' : opp.probability >= 20 ? 'text-amber-600' : 'text-red-500')}>
                            {opp.probability}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-semibold text-blue-700">{formatCurrencyCompact(opp.weightedPipeline)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{opp.owner}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CompanyBadge company={opp.company} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('text-xs', isPastDue ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                          {opp.expectedClosingDate ? formatDate(opp.expectedClosingDate) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {activeBL.map(k => (
                            <span key={k} className={cn('w-2.5 h-2.5 rounded-full', BL_COLORS[k])} title={k} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingOpp(opp); }}
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
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs text-slate-500">
              Mostrando {filtered.length} de {baseData.length} oportunidades
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Total:</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrencyCompact(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {!loading && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanGroups.map(group => (
            <div key={group.code} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
                <StatusBadge statusCode={group.code as StatusCode} size="sm" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{group.items.length}</span>
                  <span className="text-xs font-bold text-slate-700">{formatCurrencyCompact(group.items.reduce((s, o) => s + o.amount, 0))}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                {group.items.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sin oportunidades</p>
                ) : group.items.map(opp => (
                  <div
                    key={opp.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 hover:border-amber-300 hover:shadow-sm cursor-pointer transition-all"
                    onClick={() => router.push(`/projects/${opp.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{opp.id}</span>
                      <div className="flex items-center gap-1">
                        <CompanyBadge company={opp.company} size="sm" />
                        <button
                          onClick={e => { e.stopPropagation(); setEditingOpp(opp); }}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 mb-2">{opp.opportunity}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{getCountryFlag(opp.country)} {opp.client}</span>
                      <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(opp.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={cn('text-xs font-semibold',
                        opp.probability >= 60 ? 'text-emerald-600' : opp.probability >= 20 ? 'text-amber-600' : 'text-red-500')}>
                        {opp.probability}%
                      </span>
                      {opp.expectedClosingDate && (
                        <span className={cn('text-xs',
                          new Date(opp.expectedClosingDate) < today ? 'text-red-500' : 'text-slate-400')}>
                          {formatDate(opp.expectedClosingDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
