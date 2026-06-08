'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, AlertCircle, Calendar, Users, DollarSign, X,
  TrendingUp, TrendingDown, FileText, Clock, BarChart2, Building2, CheckCircle,
  RefreshCw, Zap, TriangleAlert, Info, Receipt, FolderOpen, ExternalLink, Loader2, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import StatusSelect from '@/components/ui/StatusSelect';
import CompanyBadge from '@/components/ui/CompanyBadge';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { StatusCode } from '@/lib/types';
import {
  formatCurrency, formatCurrencyCompact, formatDate, formatPercent,
  getCountryFlag, getCompanyColor, cn
} from '@/lib/utils';

const BL_COLORS: Record<string, string> = {
  blHardware:    '#F59E0B',
  blIa:          '#3B82F6',
  blBim:         '#8B5CF6',
  blTtioOm:      '#10B981',
  blEvents:      '#F97316',
  blProservices: '#14B8A6',
};
const BL_LABELS: Record<string, string> = {
  blHardware: 'Hardware', blIa: 'IA', blBim: 'BIM',
  blTtioOm: 'TTIO/O&M', blEvents: 'Eventos', blProservices: 'Pro Services',
};

const DEPT_COLORS = [
  '#F59E0B','#3B82F6','#8B5CF6','#10B981','#F97316',
  '#14B8A6','#EF4444','#6366F1','#EC4899','#84CC16',
];

type CostCategory = 'material' | 'servicios' | 'personal' | 'amortizacion' | 'otros' | 'noclasificado';

