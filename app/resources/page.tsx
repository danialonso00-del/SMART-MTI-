'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Building2, Filter } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency, formatCurrencyCompact, getCompanyColor, cn } from '@/lib/utils';

interface SalaryRecord {
  id: string; year: number; month: number; salaryForecast: number;
  salaryReal: number; costHour: number; hoursMonthForecast: number; percent: number;
}

interface Employee {
  id: string; name: string; factorialName: string | null; company: string;
  department: string; isActive: boolean; hourlyCost: number; monthlySalary: number;
  availability: number; salaries: SalaryRecord[]; latestSalary: SalaryRecord | null;
  salaryHistory: SalaryRecord[];
}

interface ApiResponse {
  employees: Employee[];
  stats: { totalEmployees: number; activeEmployees: number; totalMonthlyCost: number; avgCostHour: number };
  filters: { companies: string[]; departments: string[] };
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function SlideOver({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const chartData = employee.salaryHistory.map(s => ({
    name: `${MONTH_NAMES[s.month - 1]} ${String(s.year).slice(2)}`,
    previsto: s.salaryForecast,
    real:     s.salaryReal,
    costHour: s.costHour,
  }));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-700">{employee.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{employee.name}</h2>
              <p className="text-xs text-slate-500">{employee.department} · {employee.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 mb-1">Coste/Hora</p>
              <p className="text-base font-bold text-amber-900">{employee.hourlyCost}€/h</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 mb-1">Salario Mensual</p>
              <p className="text-base font-bold text-emerald-900">{formatCurrencyCompact(employee.monthlySalary)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">Disponibilidad</p>
              <p className="text-base font-bold text-blue-900">{employee.availability}%</p>
            </div>
          </div>

          {/* Factorial */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-slate-600">Factorial vinculado</span>
            <span className="text-sm">
              {employee.factorialName ? `✅ ${employee.factorialName}` : '⚪ No vinculado'}
            </span>
          </div>

          {/* Salary chart */}
          {chartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial Salarial</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 5, bottom: 0, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="previsto" fill="#E2E8F0" radius={[2,2,0,0]} name="Previsto" />
                  <Bar dataKey="real"     fill="#F59E0B" radius={[2,2,0,0]} name="Real" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Salary table */}
          {employee.salaryHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Detalle Mensual</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Mes', 'Previsto', 'Real', '€/hora', 'Horas'].map(h => (
                        <th key={h} className="text-left text-slate-500 px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {employee.salaryHistory.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{MONTH_NAMES[s.month - 1]} {s.year}</td>
                        <td className="px-3 py-2">{formatCurrencyCompact(s.salaryForecast)}</td>
                        <td className="px-3 py-2 font-semibold">{formatCurrencyCompact(s.salaryReal)}</td>
                        <td className="px-3 py-2">{s.costHour.toFixed(1)}€</td>
                        <td className="px-3 py-2">{s.hoursMonthForecast}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!apiData) return [];
    let data = [...apiData.employees];
    if (companyFilter !== 'all') data = data.filter(e => e.company === companyFilter);
    if (deptFilter    !== 'all') data = data.filter(e => e.department === deptFilter);
    if (activeFilter  !== 'all') data = data.filter(e => String(e.isActive) === activeFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q)
      );
    }
    return data;
  }, [apiData, companyFilter, deptFilter, activeFilter, search]);

  const hasFilters = companyFilter !== 'all' || deptFilter !== 'all' || activeFilter !== 'all' || search;

  function resetFilters() {
    setCompanyFilter('all');
    setDeptFilter('all');
    setActiveFilter('all');
    setSearch('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = apiData?.stats ?? { totalEmployees: 0, activeEmployees: 0, totalMonthlyCost: 0, avgCostHour: 0 };

  return (
    <div className="space-y-4 pb-8">
      {selectedEmployee && (
        <SlideOver employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}

      <PageHeader
        title="Recursos / Personal"
        subtitle="Gestión de equipo humano y costes"
        badge={`${stats.totalEmployees} empleados`}
      />

      {/* Factorial info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Building2 size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Integración con Factorial</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Los datos de empleados se sincronizarán automáticamente con Factorial HR.
            Los empleados marcados con ✅ ya están vinculados. Activa la integración en Configuración → Integraciones.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Total Empleados</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-emerald-600 mb-1">Empleados Activos</p>
          <p className="text-2xl font-bold text-emerald-800">{stats.activeEmployees}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-amber-600 mb-1">Coste Mensual Total</p>
          <p className="text-2xl font-bold text-amber-800">{formatCurrencyCompact(stats.totalMonthlyCost)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-blue-600 mb-1">Coste/Hora Medio</p>
          <p className="text-2xl font-bold text-blue-800">{stats.avgCostHour.toFixed(0)}€/h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empleado, departamento, empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Empresa</label>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
              <option value="all">Todas</option>
              {apiData?.filters.companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
              <option value="all">Todos</option>
              {apiData?.filters.departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-slate-500 pb-2">
              Mostrando <span className="font-bold text-slate-800">{filtered.length}</span> de {stats.totalEmployees}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['ID', 'Nombre', 'Empresa', 'Departamento', 'Factorial', 'Coste/Hora', 'Salario Mensual', 'Estado'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400 py-12 text-sm">
                    No se encontraron empleados con los filtros actuales
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr
                  key={emp.id}
                  className="hover:bg-amber-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedEmployee(emp)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {emp.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-700">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-800">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', getCompanyColor(emp.company))}>
                      {emp.company}
                    </span>
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
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {filtered.length} empleados · Coste mensual filtrado:{' '}
            <span className="font-bold text-slate-800">
              {formatCurrencyCompact(filtered.filter(e => e.isActive).reduce((s, e) => s + e.monthlySalary, 0))}
            </span>
          </p>
          <p className="text-xs text-slate-400">Haz clic en una fila para ver el detalle</p>
        </div>
      </div>
    </div>
  );
}
