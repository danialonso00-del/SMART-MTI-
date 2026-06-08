'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Globe, TrendingUp, Building2, MapPin, ArrowUpRight,
  Activity, DollarSign, ChevronDown,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrencyCompact, cn } from '@/lib/utils';

// ─── Dynamic map import (no SSR) ─────────────────────────────────────────────

const WorldMap = dynamic(() => import('@/components/ui/WorldMapChart'), { ssr: false, loading: () => (
  <div className="h-[420px] flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
    <Globe size={32} className="text-slate-300" />
  </div>
) });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string; amount: number; country: string;
  statusCode: number; totalInvoiced: number;
  weightedPipeline: number; company: string; client: string;
}

interface CountryStat {
  country: string;
  pipeline: number;
  weighted: number;
  accepted: number;
  invoiced: number;
  count: number;
  clients: number;
  flag: string;
}

// ─── Country helpers ──────────────────────────────────────────────────────────

// Map from DB country names → flag emoji
const COUNTRY_FLAGS: Record<string, string> = {
  Spain: '🇪🇸', France: '🇫🇷', Germany: '🇩🇪', Italy: '🇮🇹', Portugal: '🇵🇹',
  'United Kingdom': '🇬🇧', UK: '🇬🇧', Netherlands: '🇳🇱', Belgium: '🇧🇪',
  'Saudi Arabia': '🇸🇦', KSA: '🇸🇦', UAE: '🇦🇪', 'United Arab Emirates': '🇦🇪',
  Qatar: '🇶🇦', Bahrain: '🇧🇭', Kuwait: '🇰🇼', Oman: '🇴🇲', Jordan: '🇯🇴',
  Morocco: '🇲🇦', Algeria: '🇩🇿', Tunisia: '🇹🇳', Egypt: '🇪🇬', Lebanon: '🇱🇧',
  Turkey: '🇹🇷', USA: '🇺🇸', 'United States': '🇺🇸', Mexico: '🇲🇽',
  Colombia: '🇨🇴', Chile: '🇨🇱', Argentina: '🇦🇷', Brazil: '🇧🇷',
  China: '🇨🇳', Japan: '🇯🇵', India: '🇮🇳', Singapore: '🇸🇬',
  Australia: '🇦🇺', Switzerland: '🇨🇭', Sweden: '🇸🇪', Norway: '🇳🇴',
  Poland: '🇵🇱', Romania: '🇷🇴', Greece: '🇬🇷', Croatia: '🇭🇷',
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? '🌍';
}

// Regions for grouping
const REGION_MAP: Record<string, string> = {
  Spain: 'Europa', France: 'Europa', Germany: 'Europa', Italy: 'Europa',
  Portugal: 'Europa', 'United Kingdom': 'Europa', UK: 'Europa',
  Netherlands: 'Europa', Belgium: 'Europa', Switzerland: 'Europa',
  Sweden: 'Europa', Norway: 'Europa', Poland: 'Europa', Romania: 'Europa',
  Greece: 'Europa', Croatia: 'Europa',
  'Saudi Arabia': 'Oriente Medio', KSA: 'Oriente Medio',
  UAE: 'Oriente Medio', 'United Arab Emirates': 'Oriente Medio',
  Qatar: 'Oriente Medio', Bahrain: 'Oriente Medio', Kuwait: 'Oriente Medio',
  Oman: 'Oriente Medio', Jordan: 'Oriente Medio', Lebanon: 'Oriente Medio',
  Turkey: 'Oriente Medio',
  Morocco: 'África', Algeria: 'África', Tunisia: 'África', Egypt: 'África',
  USA: 'América', 'United States': 'América', Mexico: 'América',
  Colombia: 'América', Chile: 'América', Argentina: 'América', Brazil: 'América',
  China: 'Asia-Pacífico', Japan: 'Asia-Pacífico', India: 'Asia-Pacífico',
  Singapore: 'Asia-Pacífico', Australia: 'Asia-Pacífico',
};

function getRegion(country: string): string {
  return REGION_MAP[country] ?? 'Otros';
}

const REGION_COLORS: Record<string, string> = {
  Europa: '#f59e0b', 'Oriente Medio': '#3b82f6', África: '#10b981',
  América: '#8b5cf6', 'Asia-Pacífico': '#f97316', Otros: '#94a3b8',
};

const AMOUNT_SCALE = ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'];