const COST_CATEGORY_CONFIG: Record<CostCategory, { label: string; description: string; color: string; bg: string }> = {
  material:      { label: 'Material / Compras',     description: 'Cuentas 60x',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  servicios:     { label: 'Servicios Externos',      description: 'Cuentas 62x',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  personal:      { label: 'Costes de Personal',      description: 'Cuentas 64x',  color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  amortizacion:  { label: 'Amortizaciones',          description: 'Cuentas 68x',  color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  otros:         { label: 'Otros Gastos',            description: 'Cuentas 6x',   color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
  noclasificado: { label: 'No Clasificado',          description: 'Sin categoría', color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-100' },
};

function classifyAccount(code: string): CostCategory {
  const prefix = code.replace(/\D/g, '').slice(0, 2);
  if (prefix === '60' || prefix === '61') return 'material';
  if (prefix === '62')                    return 'servicios';
  if (prefix === '64')                    return 'personal';
  if (prefix === '68')                    return 'amortizacion';
  if (code.startsWith('6'))              return 'otros';
  return 'noclasificado';
}

interface Employee {
  id: string; name: string; factorialName: string | null; company: string;
  department: string; isActive: boolean; hourlyCost: number; monthlySalary: number;
  availability: number;
  salaries: Array<{
    id: string; year: number; month: number; salaryForecast: number;
    salaryReal: number; costHour: number; hoursMonthForecast: number; percent: number;
  }>;
}

interface Opportunity {
  id: string; client: string; opportunity: string; description: string | null;
  amount: number; currency: string; statusCode: number; company: string;
  probability: number; weightedPipeline: number; owner: string; country: string;
  expectedClosingDate: string | null; acceptanceDate: string | null; endDate: string | null;
  date: string; totalInvoiced: number; pendingToInvoice: number; wipStatus: number;
  margin: number; costs: number; materialCost: number; peopleCost: number;
  observations: string | null; blHardware: number; blIa: number; blBim: number;
  blTtioOm: number; blEvents: number; blProservices: number;
  createdAt: string; updatedAt: string;
  driveFolderId: string | null;
}

interface ProjectData {
  opportunity: Opportunity;
  employees: Employee[];
  activityLogs: Array<{ id: string; action: string; performedBy: string; createdAt: string; newValue?: string }>;
  factorialMapping: { factorialProjectId: number | null; factorialProjectName: string | null; matchStatus: string } | null;
  sageTotalIncome: number;
  sageTotalExpense: number;
  hasSageData: boolean;
  companySummary: { totalEmployees: number; totalMonthlySalary: number; avgCostHour: number };
}

interface FactorialEmployeeCost {
  employeeId: string;
  name: string;
  department: string;
  totalMinutes: number;
  totalHours: number;
  totalCost: number;
  hourlyCost: number;
  entries: number;
}

interface FactorialEntry {
  id: string;
  date: string;
  employeeName: string;
  imputedMinutes: number;
  imputedHours: number;
  hourlyCost: number;
  calculatedCost: number;
}

interface FactorialAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
}

interface FactorialSummaryData {
  mapping: { matchStatus: string; factorialProjectName: string | null; factorialProjectCode: string | null } | null;
  latestSummary: { lastSyncedAt: string } | null;
  totalHours: number;
  totalMinutes: number;
  totalPeopleCost: number;
  avgCostHour: number;
  employeesCount: number;
  lastSyncedAt: string | null;
  byEmployee: FactorialEmployeeCost[];
  recentEntries: FactorialEntry[];
  alerts: FactorialAlert[];
}

function KpiCard({ label, value, sub, color = 'slate', icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    slate: 'bg-white border-slate-200', amber: 'bg-amber-50 border-amber-200',
    emerald: 'bg-emerald-50 border-emerald-200', blue: 'bg-blue-50 border-blue-200',
    teal: 'bg-teal-50 border-teal-200', violet: 'bg-violet-50 border-violet-200',
  };
  const textMap: Record<string, string> = {
    slate: 'text-slate-900', amber: 'text-amber-900', emerald: 'text-emerald-900',
    blue: 'text-blue-900', teal: 'text-teal-900', violet: 'text-violet-900',
  };
  const labelMap: Record<string, string> = {
    slate: 'text-slate-500', amber: 'text-amber-600', emerald: 'text-emerald-600',
    blue: 'text-blue-600', teal: 'text-teal-600', violet: 'text-violet-600',
  };
  return (
    <div className={cn('border rounded-2xl p-4 shadow-sm', colorMap[color] || colorMap.slate)}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={labelMap[color] || labelMap.slate}>{icon}</span>}
        <p className={cn('text-xs font-medium', labelMap[color] || labelMap.slate)}>{label}</p>
      </div>
      <p className={cn('text-xl font-bold', textMap[color] || textMap.slate)}>{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]     = useState<ProjectData | null>(null);
  const [statusCode, setStatusCode] = useState<StatusCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'resumen' | 'finanzas' | 'contabilidad' | 'recursos' | 'factorial' | 'calendario' | 'historial'>('resumen');

  const [factorialData, setFactorialData]       = useState<FactorialSummaryData | null>(null);
  const [factorialLoading, setFactorialLoading] = useState(false);
  const [factorialError, setFactorialError]     = useState('');
  const [syncing, setSyncing]                   = useState(false);
  const [syncMsg, setSyncMsg]                   = useState('');
  const [driveLoading, setDriveLoading]         = useState(false);
  const [driveUrl, setDriveUrl]                 = useState<string | null>(null);
  const [driveError, setDriveError]             = useState('');
  const [factorialCreating, setFactorialCreating] = useState(false);
  const [factorialCreateMsg, setFactorialCreateMsg] = useState('');
  const [factorialMapped, setFactorialMapped] = useState(false);
  const [showFactorialModal, setShowFactorialModal] = useState(false);
  const [factorialEmployees, setFactorialEmployees] = useState<{ id: string; name: string; factorialId: string }[]>([]);
  const [selectedFactorialWorkers, setSelectedFactorialWorkers] = useState<string[]>([]);
  const [materialCostEdit, setMaterialCostEdit] = useState(0);
  const [otherCostsEdit, setOtherCostsEdit]     = useState(0);
  const [savingCosts, setSavingCosts]           = useState(false);
  const [saveCostsMsg, setSaveCostsMsg]         = useState('');
  const [showDelete, setShowDelete]             = useState(false);

  interface AccountingEntry {
    id: string; accountCode: string; accountName: string;
    entryDate: string | null; asiento: number | null; concept: string;
    debit: number; credit: number; balance: number; entryType: string;
  }
  interface AccountingData {
    entries: AccountingEntry[];
    totalIncome: number;
    totalExpense: number;
    byAccount: Array<{ accountCode: string; accountName: string; total: number; count: number }>;
    lastImportedAt: string | null;
  }
  const [accountingData, setAccountingData]       = useState<AccountingData | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [accountingError, setAccountingError]     = useState('');

  useEffect(() => {
    fetch(`/api/projects/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setStatusCode(d.opportunity?.statusCode ?? null);
        setLoading(false);
        if (d.factorialMapping?.factorialProjectId) setFactorialMapped(true);
      })
      .catch(() => { setError('No se pudo cargar el proyecto'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (data) {
      setMaterialCostEdit(data.opportunity.materialCost);
      setOtherCostsEdit(data.opportunity.costs);
      if (data.opportunity.driveFolderId) {
        setDriveUrl(`https://drive.google.com/drive/folders/${data.opportunity.driveFolderId}`);
      }
    }
  }, [data]);

  const loadAccountingData = useCallback(() => {
    setAccountingLoading(true);
    setAccountingError('');
    fetch(`/api/accounting/entries?projectId=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { setAccountingData(d); setAccountingLoading(false); })
      .catch(() => { setAccountingError('No se pudieron cargar los datos contables'); setAccountingLoading(false); });
  }, [id]);

  const loadFactorialSummary = useCallback(() => {
    setFactorialLoading(true);
    setFactorialError('');
    fetch(`/api/projects/${encodeURIComponent(id)}/factorial-cost-summary`)
      .then(r => r.json())
      .then(d => { setFactorialData(d); setFactorialLoading(false); })
      .catch(() => { setFactorialError('No se pudo cargar el resumen de Factorial'); setFactorialLoading(false); });
  }, [id]);

  useEffect(() => {
    if (tab === 'factorial' && !factorialData && !factorialLoading) {
      loadFactorialSummary();
    }
  }, [tab, factorialData, factorialLoading, loadFactorialSummary]);

  useEffect(() => {
    if ((tab === 'contabilidad' || tab === 'finanzas') && !accountingData && !accountingLoading) {
      loadAccountingData();
    }
  }, [tab, accountingData, accountingLoading, loadAccountingData]);

  // ── Billing config ──
  interface BillingMilestone {
    id: string; name: string; amount: number;
    dueDate: string | null; invoicedAt: string | null; invoiceRef: string | null;
  }
  interface BillingConfigData {
    id: string; billingType: string; monthlyAmount: number | null;
    billingStartDate: string | null; billingEndDate: string | null;
    notes: string | null; milestones: BillingMilestone[];
  }
  const [billingConfig, setBillingConfig]   = useState<BillingConfigData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingType, setBillingType]       = useState<'fixed' | 'monthly' | 'milestones'>('fixed');
  const [billingMonthlyAmount, setBillingMonthlyAmount] = useState<number | ''>('');
  const [billingStartDate, setBillingStartDate]   = useState('');
  const [billingEndDate, setBillingEndDate]       = useState('');
  const [billingNotes, setBillingNotes]           = useState('');
  const [savingBilling, setSavingBilling]         = useState(false);
  const [billingMsg, setBillingMsg]               = useState('');
  const [newMilestoneName, setNewMilestoneName]   = useState('');
  const [newMilestoneAmt, setNewMilestoneAmt]     = useState<number | ''>('');
  const [newMilestoneDue, setNewMilestoneDue]     = useState('');

  const loadBillingConfig = useCallback(() => {
    setBillingLoading(true);
    fetch(`/api/projects/${encodeURIComponent(id)}/billing-config`)
      .then(r => r.json())
      .then((d: BillingConfigData | null) => {
        setBillingConfig(d);
        if (d) {
          setBillingType(d.billingType as 'fixed' | 'monthly' | 'milestones');
          setBillingMonthlyAmount(d.monthlyAmount ?? '');
          setBillingStartDate(d.billingStartDate ? d.billingStartDate.slice(0, 10) : '');
          setBillingEndDate(d.billingEndDate ? d.billingEndDate.slice(0, 10) : '');
          setBillingNotes(d.notes ?? '');
        }
        setBillingLoading(false);
      })
      .catch(() => setBillingLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'finanzas' && !billingConfig && !billingLoading) {
      loadBillingConfig();
    }
  }, [tab, billingConfig, billingLoading, loadBillingConfig]);

  async function handleSaveBilling() {
    setSavingBilling(true); setBillingMsg('');
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/billing-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingType,
          monthlyAmount: billingMonthlyAmount !== '' ? Number(billingMonthlyAmount) : null,
          billingStartDate: billingStartDate || null,
          billingEndDate: billingEndDate || null,
          notes: billingNotes || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setBillingConfig(d);
      setBillingMsg('Guardado');
    } catch { setBillingMsg('Error al guardar'); }
    finally { setSavingBilling(false); }
  }

  async function handleAddMilestone() {
    if (!newMilestoneName.trim() || newMilestoneAmt === '') return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/billing-config/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMilestoneName, amount: Number(newMilestoneAmt), dueDate: newMilestoneDue || null }),
      });
      if (!res.ok) return;
      setNewMilestoneName(''); setNewMilestoneAmt(''); setNewMilestoneDue('');
      loadBillingConfig();
    } catch { /* ignore */ }
  }

  async function handleToggleMilestoneInvoiced(milestone: BillingMilestone) {
    const invoicedAt = milestone.invoicedAt ? null : new Date().toISOString();
    await fetch(`/api/projects/${encodeURIComponent(id)}/billing-config/milestones/${milestone.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoicedAt }),
    });
    loadBillingConfig();
  }

  async function handleDeleteMilestone(milestoneId: string) {
    await fetch(`/api/projects/${encodeURIComponent(id)}/billing-config/milestones/${milestoneId}`, { method: 'DELETE' });
    loadBillingConfig();
  }

  async function handleSaveCosts() {
    setSavingCosts(true);
    setSaveCostsMsg('');
    try {
      const newTotalCosts = materialCostEdit + peopleCostCalc + otherCostsEdit;
      const newMargin = opp.amount > 0 && newTotalCosts > 0
        ? ((opp.amount - newTotalCosts) / opp.amount) * 100
        : 0;
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ materialCost: materialCostEdit, costs: otherCostsEdit, margin: newMargin }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveCostsMsg('Guardado');
    } catch {
      setSaveCostsMsg('Error al guardar');
    } finally {
      setSavingCosts(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const start = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
      const end   = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/integrations/factorial/sync-project-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: start, endDate: end, projectIds: [id] }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error en sync');
      setSyncMsg(`Sincronizado: ${result.timeEntriesUpserted} registros, ${result.warnings?.length ?? 0} avisos`);
      loadFactorialSummary();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Error en sync');
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreateDriveFolder() {
    setDriveLoading(true);
    setDriveError('');
    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error al crear carpeta');
      setDriveUrl(result.folderUrl);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Error al crear carpeta en Drive');
    } finally {
      setDriveLoading(false);
    }
  }

  async function handleCreateFactorialProject() {
    if (!data) return;
    // Load employees with Factorial ID for selection
    setFactorialEmployees([]);
    setSelectedFactorialWorkers([]);
    const emps = await fetch('/api/employees?isActive=true')
      .then(r => r.json())
      .then(d => (d.employees ?? []).filter((e: { factorialId: string | null }) => !!e.factorialId))
      .catch(() => []);
    setFactorialEmployees(emps.map((e: { id: string; name: string; factorialId: string }) => ({ id: e.id, name: e.name, factorialId: e.factorialId })));
    // Pre-select Daniel Alonso
    const dani = emps.find((e: { name: string }) => e.name.toLowerCase().includes('daniel alonso') || e.name.toLowerCase().includes('dani alonso'));
    if (dani) setSelectedFactorialWorkers([dani.id]);
    setShowFactorialModal(true);
  }

  async function confirmCreateFactorialProject() {
    if (!data) return;
    setShowFactorialModal(false);
    setFactorialCreating(true);
    setFactorialCreateMsg('');
    const opp = data.opportunity;
    const projectName = `${opp.id} - ${opp.client} - ${opp.opportunity}`;
    try {
      const res = await fetch('/api/integrations/factorial/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opp.id,
          name: projectName,
          code: opp.id,
          description: opp.description ?? undefined,
          workerEmployeeIds: selectedFactorialWorkers,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error al crear proyecto en Factorial');
      const workerInfo = result.workerAssignment?.assignedCount > 0
        ? ` · ${result.workerAssignment.assignedCount} empleado(s) asignado(s)`
        : '';
      setFactorialCreateMsg(`Proyecto creado en Factorial (ID: ${result.id})${workerInfo}`);
      setFactorialMapped(true);
      loadFactorialSummary();
    } catch (err) {
      setFactorialCreateMsg(err instanceof Error ? err.message : 'Error al crear en Factorial');
    } finally {
      setFactorialCreating(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Error al eliminar');
    }
    router.push('/projects');
  }

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
        <p className="text-slate-500">{error || 'Proyecto no encontrado'}</p>
        <button onClick={() => router.push('/projects')} className="text-amber-600 hover:underline text-sm">
          Volver a proyectos
        </button>
      </div>
    );
  }

  const { opportunity: opp, employees, activityLogs, companySummary } = data;

  // Business lines
  const blEntries = Object.entries(BL_LABELS)
    .map(([k, label]) => ({ key: k, label, value: opp[k as keyof Opportunity] as number }))
    .filter(e => e.value > 0);

  const peopleCostCalc = factorialData?.totalPeopleCost ?? opp.peopleCost;

  // Source of truth hierarchy:
  // 1. Sage accounting data (if imported) — most reliable
  // 2. Accounting tab data (if loaded)
  // 3. Manual fields on the opportunity
  const { sageTotalIncome, sageTotalExpense, hasSageData } = data;

  const effectiveInvoiced = hasSageData
    ? sageTotalIncome
    : (accountingData && accountingData.totalIncome > 0 ? accountingData.totalIncome : opp.totalInvoiced);

  const effectivePending = Math.max(0, opp.amount - effectiveInvoiced);

  const totalCosts = hasSageData
    ? sageTotalExpense + peopleCostCalc
    : (accountingData && accountingData.totalExpense > 0)
      ? accountingData.totalExpense + peopleCostCalc
      : materialCostEdit + peopleCostCalc + otherCostsEdit;

  const grossProfit = opp.amount - totalCosts;
  const marginPct   = opp.amount > 0 ? (grossProfit / opp.amount) * 100 : 0;

  // Finance chart data
  const financeData = [
    { name: 'Importe',   value: opp.amount },
    { name: 'Facturado', value: effectiveInvoiced },
    { name: 'Pendiente', value: effectivePending },
  ];

  // Dept breakdown for resources pie
  const deptMap: Record<string, number> = {};
  employees.forEach(e => {
    deptMap[e.department] = (deptMap[e.department] || 0) + 1;
  });
  const deptPieData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  const TABS = [
    { key: 'resumen',       label: 'Resumen' },
    { key: 'finanzas',      label: 'Finanzas' },
    { key: 'contabilidad',  label: 'Contabilidad' },
    { key: 'recursos',      label: `Recursos (${employees.length})` },
    { key: 'factorial',     label: 'Costes Reales' },
    { key: 'calendario',    label: 'Calendario' },
    { key: 'historial',     label: 'Historial' },
  ] as const;

  const invoicedPct = opp.amount > 0 ? Math.round((effectiveInvoiced / opp.amount) * 100) : 0;

  return (
    <div className="space-y-4 pb-10">

      {/* Factorial employee selection modal */}
      {showFactorialModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Crear proyecto en Factorial</h2>
                <p className="text-xs text-slate-400 mt-0.5">Selecciona los empleados que tendrán acceso al proyecto</p>
              </div>
              <button onClick={() => setShowFactorialModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
              {factorialEmployees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hay empleados con Factorial vinculado</p>
              ) : factorialEmployees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFactorialWorkers.includes(emp.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedFactorialWorkers(p => [...p, emp.id]);
                      else setSelectedFactorialWorkers(p => p.filter(x => x !== emp.id));
                    }}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-amber-700">{emp.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-slate-700">{emp.name}</span>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">{selectedFactorialWorkers.length} seleccionado(s)</span>
              <div className="flex gap-2">
                <button onClick={() => setShowFactorialModal(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={confirmCreateFactorialProject}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl"
                >
                  Crear proyecto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <DeleteConfirmModal
          id={opp.id}
          name={opp.opportunity}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a Proyectos
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{opp.id}</span>
              <StatusSelect
                id={opp.id}
                statusCode={(statusCode ?? opp.statusCode) as StatusCode}
                size="sm"
                onChange={(code) => setStatusCode(code)}
              />
              <CompanyBadge company={opp.company} size="sm" />
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{opp.owner}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 leading-tight">{opp.opportunity}</h1>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span>{getCountryFlag(opp.country)}</span> {opp.client} · {opp.country}
              </span>
              {opp.acceptanceDate && (
                <span className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald-500" /> Aceptado: {formatDate(opp.acceptanceDate)}
                </span>
              )}
              {opp.endDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> Fin: {formatDate(opp.endDate)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0">
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
            >
              <Trash2 size={13} /> Eliminar
            </button>
            {/* Google Drive button */}
            {driveUrl ? (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                <FolderOpen size={13} /> Abrir carpeta Drive <ExternalLink size={11} />
              </a>
            ) : (
              <button
                onClick={handleCreateDriveFolder}
                disabled={driveLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-60"
              >
                {driveLoading
                  ? <><Loader2 size={12} className="animate-spin" /> Creando carpeta...</>
                  : <><FolderOpen size={13} /> Crear carpeta Drive</>
                }
              </button>
            )}

            {/* Factorial button — only for projects (statusCode 6/7) */}
            {(opp.statusCode === 6 || opp.statusCode === 7) && (
              <button
                onClick={handleCreateFactorialProject}
                disabled={factorialCreating || factorialMapped}
                title={factorialMapped ? 'Proyecto ya vinculado en Factorial' : 'Crear proyecto en Factorial'}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-60"
              >
                {factorialCreating
                  ? <><Loader2 size={12} className="animate-spin" /> Creando...</>
                  : factorialMapped
                    ? <><CheckCircle size={12} className="text-teal-500" /> En Factorial</>
                    : <><Zap size={12} /> Crear en Factorial</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Error/success messages */}
        {driveError && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{driveError}</div>
        )}
        {factorialCreateMsg && (
          <div className={`mt-2 px-3 py-2 rounded-xl text-xs border ${factorialCreateMsg.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {factorialCreateMsg}
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Importe Total"   value={formatCurrencyCompact(opp.amount)}         color="slate"   icon={<DollarSign size={13} />} />
        <KpiCard label="Facturado"       value={formatCurrencyCompact(effectiveInvoiced)}  color="emerald" sub={`${invoicedPct}% del total${hasSageData ? ' · Sage' : ''}`} icon={<TrendingUp size={13} />} />
        <KpiCard label="Pendiente"       value={formatCurrencyCompact(effectivePending)} color="amber" icon={<Clock size={13} />} />
        <KpiCard label="Progreso WIP"    value={`${opp.wipStatus}%`}                       color="teal"   icon={<BarChart2 size={13} />} />
        <KpiCard label="Margen"          value={totalCosts === 0 ? '—' : `${marginPct.toFixed(1)}%`} color="violet" icon={<TrendingUp size={13} />} />
        <KpiCard label="Coste Total"     value={formatCurrencyCompact(totalCosts)}         color="slate"   icon={<DollarSign size={13} />} />
      </div>

      {/* WIP progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Progreso WIP</span>
          <span className="text-xs font-bold text-teal-700">{opp.wipStatus}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${Math.min(opp.wipStatus, 100)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
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
          <div className="space-y-4">
            {opp.description && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FileText size={15} className="text-amber-500" /> Descripción
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{opp.description}</p>
              </div>
            )}

            {/* Business lines */}
            {blEntries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Líneas de Negocio</h3>
                <div className="flex flex-wrap gap-2">
                  {blEntries.map(e => (
                    <span key={e.key}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold border"
                      style={{ background: BL_COLORS[e.key] + '20', color: BL_COLORS[e.key], borderColor: BL_COLORS[e.key] + '40' }}
                    >
                      {e.label}: {formatCurrencyCompact(e.value)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            {opp.observations && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-amber-700 mb-1">Observaciones</h3>
                <p className="text-xs text-amber-800">{opp.observations}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-amber-500" /> Cronograma
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Fecha Registro',    date: opp.date,                icon: '📋', color: 'text-slate-600' },
                { label: 'Fecha Aceptación',  date: opp.acceptanceDate,      icon: '✅', color: 'text-emerald-600' },
                { label: 'Cierre Esperado',   date: opp.expectedClosingDate, icon: '🎯', color: 'text-blue-600' },
                { label: 'Fecha Fin',         date: opp.endDate,             icon: '🏁', color: 'text-violet-600' },
              ].map(item => (
                item.date && (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{item.label}</span>
                      <span className={cn('text-xs font-semibold', item.color)}>
                        {formatDate(item.date)}
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FINANZAS TAB */}
      {tab === 'finanzas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Revenue bar chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Ingresos</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financeData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrencyCompact(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" fill="#F59E0B" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Desglose de Costes</h3>
              {accountingLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : accountingData && accountingData.byAccount.length > 0 ? (
                (() => {
                  // Group by category
                  const categoryTotals: Partial<Record<CostCategory, number>> = {};
                  for (const acc of accountingData.byAccount) {
                    const cat = classifyAccount(acc.accountCode);
                    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + acc.total;
                  }
                  if (peopleCostCalc > 0) {
                    categoryTotals['personal'] = (categoryTotals['personal'] ?? 0) + peopleCostCalc;
                  }
                  const categoryEntries = (Object.entries(categoryTotals) as [CostCategory, number][])
                    .filter(([, v]) => v > 0)
                    .sort(([, a], [, b]) => b - a);

                  return (
                    <>
                      {/* Category summary cards */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {categoryEntries.map(([cat, total]) => {
                          const cfg = COST_CATEGORY_CONFIG[cat];
                          const pct = totalCosts > 0 ? (total / totalCosts) * 100 : 0;
                          return (
                            <div key={cat} className={cn('border rounded-xl px-3 py-2.5', cfg.bg)}>
                              <p className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</p>
                              <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(total)}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-current opacity-40" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed by-account table */}
                      <details className="group">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 mb-2 select-none list-none flex items-center gap-1">
                          <span className="group-open:hidden">▶ Ver detalle por cuenta</span>
                          <span className="hidden group-open:inline">▼ Ocultar detalle</span>
                        </summary>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left text-xs text-slate-500 pb-2">Cuenta</th>
                              <th className="text-right text-xs text-slate-500 pb-2">Importe</th>
                              <th className="text-right text-xs text-slate-500 pb-2">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {accountingData.byAccount.map(acc => (
                              <tr key={acc.accountCode}>
                                <td className="py-2 text-xs text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-xs shrink-0">{acc.accountCode}</span>
                                    <span className="truncate">{acc.accountName}</span>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-semibold text-slate-900 text-right whitespace-nowrap">{formatCurrency(acc.total)}</td>
                                <td className="py-2 text-xs text-slate-500 text-right">
                                  {totalCosts > 0 ? `${((acc.total / totalCosts) * 100).toFixed(1)}%` : '-'}
                                </td>
                              </tr>
                            ))}
                            {peopleCostCalc > 0 && (
                              <tr>
                                <td className="py-2 text-xs text-slate-700">
                                  <div className="flex items-center gap-2">
                                    Coste Personal
                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Factorial</span>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-semibold text-slate-900 text-right">{formatCurrency(peopleCostCalc)}</td>
                                <td className="py-2 text-xs text-slate-500 text-right">
                                  {totalCosts > 0 ? `${((peopleCostCalc / totalCosts) * 100).toFixed(1)}%` : '-'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </details>

                      {/* Totals */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Total Costes</span>
                        <span className="text-xs font-bold text-slate-900">{formatCurrency(totalCosts)}</span>
                      </div>
                      {totalCosts > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">Beneficio Bruto</span>
                          <span className={cn('text-xs font-bold', grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {formatCurrency(grossProfit)} ({marginPct.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-3 text-right flex items-center justify-end gap-1">
                        <Receipt size={11} /> Gastos Sage 50{accountingData.lastImportedAt ? ` · ${new Date(accountingData.lastImportedAt).toLocaleDateString('es-ES')}` : ''}
                      </p>
                    </>
                  );
                })()
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs text-slate-500 pb-2">Concepto</th>
                        <th className="text-right text-xs text-slate-500 pb-2">Importe</th>
                        <th className="text-right text-xs text-slate-500 pb-2">% s/total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <tr>
                        <td className="py-2 text-xs text-slate-700">
                          <div className="flex items-center gap-2">
                            Coste Material
                            <input
                              type="number" min={0} step={100}
                              value={materialCostEdit || ''}
                              placeholder="0"
                              onChange={e => setMaterialCostEdit(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-28 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </td>
                        <td className="py-2 text-xs font-semibold text-slate-900 text-right">{formatCurrency(materialCostEdit)}</td>
                        <td className="py-2 text-xs text-slate-500 text-right">
                          {totalCosts > 0 ? `${((materialCostEdit / totalCosts) * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-xs text-slate-700">
                          <div className="flex items-center gap-2">
                            Coste Personal
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Factorial</span>
                          </div>
                        </td>
                        <td className="py-2 text-xs font-semibold text-slate-900 text-right">{formatCurrency(peopleCostCalc)}</td>
                        <td className="py-2 text-xs text-slate-500 text-right">
                          {totalCosts > 0 ? `${((peopleCostCalc / totalCosts) * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-xs text-slate-700">
                          <div className="flex items-center gap-2">
                            Otros Costes
                            <input
                              type="number" min={0} step={100}
                              value={otherCostsEdit || ''}
                              placeholder="0"
                              onChange={e => setOtherCostsEdit(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-28 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </td>
                        <td className="py-2 text-xs font-semibold text-slate-900 text-right">{formatCurrency(otherCostsEdit)}</td>
                        <td className="py-2 text-xs text-slate-500 text-right">
                          {totalCosts > 0 ? `${((otherCostsEdit / totalCosts) * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200 font-bold">
                        <td className="py-2 text-xs text-slate-900">Total Costes</td>
                        <td className="py-2 text-xs text-slate-900 text-right">{formatCurrency(totalCosts)}</td>
                        <td className="py-2 text-xs text-slate-900 text-right">100%</td>
                      </tr>
                      {totalCosts > 0 && (
                        <tr>
                          <td className="py-2 text-xs text-slate-700">Beneficio Bruto</td>
                          <td className={cn('py-2 text-xs font-bold text-right', grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {formatCurrency(grossProfit)}
                          </td>
                          <td className={cn('py-2 text-xs font-bold text-right', marginPct >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {marginPct.toFixed(1)}%
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-end gap-3 mt-3">
                    {saveCostsMsg && (
                      <span className={cn('text-xs', saveCostsMsg === 'Guardado' ? 'text-emerald-600' : 'text-red-500')}>
                        {saveCostsMsg}
                      </span>
                    )}
                    <button
                      onClick={handleSaveCosts}
                      disabled={savingCosts}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {savingCosts ? 'Guardando...' : 'Guardar costes'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Summary metrics */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumen Financiero</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Importe Contrato',    value: formatCurrency(opp.amount),           sub: '' },
                  { label: 'Facturado',            value: formatCurrency(effectiveInvoiced),    sub: `${invoicedPct}%${hasSageData ? ' · Sage' : ''}` },
                  { label: 'Pendiente Facturar',   value: formatCurrency(effectivePending), sub: `${100 - invoicedPct}%` },
                  { label: 'Margen',               value: totalCosts === 0 ? '—' : `${marginPct.toFixed(1)}%`, sub: 'bruto' },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                    <p className="text-base font-bold text-slate-900">{m.value}</p>
                    {m.sub && <p className="text-xs text-slate-400">{m.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Billing config */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-700">Configuración de Facturación</h3>
              {billingLoading && <div className="ml-auto w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
            </div>

            {/* Type selector */}
            <div className="flex gap-2 flex-wrap">
              {([['fixed', 'Precio Fijo'], ['monthly', 'Mensual'], ['milestones', 'Por Hitos']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setBillingType(val)}
                  className={cn(
                    'px-4 py-2 text-xs font-semibold rounded-xl border transition-colors',
                    billingType === val
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Monthly fields */}
            {billingType === 'monthly' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Importe mensual (€)</label>
                  <input
                    type="number" min={0} step={100}
                    value={billingMonthlyAmount}
                    onChange={e => setBillingMonthlyAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha inicio</label>
                  <input
                    type="date" value={billingStartDate}
                    onChange={e => setBillingStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha fin</label>
                  <input
                    type="date" value={billingEndDate}
                    onChange={e => setBillingEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Notas de facturación</label>
              <textarea
                rows={2}
                value={billingNotes}
                onChange={e => setBillingNotes(e.target.value)}
                placeholder="Condiciones de pago, referencias, etc."
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center gap-3">
              {billingMsg && (
                <span className={cn('text-xs', billingMsg === 'Guardado' ? 'text-emerald-600' : 'text-red-500')}>
                  {billingMsg}
                </span>
              )}
              <button
                onClick={handleSaveBilling}
                disabled={savingBilling}
                className="ml-auto px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-60"
              >
                {savingBilling ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>

            {/* Milestones section */}
            {billingType === 'milestones' && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700">Hitos de facturación</h4>
                {billingConfig && billingConfig.milestones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['Hito', 'Importe', 'Vencimiento', 'Facturado', ''].map(h => (
                            <th key={h} className="text-left font-semibold text-slate-500 py-1.5 pr-3 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {billingConfig.milestones.map(ms => (
                          <tr key={ms.id} className={cn(ms.invoicedAt ? 'opacity-60' : '')}>
                            <td className="py-2 pr-3 text-slate-800 font-medium">
                              {ms.invoicedAt && <CheckCircle size={12} className="inline text-emerald-500 mr-1" />}
                              {ms.name}
                            </td>
                            <td className="py-2 pr-3 font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(ms.amount)}</td>
                            <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                              {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString('es-ES') : '—'}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {ms.invoicedAt
                                ? <span className="text-emerald-600">{new Date(ms.invoicedAt).toLocaleDateString('es-ES')}</span>
                                : <span className="text-slate-400">Pendiente</span>}
                            </td>
                            <td className="py-2 flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleMilestoneInvoiced(ms)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium transition-colors whitespace-nowrap',
                                  ms.invoicedAt
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                )}
                              >
                                {ms.invoicedAt ? 'Desmarcar' : 'Marcar facturado'}
                              </button>
                              <button
                                onClick={() => handleDeleteMilestone(ms.id)}
                                className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Sin hitos definidos. Añade el primero abajo.</p>
                )}

                {/* Add milestone form */}
                <div className="flex items-end gap-2 flex-wrap bg-slate-50 rounded-xl p-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-slate-500 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={newMilestoneName}
                      onChange={e => setNewMilestoneName(e.target.value)}
                      placeholder="Ej: Entrega final"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-slate-500 mb-1">Importe €</label>
                    <input
                      type="number" min={0} step={100}
                      value={newMilestoneAmt}
                      onChange={e => setNewMilestoneAmt(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs text-slate-500 mb-1">Vencimiento</label>
                    <input
                      type="date"
                      value={newMilestoneDue}
                      onChange={e => setNewMilestoneDue(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <button
                    onClick={handleAddMilestone}
                    disabled={!newMilestoneName.trim() || newMilestoneAmt === ''}
                    className="px-3 py-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTABILIDAD TAB */}
      {tab === 'contabilidad' && (
        <div className="space-y-4">
          {accountingLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          )}
          {accountingError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{accountingError}</p>
            </div>
          )}
          {!accountingLoading && !accountingError && accountingData && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-emerald-600" />
                    <p className="text-xs text-emerald-600">Ingresos facturados</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-900">{formatCurrency(accountingData.totalIncome)}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">cuentas 7xx · Sage 50</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={14} className="text-red-500" />
                    <p className="text-xs text-red-500">Gastos contabilizados</p>
                  </div>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(accountingData.totalExpense)}</p>
                  <p className="text-xs text-red-500 mt-0.5">cuentas 6xx · Sage 50</p>
                </div>
                <div className={`border rounded-2xl p-4 shadow-sm ${accountingData.totalIncome - accountingData.totalExpense >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={14} className={accountingData.totalIncome - accountingData.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-500'} />
                    <p className={`text-xs ${accountingData.totalIncome - accountingData.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Resultado contable</p>
                  </div>
                  <p className={`text-xl font-bold ${accountingData.totalIncome - accountingData.totalExpense >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    {formatCurrency(accountingData.totalIncome - accountingData.totalExpense)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">ingresos − gastos</p>
                </div>
              </div>

              {/* Income entries */}
              {accountingData.entries.filter(e => e.entryType === 'income').length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      Ingresos facturados ({accountingData.entries.filter(e => e.entryType === 'income').length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Fecha', 'Asiento', 'Concepto', 'Cuenta', 'Importe'].map(h => (
                            <th key={h} className="text-left font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {accountingData.entries.filter(e => e.entryType === 'income').map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                              {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('es-ES') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 font-mono">{entry.asiento ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{entry.concept}</td>
                            <td className="px-4 py-2.5">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-xs">
                                {entry.accountCode}
                              </span>
                              <span className="ml-1.5 text-slate-400">{entry.accountName}</span>
                            </td>
                            <td className="px-4 py-2.5 font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(entry.credit)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50 font-bold border-t border-emerald-100">
                          <td className="px-4 py-2 text-xs text-slate-700" colSpan={4}>TOTAL INGRESOS</td>
                          <td className="px-4 py-2 text-xs text-emerald-700">{formatCurrency(accountingData.totalIncome)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expense by account summary */}
              {accountingData.byAccount.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-400" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      Gastos por categoría contable
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Cuenta', 'Descripción', 'Registros', 'Total'].map(h => (
                            <th key={h} className="text-left font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {accountingData.byAccount.map(acc => (
                          <tr key={acc.accountCode} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{acc.accountCode}</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">{acc.accountName}</td>
                            <td className="px-4 py-2.5 text-slate-400">{acc.count}</td>
                            <td className="px-4 py-2.5 font-bold text-red-700 whitespace-nowrap">{formatCurrency(acc.total)}</td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 font-bold border-t border-red-100">
                          <td className="px-4 py-2 text-xs text-slate-700" colSpan={3}>TOTAL GASTOS</td>
                          <td className="px-4 py-2 text-xs text-red-700">{formatCurrency(accountingData.totalExpense)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All expense entries detail */}
              {accountingData.entries.filter(e => e.entryType === 'expense').length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      Detalle gastos ({accountingData.entries.filter(e => e.entryType === 'expense').length} registros)
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                        <tr>
                          {['Fecha', 'Asiento', 'Concepto', 'Cuenta', 'Importe'].map(h => (
                            <th key={h} className="text-left font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {accountingData.entries.filter(e => e.entryType === 'expense').map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                              {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('es-ES') : '—'}
                            </td>
                            <td className="px-4 py-2 text-slate-400 font-mono">{entry.asiento ?? '—'}</td>
                            <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{entry.concept}</td>
                            <td className="px-4 py-2">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{entry.accountCode}</span>
                            </td>
                            <td className="px-4 py-2 font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(entry.debit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {accountingData.entries.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <Receipt size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Sin datos contables para este proyecto</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Importa el extracto de Sage 50 en{' '}
                    <a href="/accounting" className="text-amber-600 underline">Contabilidad</a>{' '}
                    para ver las facturas y gastos vinculados.
                  </p>
                </div>
              )}

              {/* Last import info */}
              {accountingData.lastImportedAt && (
                <p className="text-xs text-slate-400 text-right">
                  Última importación Sage 50: {new Date(accountingData.lastImportedAt).toLocaleString('es-ES')}
                </p>
              )}
            </>
          )}

          {/* No data yet */}
          {!accountingLoading && !accountingError && !accountingData && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <Receipt size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">Sin datos contables</p>
              <p className="text-xs text-slate-400 mt-1">
                Importa el extracto de Sage 50 en{' '}
                <a href="/accounting" className="text-amber-600 underline">Contabilidad</a>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* RECURSOS TAB */}
      {tab === 'recursos' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Building2 size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Recursos de empresa: {opp.company}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Los recursos mostrados pertenecen a la empresa {opp.company}.
                La asignación específica por proyecto estará disponible con la integración de Factorial.
              </p>
            </div>
          </div>

          {/* Company summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-slate-500 mb-1">Total Empleados</p>
              <p className="text-2xl font-bold text-slate-900">{companySummary.totalEmployees}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-emerald-600 mb-1">Coste Mensual Total</p>
              <p className="text-2xl font-bold text-emerald-800">{formatCurrencyCompact(companySummary.totalMonthlySalary)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-amber-600 mb-1">Coste/Hora Medio</p>
              <p className="text-2xl font-bold text-amber-800">{companySummary.avgCostHour.toFixed(0)}€/h</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Employees table */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Nombre', 'Departamento', 'Factorial', 'Coste/h', 'Salario Mensual', 'Estado'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">Sin empleados en esta empresa</td></tr>
                    ) : employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-amber-700">
                                {emp.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-slate-800">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{emp.department}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                          {emp.factorialName ? '✅' : '⚪'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {emp.hourlyCost}€/h
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {formatCurrencyCompact(emp.monthlySalary)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          )}>
                            {emp.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dept pie chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Por Departamento</h3>
              {deptPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={2}>
                      {deptPieData.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FACTORIAL / COSTES REALES TAB */}
      {tab === 'factorial' && (
        <div className="space-y-4">
          {/* Header + sync controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Zap size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Costes Reales desde Factorial</h3>
                  <p className="text-xs text-slate-500">
                    {factorialData?.lastSyncedAt
                      ? `Última sync: ${new Date(factorialData.lastSyncedAt).toLocaleString('es-ES')}`
                      : 'Sin sincronización aún'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadFactorialSummary}
                  disabled={factorialLoading}
                  className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={factorialLoading ? 'animate-spin' : ''} />
                  Recargar
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Zap size={13} className={syncing ? 'animate-pulse' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </button>
              </div>
            </div>
            {syncMsg && (
              <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                {syncMsg}
              </div>
            )}
          </div>

          {factorialLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          )}

          {factorialError && !factorialLoading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} /> {factorialError}
            </div>
          )}

          {factorialData && !factorialLoading && (
            <>
              {/* Alerts */}
              {factorialData.alerts.length > 0 && (
                <div className="space-y-2">
                  {factorialData.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 px-4 py-3 rounded-xl text-xs border',
                        alert.type === 'error'   ? 'bg-red-50 border-red-200 text-red-700' :
                        alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-blue-50 border-blue-200 text-blue-700',
                      )}
                    >
                      {alert.type === 'error'   ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> :
                       alert.type === 'warning' ? <TriangleAlert size={14} className="mt-0.5 shrink-0" /> :
                       <Info size={14} className="mt-0.5 shrink-0" />}
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-slate-400 mb-1">Horas Imputadas</p>
                  <p className="text-2xl font-bold text-slate-900">{factorialData.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-slate-400">{factorialData.totalMinutes} min</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-amber-600 mb-1">Coste Real Personal</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrencyCompact(factorialData.totalPeopleCost)}</p>
                  <p className="text-xs text-amber-500">{factorialData.employeesCount} empleado(s)</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-slate-400 mb-1">Coste/Hora Medio</p>
                  <p className="text-2xl font-bold text-slate-900">{factorialData.avgCostHour.toFixed(0)}€/h</p>
                </div>
                <div className={cn(
                  'border rounded-2xl p-4 shadow-sm',
                  (() => {
                    const realCost = factorialData.totalPeopleCost;
                    const estCost  = opp.peopleCost;
                    if (estCost === 0) return 'bg-slate-50 border-slate-200';
                    const dev = ((realCost - estCost) / estCost) * 100;
                    return dev > 20 ? 'bg-red-50 border-red-200' : dev > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
                  })()
                )}>
                  <p className="text-xs text-slate-400 mb-1">Desviación Coste</p>
                  {opp.peopleCost > 0 ? (
                    <>
                      <p className={cn(
                        'text-2xl font-bold',
                        (() => {
                          const dev = ((factorialData.totalPeopleCost - opp.peopleCost) / opp.peopleCost) * 100;
                          return dev > 20 ? 'text-red-700' : dev > 0 ? 'text-amber-700' : 'text-emerald-700';
                        })()
                      )}>
                        {(((factorialData.totalPeopleCost - opp.peopleCost) / opp.peopleCost) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-400">
                        Est: {formatCurrencyCompact(opp.peopleCost)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Sin estimación</p>
                  )}
                </div>
              </div>

              {/* Employee breakdown table */}
              {factorialData.byEmployee.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users size={14} className="text-amber-500" /> Coste por Empleado
                    </h3>
                    <span className="text-xs text-slate-400">{factorialData.byEmployee.length} empleado(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Empleado', 'Departamento', 'Horas', 'Coste/h', 'Coste Total', '% s/total', 'Registros'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {factorialData.byEmployee.map(emp => (
                          <tr key={emp.employeeId} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-amber-700">{emp.name.charAt(0)}</span>
                                </div>
                                <span className="text-xs font-medium text-slate-800">{emp.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{emp.department}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">{emp.totalHours.toFixed(1)}h</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{emp.hourlyCost}€/h</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-900">{formatCurrency(emp.totalCost)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {factorialData.totalPeopleCost > 0
                                ? `${((emp.totalCost / factorialData.totalPeopleCost) * 100).toFixed(1)}%`
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{emp.entries}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="px-4 py-2.5 text-xs text-slate-700" colSpan={2}>TOTAL</td>
                          <td className="px-4 py-2.5 text-xs text-slate-900">{factorialData.totalHours.toFixed(1)}h</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{factorialData.avgCostHour.toFixed(0)}€/h</td>
                          <td className="px-4 py-2.5 text-xs text-slate-900">{formatCurrency(factorialData.totalPeopleCost)}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-900">100%</td>
                          <td className="px-4 py-2.5 text-xs text-slate-400">{factorialData.recentEntries.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent entries table */}
              {factorialData.recentEntries.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" /> Registros de Tiempo (últimos {factorialData.recentEntries.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Fecha', 'Empleado', 'Minutos', 'Horas', 'Coste/h', 'Coste'].map(h => (
                            <th key={h} className="text-left font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {factorialData.recentEntries.map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-600">{new Date(entry.date).toLocaleDateString('es-ES')}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{entry.employeeName}</td>
                            <td className="px-4 py-2.5 text-slate-600">{entry.imputedMinutes}min</td>
                            <td className="px-4 py-2.5 text-slate-700">{entry.imputedHours.toFixed(2)}h</td>
                            <td className="px-4 py-2.5 text-slate-500">{entry.hourlyCost}€/h</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{formatCurrency(entry.calculatedCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {factorialData.totalHours === 0 && factorialData.alerts.every(a => a.type !== 'error') && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                  <Zap size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Sin horas imputadas</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No hay registros de tiempo en Factorial para este proyecto. Asegúrate de que el proyecto en Factorial
                    tiene el campo &quot;code&quot; igual a <code className="font-mono bg-slate-100 px-1 rounded">{opp.id}</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CALENDARIO TAB */}
      {tab === 'calendario' && (
        <div className="space-y-4">
          {/* Timeline events */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-amber-500" /> Línea de Tiempo
            </h3>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
              {[
                { label: 'Fecha Registro',    date: opp.date,                color: 'bg-slate-400',   icon: '📋' },
                { label: 'Fecha Aceptación',  date: opp.acceptanceDate,      color: 'bg-emerald-500', icon: '✅' },
                { label: 'Cierre Esperado',   date: opp.expectedClosingDate, color: 'bg-blue-500',    icon: '🎯' },
                { label: 'Fecha Fin',         date: opp.endDate,             color: 'bg-violet-500',  icon: '🏁' },
              ].filter(e => e.date).map(event => (
                <div key={event.label} className="relative flex items-start gap-3">
                  <div className={cn('absolute -left-4 w-3 h-3 rounded-full mt-0.5', event.color)} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{event.label}</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(event.date!)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly grid current year */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Actividad 2026 por Mes</h3>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {MONTH_NAMES.map((month, i) => {
                const monthNum = i + 1;
                const year = 2026;
                const startDate = opp.date ? new Date(opp.date) : null;
                const endDate = opp.endDate ? new Date(opp.endDate) : opp.acceptanceDate ? new Date(opp.acceptanceDate) : null;
                const thisMonth = new Date(year, i, 1);
                const isActive = startDate && (!endDate || thisMonth <= endDate) && thisMonth >= new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const isAcceptance = opp.acceptanceDate && new Date(opp.acceptanceDate).getFullYear() === year && new Date(opp.acceptanceDate).getMonth() === i;
                return (
                  <div key={month} className={cn(
                    'text-center py-2 px-1 rounded-lg text-xs font-medium',
                    isAcceptance ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-400'
                  )}>
                    {month}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Activo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Aceptación</span>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL TAB */}
      {tab === 'historial' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Historial de Actividad</h3>
          {/* Static creation event */}
          <div className="flex items-start gap-3 py-3 border-b border-slate-50">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs">✅</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Proyecto creado</p>
              <p className="text-xs text-slate-500">ID: {opp.id} · {formatDate(opp.date)} · Sistema</p>
            </div>
          </div>
          {/* Dynamic logs */}
          {activityLogs.length > 0 ? activityLogs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">📝</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 capitalize">{log.action}</p>
                <p className="text-xs text-slate-500">{formatDate(log.createdAt)} · {log.performedBy}</p>
              </div>
            </div>
          )) : (
            <p className="text-xs text-slate-400 py-4">Sin actividad registrada adicional</p>
          )}
          {/* Last updated */}
          <div className="flex items-start gap-3 py-3">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs">🔄</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Última actualización</p>
              <p className="text-xs text-slate-500">{formatDate(opp.updatedAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
