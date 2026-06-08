'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Search, Users, Globe, TrendingUp, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrencyCompact, getCountryFlag, cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  country: string;
  primaryOwner: string;
  lastActivity: string | null;
  totalAmount: number;
  totalInvoiced: number;
  pendingToInvoice: number;
  projectsCount: number;
  opportunitiesCount: number;
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

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const invoicedPct = client.totalAmount > 0 ? (client.totalInvoiced / client.totalAmount) * 100 : 0;

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20 shrink-0">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">{client.name}</h3>
            <ArrowUpRight size={14} className="text-slate-300 shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span>{getCountryFlag(client.country)}</span>
            <span className="text-xs text-slate-500">{client.country}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-50 rounded-xl py-2 px-3 text-center">
          <p className="text-xs text-slate-400">Oportunidades</p>
          <p className="text-lg font-bold text-slate-900">{client.opportunitiesCount}</p>
        </div>
        <div className="bg-slate-50 rounded-xl py-2 px-3 text-center">
          <p className="text-xs text-slate-400">Proyectos</p>
          <p className="text-lg font-bold text-slate-900">{client.projectsCount}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Importe Total</span>
          <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(client.totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Facturado</span>
          <span className="text-xs font-semibold text-emerald-600">{formatCurrencyCompact(client.totalInvoiced)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Pendiente</span>
          <span className="text-xs font-semibold text-amber-600">{formatCurrencyCompact(client.pendingToInvoice)}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Facturación</span>
          <span className="text-xs font-bold text-slate-600">{invoicedPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(invoicedPct, 100)}%` }} />
        </div>
      </div>

      {client.primaryOwner && (
        <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-700">{client.primaryOwner.charAt(0)}</span>
          </div>
          <span className="text-xs text-slate-500">{client.primaryOwner}</span>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'name' | 'invoiced' | 'projects'>('amount');
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let data = [...clients];
    if (!showEmpty) data = data.filter(c => c.totalAmount > 0 || c.projectsCount > 0 || c.opportunitiesCount > 0);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      if (sortBy === 'amount')   return b.totalAmount - a.totalAmount;
      if (sortBy === 'invoiced') return b.totalInvoiced - a.totalInvoiced;
      if (sortBy === 'projects') return (b.projectsCount + b.opportunitiesCount) - (a.projectsCount + a.opportunitiesCount);
      return a.name.localeCompare(b.name);
    });
    return data;
  }, [clients, search, sortBy, showEmpty]);

  const totalClients  = filtered.length;
  const totalAmount   = clients.reduce((s, c) => s + c.totalAmount, 0);
  const totalInvoiced = clients.reduce((s, c) => s + c.totalInvoiced, 0);
  const countries     = Array.from(new Set(clients.map(c => c.country))).length;

  const chartData = [...clients]
    .filter(c => c.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 16 ? c.name.slice(0, 14) + '…' : c.name,
      amount: c.totalAmount,
      invoiced: c.totalInvoiced,
    }));

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Clientes"
        subtitle="Gestión y análisis de cartera de clientes"
        badge={loading ? '...' : `${totalClients} clientes`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Clientes</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '…' : clients.filter(c => c.totalAmount > 0 || c.projectsCount > 0 || c.opportunitiesCount > 0).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Globe size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Países</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '…' : countries}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Facturación Total</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : formatCurrencyCompact(totalInvoiced)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-violet-500">
          <div>
            <p className="text-xs text-slate-400">Pipeline Total</p>
            <p className="text-xl font-bold text-slate-900">{loading ? '…' : formatCurrencyCompact(totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Top clients chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top 10 Clientes por Importe</h3>
            <p className="text-xs text-slate-400 mt-0.5">Pipeline total y facturado</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrencyCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Pipeline" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="invoiced" name="Facturado" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {([
            ['amount',   'Mayor importe'],
            ['projects', 'Más activo'],
            ['invoiced', 'Más facturado'],
            ['name',     'Nombre'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                sortBy === val ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowEmpty(!showEmpty)}
          className={cn(
            'px-3 py-2 text-xs font-medium rounded-xl border transition-colors',
            showEmpty ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          )}
        >
          {showEmpty ? 'Ocultar sin actividad' : 'Ver todos'}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded" />
                <div className="h-2 bg-slate-100 rounded" />
                <div className="h-2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => router.push(`/clients/${encodeURIComponent(client.name)}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