function amountColor(amount: number, max: number): string {
  if (max === 0 || amount === 0) return '#f1f5f9';
  const idx = Math.min(Math.floor((amount / max) * (AMOUNT_SCALE.length - 1)), AMOUNT_SCALE.length - 1);
  return AMOUNT_SCALE[idx];
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }} className="font-medium">
            {e.name}: {formatCurrencyCompact(e.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GeoPage() {
  const [opps, setOpps]         = useState<Opportunity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [hoveredCountry, setHoveredCountry] = useState<CountryStat | null>(null);
  const [sortBy, setSortBy]     = useState<'pipeline' | 'accepted' | 'invoiced' | 'count'>('pipeline');

  useEffect(() => {
    fetch('/api/opportunities?limit=1000')
      .then(r => r.json())
      .then(d => { setOpps(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Compute country stats ─────────────────────────────────────────────────

  const allCountryStats = useMemo<CountryStat[]>(() => {
    const countries = Array.from(new Set(opps.map(o => o.country).filter(Boolean)));
    return countries.map(country => {
      const cos = opps.filter(o => o.country === country);
      const won = cos.filter(o => [6, 7, 8].includes(o.statusCode));
      return {
        country,
        flag:     getFlag(country),
        pipeline: cos.reduce((s, o) => s + o.amount, 0),
        weighted: cos.reduce((s, o) => s + o.weightedPipeline, 0),
        accepted: won.reduce((s, o) => s + o.amount, 0),
        invoiced: won.reduce((s, o) => s + o.totalInvoiced, 0),
        count:    cos.length,
        clients:  new Set(cos.map(o => o.client)).size,
      };
    }).sort((a, b) => b.pipeline - a.pipeline);
  }, [opps]);

  const countryStats = useMemo(() => {
    if (activeRegion === 'all') return allCountryStats;
    return allCountryStats.filter(s => getRegion(s.country) === activeRegion);
  }, [allCountryStats, activeRegion]);

  const sorted = useMemo(() => [...countryStats].sort((a, b) => b[sortBy] - a[sortBy]), [countryStats, sortBy]);

  // Region aggregates
  const regionStats = useMemo(() => {
    const regions = Array.from(new Set(allCountryStats.map(s => getRegion(s.country))));
    return regions.map(region => ({
      region,
      pipeline: allCountryStats.filter(s => getRegion(s.country) === region).reduce((s, c) => s + c.pipeline, 0),
      count:    allCountryStats.filter(s => getRegion(s.country) === region).reduce((s, c) => s + c.count, 0),
      countries: allCountryStats.filter(s => getRegion(s.country) === region).length,
      color:    REGION_COLORS[region] ?? '#94a3b8',
    })).sort((a, b) => b.pipeline - a.pipeline);
  }, [allCountryStats]);

  const maxPipeline = allCountryStats[0]?.pipeline ?? 1;

  // Top-level KPIs
  const totalPipeline = allCountryStats.reduce((s, c) => s + c.pipeline, 0);
  const totalCountries = allCountryStats.length;
  const topCountry = allCountryStats[0];
  const totalAccepted = allCountryStats.reduce((s, c) => s + c.accepted, 0);

  // Map data for WorldMapChart component
  const mapData = useMemo(() => {
    const data: Record<string, { amount: number; color: string; label: string }> = {};
    allCountryStats.forEach(s => {
      data[s.country] = {
        amount: s.pipeline,
        color:  amountColor(s.pipeline, maxPipeline),
        label:  `${s.flag} ${s.country}: ${formatCurrencyCompact(s.pipeline)} · ${s.count} ops`,
      };
    });
    return data;
  }, [allCountryStats, maxPipeline]);

  const handleCountryHover = useCallback((countryName: string | null) => {
    if (!countryName) { setHoveredCountry(null); return; }
    const stat = allCountryStats.find(s =>
      s.country.toLowerCase() === countryName.toLowerCase()
    );
    setHoveredCountry(stat ?? null);
  }, [allCountryStats]);

  const uniqueRegions = useMemo(() => Array.from(new Set(allCountryStats.map(s => getRegion(s.country)))), [allCountryStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Dashboard Geográfico"
        subtitle={`Distribución global de negocio · ${totalCountries} países activos`}
        badge="Geo"
        badgeColor="blue"
      />

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Países Activos', value: String(totalCountries), sub: 'con oportunidades', icon: <Globe size={20} />, color: 'from-blue-500 to-blue-600' },
          { label: 'Pipeline Global', value: formatCurrencyCompact(totalPipeline), sub: 'todos los países', icon: <TrendingUp size={20} />, color: 'from-amber-500 to-amber-600' },
          { label: 'Top País', value: topCountry ? `${topCountry.flag} ${topCountry.country}` : '—', sub: topCountry ? formatCurrencyCompact(topCountry.pipeline) : '', icon: <MapPin size={20} />, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Total Aceptado', value: formatCurrencyCompact(totalAccepted), sub: 'proyectos won', icon: <DollarSign size={20} />, color: 'from-violet-500 to-violet-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white shrink-0`}>
                {k.icon}
              </div>
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            </div>
            <p className="text-lg font-bold text-slate-900 truncate">{k.value}</p>
            {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Region Filter ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveRegion('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            activeRegion === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          Todas las regiones
        </button>
        {uniqueRegions.map(region => (
          <button
            key={region}
            onClick={() => setActiveRegion(activeRegion === region ? 'all' : region)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              activeRegion === region ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
            style={activeRegion === region ? { background: REGION_COLORS[region] ?? '#64748b', borderColor: REGION_COLORS[region] } : {}}
          >
            {region}
          </button>
        ))}
      </div>

      {/* ── World Map ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mapa Global de Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Intensidad de color = volumen de pipeline · Pasa el cursor sobre un país</p>
          </div>
          {/* Color legend */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Bajo</span>
            <div className="flex h-3 w-28 rounded-full overflow-hidden">
              {AMOUNT_SCALE.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
            </div>
            <span className="text-xs text-slate-400">Alto</span>
          </div>
        </div>

        {/* Map component */}
        <WorldMap mapData={mapData} onCountryHover={handleCountryHover} />

        {/* Hover info panel */}
        <div className={cn(
          'mx-5 mb-5 rounded-xl border transition-all duration-200',
          hoveredCountry
            ? 'bg-amber-50 border-amber-200 p-4'
            : 'bg-slate-50 border-slate-100 p-3'
        )}>
          {hoveredCountry ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{hoveredCountry.flag}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{hoveredCountry.country}</p>
                  <p className="text-xs text-slate-500">{getRegion(hoveredCountry.country)} · {hoveredCountry.clients} cliente(s) · {hoveredCountry.count} oportunidad(es)</p>
                </div>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { label: 'Pipeline', value: hoveredCountry.pipeline, color: 'text-amber-700' },
                  { label: 'Aceptado', value: hoveredCountry.accepted, color: 'text-emerald-700' },
                  { label: 'Facturado', value: hoveredCountry.invoiced, color: 'text-violet-700' },
                ].map(m => (
                  <div key={m.label} className="text-right">
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className={`text-sm font-bold ${m.color}`}>{formatCurrencyCompact(m.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">Pasa el cursor sobre un país para ver su detalle</p>
          )}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline by Region */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Pipeline por Región</h3>
          <p className="text-xs text-slate-400 mb-4">Distribución geográfica</p>
          <div className="space-y-3">
            {regionStats.map(r => {
              const pct = totalPipeline > 0 ? (r.pipeline / totalPipeline) * 100 : 0;
              return (
                <div key={r.region}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="text-xs font-medium text-slate-700">{r.region}</span>
                      <span className="text-xs text-slate-400">({r.countries} países)</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(r.pipeline)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Countries Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top 8 Países</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pipeline, Aceptado y Facturado</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted.slice(0, 8).map(s => ({
                  name: `${s.flag} ${s.country}`,
                  Pipeline: s.pipeline,
                  Aceptado: s.accepted,
                  Facturado: s.invoiced,
                }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Pipeline"  fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Aceptado"  fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Facturado" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Country Ranking Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ranking por País</h3>
            <p className="text-xs text-slate-400 mt-0.5">{sorted.length} países con oportunidades</p>
          </div>
          {/* Sort control */}
          <div className="flex items-center gap-1">
            {(['pipeline', 'accepted', 'invoiced', 'count'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  sortBy === s ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {s === 'pipeline' ? 'Pipeline' : s === 'accepted' ? 'Aceptado' : s === 'invoiced' ? 'Facturado' : 'Ops'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 w-8">#</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">País</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Región</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Pipeline</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Aceptado</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Facturado</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Ops</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Clientes</th>
                <th className="px-4 py-3 w-32">
                  <span className="text-xs font-semibold text-slate-500">% del total</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((stat, i) => {
                const pct = totalPipeline > 0 ? (stat.pipeline / totalPipeline) * 100 : 0;
                const isTop = i === 0;
                return (
                  <tr key={stat.country} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-bold',
                        isTop ? 'text-amber-500' : 'text-slate-400'
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{stat.flag}</span>
                        <span className="text-xs font-semibold text-slate-800">{stat.country}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ background: REGION_COLORS[getRegion(stat.country)] ?? '#94a3b8' }}
                      >
                        {getRegion(stat.country)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-xs font-bold', isTop ? 'text-amber-600' : 'text-slate-900')}>
                        {formatCurrencyCompact(stat.pipeline)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-emerald-700">
                        {formatCurrencyCompact(stat.accepted)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-violet-700">
                        {formatCurrencyCompact(stat.invoiced)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-600 font-medium">{stat.count}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">{stat.clients}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: amountColor(stat.pipeline, maxPipeline) }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400">
                    Sin datos para la región seleccionada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
