'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Building2, Users, Clock, Euro, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceEntry {
  id: string;
  client: string;
  opportunity: string;
  company: string;
  owner: string;
  statusCode: number;
  serviceType: 'internal' | 'external';
  acceptanceDate: string | null;
  totalHours: number;
  totalPeopleCost: number;
  lastSyncedAt: string | null;
}

interface ServicesData {
  internal: ServiceEntry[];
  external: ServiceEntry[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtHours(h: number) { return h > 0 ? `${fmt(h)} h` : '—'; }
function fmtCost(c: number)  { return c > 0 ? `${fmt(c)} €` : '—'; }

function ServiceTable({ entries, title, icon: Icon, accentColor }: {
  entries: ServiceEntry[];
  title: string;
  icon: React.ElementType;
  accentColor: string;
}) {
  const [open, setOpen] = useState(true);
  const totalHours = entries.reduce((s, e) => s + e.totalHours, 0);
  const totalCost  = entries.reduce((s, e) => s + e.totalPeopleCost, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white', accentColor)}>
            <Icon size={16} />
          </div>
          <span className="text-slate-800 font-semibold text-sm">{title}</span>
          <span className="text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-full">{entries.length}</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          {totalHours > 0 && (
            <span><span className="font-semibold text-slate-700">{fmtHours(totalHours)}</span> imputadas</span>
          )}
          {totalCost > 0 && (
            <span><span className="font-semibold text-slate-700">{fmtCost(totalCost)}</span> coste personas</span>
          )}
          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 font-semibold text-slate-500 whitespace-nowrap w-24">ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Empresa / Dpto</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 min-w-[200px]">Descripción</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-32">Responsable</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 w-28">Horas</th>
                  <th className="text-right px-5 py-2.5 font-semibold text-slate-500 w-32">Coste personas</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr
                    key={e.id}
                    className={cn(
                      'border-b border-slate-50 last:border-0 hover:bg-amber-50/40 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    )}
                  >
                    <td className="px-5 py-2.5 font-mono text-[11px] text-amber-600 whitespace-nowrap">{e.id}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{e.client}</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate" title={e.opportunity}>
                      {e.opportunity.replace(/^(INT|EXT)\s+/i, '')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{e.owner || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {e.totalHours > 0
                        ? <span className="font-medium text-blue-600">{fmtHours(e.totalHours)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">
                      {e.totalPeopleCost > 0
                        ? <span className="font-medium text-emerald-600">{fmtCost(e.totalPeopleCost)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 1 && (totalHours > 0 || totalCost > 0) && (
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-blue-600 tabular-nums">
                      {totalHours > 0 ? fmtHours(totalHours) : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                      {totalCost > 0 ? fmtCost(totalCost) : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/services');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const allEntries = [...(data?.internal ?? []), ...(data?.external ?? [])];
  const totalHours = allEntries.reduce((s, e) => s + e.totalHours, 0);
  const totalCost  = allEntries.reduce((s, e) => s + e.totalPeopleCost, 0);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Servicios"
        subtitle="Centros de coste internos y empresas externas — imputación de horas vía Factorial"
        actions={
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Centros internos',    value: data?.internal.length, suffix: '' },
          { label: 'Empresas externas',   value: data?.external.length, suffix: '' },
          { label: 'Total horas imputadas', value: totalHours > 0 ? fmt(totalHours) : null, suffix: ' h', icon: Clock },
          { label: 'Coste total personas',  value: totalCost  > 0 ? fmt(totalCost)  : null, suffix: ' €', icon: Euro },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
              {kpi.icon && <kpi.icon size={12} />}
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {kpi.value != null ? `${kpi.value}${kpi.suffix}` : '—'}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-4">
          <ServiceTable
            entries={data.internal}
            title="Centros de coste internos MTI"
            icon={Users}
            accentColor="bg-blue-600"
          />
          <ServiceTable
            entries={data.external}
            title="Empresas externas del grupo"
            icon={Building2}
            accentColor="bg-violet-600"
          />
        </div>
      )}

      <p className="text-slate-400 text-xs text-center">
        Las horas y costes se sincronizan desde Factorial · Los servicios INT/EXT no aparecen en el pipeline comercial
      </p>
    </div>
  );
}
