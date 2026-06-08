'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Zap, CheckCircle, AlertCircle, RefreshCw,
  Users, FolderOpen, Link, TriangleAlert, UserCheck, UserX, Wand2, X,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrencyCompact, cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConnectionStatus {
  ok: boolean;
  projectsCount?: number;
  employeesCount?: number;
  error?: string;
}

interface FactorialProject {
  id: number;
  name: string;
  code: string | null;
  status: string;
  mapping: { internalProjectId: string; matchStatus: string } | null;
}

interface SyncResult {
  projectsProcessed: number;
  timeEntriesUpserted: number;
  costSummariesUpdated: number;
  warnings: string[];
  errors: string[];
  projectSummaries: { projectId: string; totalHours: number; totalPeopleCost: number; employeesCount: number }[];
}

interface InternalEmployee {
  id: string;
  name: string;
  department: string;
  hourlyCost: number;
  factorialId: string | null;
  factorialName: string | null;
  factorialEmail: string | null;
  linked: boolean;
}

interface FactorialEmployeeOption {
  id: number;
  name: string;
  email: string | null;
}

interface EmployeeMappingData {
  internal: InternalEmployee[];
  factorialAll: FactorialEmployeeOption[];
  stats: { total: number; linked: number; unlinked: number };
}

interface AutoMatchResult {
  matched: number;
  unmatched: number;
  details: {
    matched:   { internalName: string; factorialName: string; method: string }[];
    unmatched: { internalName: string }[];
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MATCH_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  matched:      { label: 'Coincide',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  unmatched:    { label: 'Sin match', color: 'bg-red-100 text-red-700 border-red-200' },
  needs_review: { label: 'Revisar',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  manual:       { label: 'Manual',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FactorialAdminPage() {
  const router = useRouter();

  // Connection
  const [connection, setConnection]   = useState<ConnectionStatus | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  // Projects
  const [projects, setProjects]             = useState<FactorialProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Sync
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError]   = useState('');
  const [startDate, setStartDate]   = useState(() => new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10));
  const [endDate, setEndDate]       = useState(() => new Date().toISOString().slice(0, 10));

  // Employee mappings
  const [empData, setEmpData]                 = useState<EmployeeMappingData | null>(null);
  const [loadingEmps, setLoadingEmps]         = useState(false);
  const [empError, setEmpError]               = useState('');
  const [autoMatching, setAutoMatching]       = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<AutoMatchResult | null>(null);
  const [autoMatchError, setAutoMatchError]   = useState('');
  const [savingLink, setSavingLink]           = useState<string | null>(null);
  const [pendingLinks, setPendingLinks]       = useState<Record<string, string>>({});

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function testConnection() {
    setTestingConn(true);
    setConnection(null);
    try {
      const res  = await fetch('/api/integrations/factorial/test');
      const data = await res.json();
      setConnection(data);
    } catch {
      setConnection({ ok: false, error: 'Error de red' });
    } finally {
      setTestingConn(false);
    }
  }

  async function loadProjects() {
    setLoadingProjects(true);
    try {
      const res  = await fetch('/api/integrations/factorial/projects');
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch { /* ignore */ }
    finally { setLoadingProjects(false); }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const res  = await fetch('/api/integrations/factorial/sync-project-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSyncResult(data);
      // Refresh employee mappings if loaded (sync may have auto-enriched)
      if (empData) loadEmployeeMappings();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Error en sincronización');
    } finally {
      setSyncing(false);
    }
  }

  async function loadEmployeeMappings() {
    setLoadingEmps(true);
    setEmpError('');
    setAutoMatchResult(null);
    try {
      const res  = await fetch('/api/integrations/factorial/employee-mappings');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmpData(data);
      setPendingLinks({});
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Error al cargar empleados');
    } finally {
      setLoadingEmps(false);
    }
  }

  async function handleAutoMatch() {
    setAutoMatching(true);
    setAutoMatchResult(null);
    setAutoMatchError('');
    try {
      const res  = await fetch('/api/integrations/factorial/auto-match-employees', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAutoMatchResult(data);
      loadEmployeeMappings();
    } catch (err) {
      setAutoMatchError(err instanceof Error ? err.message : 'Error en auto-vinculación');
    } finally {
      setAutoMatching(false);
    }
  }

  async function saveManualLink(internalId: string, factorialIdStr: string) {
    setSavingLink(internalId);
    try {
      const factorialEmployeeId = factorialIdStr ? Number(factorialIdStr) : null;
      const res = await fetch('/api/integrations/factorial/employee-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalEmployeeId: internalId, factorialEmployeeId }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      loadEmployeeMappings();
    } catch { /* ignore */ }
    finally { setSavingLink(null); }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const withCode    = projects.filter(p => p.code).length;
  const withoutCode = projects.filter(p => !p.code).length;
  const matched     = projects.filter(p => p.mapping?.matchStatus === 'matched').length;
  const unmatched   = projects.filter(p => !p.mapping || p.mapping.matchStatus === 'unmatched').length;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      <button
        onClick={() => router.push('/integrations')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a Integraciones
      </button>

      <PageHeader
        title="Factorial HR — Administración"
        subtitle="Estado de conexión, mappings y sincronización de horas imputadas"
        badge="Integración"
      />

      {/* ── Connection ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Zap size={22} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Estado de conexión</h3>
              <p className="text-xs text-slate-500">
                API Key:{' '}
                <span className={cn('font-semibold', connection?.ok ? 'text-emerald-600' : connection === null ? 'text-slate-400' : 'text-red-500')}>
                  {connection === null ? 'no verificada' : connection.ok ? 'válida' : 'inválida'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={testConnection}
            disabled={testingConn}
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <RefreshCw size={14} className={testingConn ? 'animate-spin' : ''} />
            {testingConn ? 'Comprobando...' : 'Probar conexión'}
          </button>
        </div>

        {connection && (
          <div className={cn(
            'mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
            connection.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800',
          )}>
            {connection.ok ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            <div>
              {connection.ok ? (
                <>
                  <p className="font-semibold">Conexión correcta</p>
                  <p className="text-xs mt-0.5">{connection.projectsCount} proyecto(s) · {connection.employeesCount} empleado(s) detectados en Factorial</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Error de conexión</p>
                  <p className="text-xs mt-0.5">{connection.error}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Employee mappings ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Vinculación de empleados</h3>
            {empData && (
              <span className="text-xs text-slate-400">
                {empData.stats.linked}/{empData.stats.total} vinculados
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {empData && empData.stats.unlinked > 0 && (
              <button
                onClick={handleAutoMatch}
                disabled={autoMatching}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Wand2 size={13} className={autoMatching ? 'animate-pulse' : ''} />
                {autoMatching ? 'Procesando...' : `Auto-vincular por nombre (${empData.stats.unlinked})`}
              </button>
            )}
            <button
              onClick={loadEmployeeMappings}
              disabled={loadingEmps}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-60"
            >
              <RefreshCw size={13} className={loadingEmps ? 'animate-spin' : ''} />
              {empData ? 'Refrescar' : 'Cargar empleados'}
            </button>
          </div>
        </div>

        {/* Auto-match error */}
        {autoMatchError && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{autoMatchError}</span>
            <button onClick={() => setAutoMatchError('')} className="ml-auto opacity-50 hover:opacity-80"><X size={13} /></button>
          </div>
        )}

        {/* Employee load error */}
        {empError && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{empError}</span>
            <button onClick={() => setEmpError('')} className="ml-auto opacity-50 hover:opacity-80"><X size={13} /></button>
          </div>
        )}

        {/* Auto-match result banner */}
        {autoMatchResult && (
          <div className={cn(
            'mx-5 mt-4 px-4 py-3 rounded-xl border text-sm flex items-start gap-3',
            autoMatchResult.matched > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700',
          )}>
            <Wand2 size={15} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                {autoMatchResult.matched > 0
                  ? `${autoMatchResult.matched} empleado(s) vinculados automáticamente`
                  : 'No se encontraron nuevas coincidencias'}
              </p>
              {autoMatchResult.details.matched.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {autoMatchResult.details.matched.map((m, i) => (
                    <li key={i} className="text-xs flex items-center gap-1.5">
                      <CheckCircle size={11} />
                      <span className="font-medium">{m.internalName}</span>
                      <span className="opacity-60">→</span>
                      <span>{m.factorialName}</span>
                      <span className="opacity-50">({m.method})</span>
                    </li>
                  ))}
                </ul>
              )}
              {autoMatchResult.details.unmatched.length > 0 && (
                <p className="mt-1 text-xs opacity-70">
                  {autoMatchResult.details.unmatched.length} sin match automático — vincula manualmente abajo
                </p>
              )}
            </div>
            <button onClick={() => setAutoMatchResult(null)} className="opacity-40 hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {!empData && !loadingEmps && (
          <div className="px-5 py-10 text-center text-slate-400">
            <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-slate-500">Carga los empleados para ver el estado de vinculación</p>
            <p className="text-xs mt-1">Vincula cada empleado interno con su perfil en Factorial para calcular costes reales</p>
          </div>
        )}

        {loadingEmps && (
          <div className="px-5 py-10 text-center text-slate-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-40" />
            <p className="text-sm">Cargando empleados y datos de Factorial…</p>
          </div>
        )}

        {empData && !loadingEmps && (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              <div className="px-5 py-3 text-center">
                <p className="text-xs text-slate-400">Total internos</p>
                <p className="text-xl font-bold text-slate-900">{empData.stats.total}</p>
              </div>
              <div className="px-5 py-3 text-center bg-emerald-50/50">
                <p className="text-xs text-emerald-600">Vinculados</p>
                <p className="text-xl font-bold text-emerald-800">{empData.stats.linked}</p>
              </div>
              <div className={cn('px-5 py-3 text-center', empData.stats.unlinked > 0 ? 'bg-amber-50/50' : '')}>
                <p className={cn('text-xs', empData.stats.unlinked > 0 ? 'text-amber-600' : 'text-slate-400')}>Sin vincular</p>
                <p className={cn('text-xl font-bold', empData.stats.unlinked > 0 ? 'text-amber-800' : 'text-slate-400')}>{empData.stats.unlinked}</p>
              </div>
            </div>

            {/* Employee table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Empleado interno</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Departamento</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-500">Coste/h</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Estado</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Perfil Factorial</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empData.internal.map(emp => (
                    <tr key={emp.id} className={cn('hover:bg-slate-50/70', !emp.linked && 'bg-amber-50/20')}>
                      {/* Name */}
                      <td className="px-4 py-2.5 font-medium text-slate-800">{emp.name}</td>

                      {/* Dept */}
                      <td className="px-4 py-2.5 text-slate-500">{emp.department ?? '—'}</td>

                      {/* Cost */}
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                        {emp.hourlyCost > 0 ? `${emp.hourlyCost}€/h` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
                        {emp.linked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <UserCheck size={10} /> Vinculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                            <UserX size={10} /> Sin vincular
                          </span>
                        )}
                      </td>

                      {/* Factorial profile */}
                      <td className="px-4 py-2.5">
                        {emp.linked ? (
                          <div>
                            <p className="font-medium text-slate-700">{emp.factorialName}</p>
                            {emp.factorialEmail && <p className="text-slate-400 text-[11px]">{emp.factorialEmail}</p>}
                            <p className="text-slate-300 text-[11px] font-mono">id:{emp.factorialId}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-2.5">
                        {emp.linked ? (
                          <button
                            onClick={() => saveManualLink(emp.id, '')}
                            disabled={savingLink === emp.id}
                            className="text-[11px] text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            {savingLink === emp.id ? 'Guardando…' : 'Desvincular'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={pendingLinks[emp.id] ?? ''}
                              onChange={e => setPendingLinks(prev => ({ ...prev, [emp.id]: e.target.value }))}
                              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 max-w-[180px]"
                            >
                              <option value="">— Seleccionar —</option>
                              {empData.factorialAll.map(fe => (
                                <option key={fe.id} value={String(fe.id)}>
                                  {fe.name}{fe.email ? ` (${fe.email})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const sel = pendingLinks[emp.id];
                                if (sel) saveManualLink(emp.id, sel);
                              }}
                              disabled={!pendingLinks[emp.id] || savingLink === emp.id}
                              className="text-[11px] font-semibold text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
                            >
                              {savingLink === emp.id ? '…' : 'Vincular'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Sync controls ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw size={15} className="text-amber-500" /> Sincronización de horas
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={loadProjects} disabled={loadingProjects}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2">
              <FolderOpen size={14} className={loadingProjects ? 'animate-pulse' : ''} />
              {loadingProjects ? 'Cargando...' : 'Ver proyectos Factorial'}
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2">
              <Zap size={14} className={syncing ? 'animate-pulse' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar horas'}
            </button>
          </div>
        </div>

        {syncError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={14} /> {syncError}
          </div>
        )}

        {syncResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle size={15} /> Sincronización completada
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Proyectos', value: syncResult.projectsProcessed },
                { label: 'Registros', value: syncResult.timeEntriesUpserted },
                { label: 'Resúmenes', value: syncResult.costSummariesUpdated },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg p-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            {syncResult.projectSummaries.length > 0 && (
              <div className="space-y-1">
                {syncResult.projectSummaries.map(ps => (
                  <div key={ps.projectId} className="flex items-center justify-between text-xs text-emerald-700 bg-white px-3 py-1.5 rounded-lg">
                    <span className="font-mono font-semibold">{ps.projectId}</span>
                    <span>{ps.totalHours.toFixed(1)}h · {formatCurrencyCompact(ps.totalPeopleCost)} · {ps.employeesCount} emp</span>
                  </div>
                ))}
              </div>
            )}
            {syncResult.warnings.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-emerald-200">
                {syncResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                    <TriangleAlert size={12} className="mt-0.5 shrink-0" /> {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Projects mapping table ── */}
      {projects.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Proyectos Factorial', value: projects.length, color: '' },
              { label: 'Con código',          value: withCode,        color: 'text-emerald-700' },
              { label: 'Matcheados',          value: matched,         color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Sin match',           value: unmatched,       color: 'text-amber-800',   bg: 'bg-amber-50 border-amber-200' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={cn('border rounded-2xl p-4 shadow-sm text-center', bg ?? 'bg-white border-slate-200')}>
                <p className={cn('text-xs mb-1', color ? color.replace('800','600').replace('700','600') : 'text-slate-400')}>{label}</p>
                <p className={cn('text-2xl font-bold', color || 'text-slate-900')}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Link size={15} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Proyectos Factorial ↔ MTI</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Factorial ID', 'Nombre Factorial', 'Código', 'ID MTI Interno', 'Estado'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projects.map(fp => {
                    const statusCfg = MATCH_STATUS_LABELS[fp.mapping?.matchStatus ?? 'unmatched'];
                    return (
                      <tr key={fp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{fp.id}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{fp.name}</td>
                        <td className="px-4 py-2.5">
                          {fp.code
                            ? <span className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{fp.code}</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {fp.mapping?.internalProjectId
                            ? <span className="text-xs font-mono font-semibold text-slate-800">{fp.mapping.internalProjectId}</span>
                            : <span className="text-xs text-slate-400">Sin match</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {withoutCode > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <TriangleAlert size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold">{withoutCode} proyecto(s) de Factorial sin campo &quot;code&quot;</p>
                <p className="mt-0.5">
                  En Factorial → Proyectos → [proyecto], rellena el campo &quot;Código&quot; con el ID MTI interno
                  (ej: <code className="font-mono bg-amber-100 px-1 rounded">26-405</code>).
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
