'use client';

import { useState, useEffect } from 'react';
import {
  Users, Shield, Building, Tag, Briefcase, UserCheck, Globe, Sliders,
  Plus, Edit2, Trash2, Loader2, ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'usuarios',   label: 'Usuarios',          icon: Users },
  { id: 'empleados',  label: 'Empleados',          icon: Users },
  { id: 'roles',      label: 'Roles',              icon: Shield },
  { id: 'companies',  label: 'Empresas',           icon: Building },
  { id: 'status',     label: 'Estados',            icon: Tag },
  { id: 'lineas',     label: 'Líneas de Negocio',  icon: Briefcase },
  { id: 'owners',     label: 'Owners',             icon: UserCheck },
  { id: 'paises',     label: 'Países',             icon: Globe },
  { id: 'general',    label: 'General',            icon: Sliders },
];

const MOCK_USERS = [
  { id: 1, name: 'Dani Alonso',   email: 'dalonso@mingothings.com',  role: 'Admin',    company: 'MTI',       active: true,  lastLogin: '10 May 2026' },
  { id: 2, name: 'Sergio García', email: 'sgarcia@mingothings.com',  role: 'Manager',  company: 'MTI',       active: true,  lastLogin: '10 May 2026' },
  { id: 3, name: 'JML',           email: 'jml@mingothings.com',      role: 'Manager',  company: 'BCN',       active: true,  lastLogin: '09 May 2026' },
  { id: 4, name: 'FDB',           email: 'fdb@mingothings.com',      role: 'Director', company: 'MTI',       active: true,  lastLogin: '08 May 2026' },
  { id: 5, name: 'Jordi Pol',     email: 'jpol@mingothings.com',     role: 'Director', company: 'MTI',       active: true,  lastLogin: '07 May 2026' },
  { id: 6, name: 'Chadi',         email: 'chadi@mingothings.com',    role: 'Director', company: 'MTI ARABIA', active: true, lastLogin: '06 May 2026' },
  { id: 7, name: 'Maria',         email: 'maria@mingothings.com',    role: 'User',     company: 'MTI',       active: true,  lastLogin: '05 May 2026' },
  { id: 8, name: 'Carles',        email: 'carles@mingothings.com',   role: 'User',     company: 'BCN',       active: true,  lastLogin: '04 May 2026' },
  { id: 9, name: 'Thiery',        email: 'thiery@mingothings.com',   role: 'User',     company: 'MTI ARABIA', active: false, lastLogin: '20 Apr 2026' },
  { id: 10, name: 'Oscar',        email: 'oscar@mingothings.com',    role: 'User',     company: 'MTI',       active: false, lastLogin: '15 Apr 2026' },
];

const MOCK_ROLES = [
  { id: 1, name: 'Admin',    description: 'Acceso total al sistema',                   users: 1, color: 'red' },
  { id: 2, name: 'Director', description: 'Gestión de área y reporting',               users: 3, color: 'amber' },
  { id: 3, name: 'Manager',  description: 'Gestión de proyectos y oportunidades',      users: 2, color: 'blue' },
  { id: 4, name: 'User',     description: 'Acceso lectura y edición básica',           users: 4, color: 'slate' },
];

const MOCK_COMPANIES = [
  { id: 1, name: 'MTI',            fullName: 'Mingothings Tecnología e Innovación SL', country: 'España',      color: '#F59E0B', active: true },
  { id: 2, name: 'MTi',            fullName: 'MTi International',                      country: 'España',      color: '#FBBF24', active: true },
  { id: 3, name: 'MTI ARABIA',     fullName: 'MTI Arabia FZ-LLC',                      country: 'Arabia Saudí', color: '#F97316', active: true },
  { id: 4, name: 'BCN',            fullName: 'BCN Technology SL',                      country: 'España',      color: '#3B82F6', active: true },
  { id: 5, name: 'DIPRO',          fullName: 'DIPRO Solutions SL',                     country: 'España',      color: '#8B5CF6', active: true },
  { id: 6, name: 'INGECO',         fullName: 'INGECO SA',                              country: 'España',      color: '#10B981', active: false },
  { id: 7, name: 'MARINA EYE-CAM', fullName: 'Marina Eye-Cam SL',                     country: 'España',      color: '#06B6D4', active: false },
];

const MOCK_STATUS = [
  { code: 2, label: 'Oportunidad',   color: 'blue',    category: 'Presales', description: 'Oportunidad detectada, sin análisis' },
  { code: 3, label: 'Req. Gathering',color: 'indigo',  category: 'Presales', description: 'Recopilación de requisitos del cliente' },
  { code: 4, label: 'Solution Def.', color: 'violet',  category: 'Presales', description: 'Definición y diseño de solución' },
  { code: 5, label: 'Neg. Contrato', color: 'amber',   category: 'Presales', description: 'Negociación y cierre de contrato' },
  { code: 6, label: 'Ganado',        color: 'emerald', category: 'Won',      description: 'Contrato firmado, pendiente inicio' },
  { code: 7, label: 'Delivering',    color: 'teal',    category: 'Proyecto', description: 'Proyecto en ejecución activa' },
  { code: 8, label: 'Finalizado',    color: 'slate',   category: 'Proyecto', description: 'Proyecto completado y cerrado' },
  { code: 9, label: 'Perdido',       color: 'red',     category: 'Perdido',  description: 'Oportunidad perdida o descartada' },
];

const MOCK_BUSINESS_LINES = [
  { id: 1, name: 'Hardware',    key: 'hardware',    description: 'Suministro e instalación de hardware',              color: '#F59E0B', active: true },
  { id: 2, name: 'IA',          key: 'ia',          description: 'Desarrollo de inteligencia artificial y ML',         color: '#3B82F6', active: true },
  { id: 3, name: 'BIM',         key: 'bim',         description: 'Building Information Modeling y gemelo digital',    color: '#8B5CF6', active: true },
  { id: 4, name: 'TTIO/O&M',   key: 'ttioOm',      description: 'IoT, telemetría y operación & mantenimiento',        color: '#10B981', active: true },
  { id: 5, name: 'Eventos',     key: 'events',      description: 'Diseño y gestión de eventos (stands, MWC...)',       color: '#F97316', active: true },
  { id: 6, name: 'Pro Services',key: 'proservices', description: 'Servicios profesionales y consultoría',             color: '#06B6D4', active: true },
];

const MOCK_COUNTRIES = [
  { id: 1, name: 'Spain',        code: 'ES', flag: '🇪🇸', opportunities: 32 },
  { id: 2, name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', opportunities: 5 },
  { id: 3, name: 'Malaysia',     code: 'MY', flag: '🇲🇾', opportunities: 6 },
  { id: 4, name: 'Singapore',    code: 'SG', flag: '🇸🇬', opportunities: 2 },
  { id: 5, name: 'Kenya',        code: 'KE', flag: '🇰🇪', opportunities: 1 },
  { id: 6, name: 'Uzbekistan',   code: 'UZ', flag: '🇺🇿', opportunities: 1 },
  { id: 7, name: 'Costa Rica',   code: 'CR', flag: '🇨🇷', opportunities: 1 },
];

interface Employee {
  id: string;
  name: string;
  company: string;
  department: string;
  isActive: boolean;
  email: string | null;
  hourlyCost: number;
  monthlySalary: number;
  availability: number;
  factorialId: string | null;
  latestSalary: { salaryReal: number; costHour: number } | null;
}

const DEPT_COLORS: Record<string, string> = {
  'General': 'bg-slate-100 text-slate-600',
  'Engineering': 'bg-blue-100 text-blue-700',
  'Sales': 'bg-amber-100 text-amber-700',
  'Management': 'bg-violet-100 text-violet-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Finance': 'bg-emerald-100 text-emerald-700',
};
function deptColor(dept: string) {
  return DEPT_COLORS[dept] ?? 'bg-slate-100 text-slate-600';
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('usuarios');

  // Employees & owners data from API
  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesFilter, setEmployeesFilter]   = useState('');
  const [empCompanyFilter, setEmpCompanyFilter] = useState('');
  const [ownerSearch, setOwnerSearch]           = useState('');

  useEffect(() => {
    if (activeTab === 'owners' || activeTab === 'empleados') {
      if (employees.length > 0) return; // already loaded
      setEmployeesLoading(true);
      fetch('/api/employees')
        .then(r => r.json())
        .then(d => { setEmployees(d.employees ?? []); setEmployeesLoading(false); })
        .catch(() => setEmployeesLoading(false));
    }
  }, [activeTab, employees.length]);

  const companies = Array.from(new Set(employees.map(e => e.company))).sort();

  const filteredEmployees = employees.filter(e => {
    const matchSearch = !employeesFilter ||
      e.name.toLowerCase().includes(employeesFilter.toLowerCase()) ||
      (e.department ?? '').toLowerCase().includes(employeesFilter.toLowerCase());
    const matchCompany = !empCompanyFilter || e.company === empCompanyFilter;
    return matchSearch && matchCompany;
  });

  const filteredOwners = employees.filter(e =>
    !ownerSearch || e.name.toLowerCase().includes(ownerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Configuración"
        subtitle="Administración del sistema MTI Business Control"
      />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── USUARIOS ── */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Usuarios del Sistema</h2>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  <Plus size={16} /> Nuevo Usuario
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Nombre</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Email</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Rol</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Empresa</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Estado</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Último acceso</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MOCK_USERS.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-amber-700">{user.name.charAt(0)}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                            user.role === 'Admin'    ? 'bg-red-100 text-red-700' :
                            user.role === 'Director' ? 'bg-amber-100 text-amber-700' :
                            user.role === 'Manager'  ? 'bg-blue-100 text-blue-700' :
                                                       'bg-slate-100 text-slate-600')}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{user.company}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                            user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', user.active ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {user.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{user.lastLogin}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPLEADOS ── */}
          {activeTab === 'empleados' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold text-slate-900">Empleados</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={empCompanyFilter}
                    onChange={e => setEmpCompanyFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="">Todas las empresas</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Buscar empleado..."
                    value={employeesFilter}
                    onChange={e => setEmployeesFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {employeesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 size={28} className="animate-spin text-amber-500" />
                </div>
              ) : (
                <>
                  {/* Summary chips */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium">
                      {employees.filter(e => e.isActive).length} activos
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full font-medium">
                      {employees.filter(e => !e.isActive).length} inactivos
                    </span>
                    {companies.map(c => (
                      <span key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
                        {c}: {employees.filter(e => e.company === c && e.isActive).length}
                      </span>
                    ))}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Empleado</th>
                          <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Empresa</th>
                          <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Departamento</th>
                          <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Coste/h</th>
                          <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Factorial</th>
                          <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map(emp => (
                          <tr key={emp.id} className={cn('hover:bg-slate-50 transition-colors', !emp.isActive && 'opacity-60')}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-amber-700">{emp.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{emp.name}</p>
                                  {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-700">{emp.company}</td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', deptColor(emp.department))}>
                                {emp.department}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-slate-700">
                              {emp.latestSalary?.costHour
                                ? `${emp.latestSalary.costHour.toFixed(2)} €/h`
                                : emp.hourlyCost > 0 ? `${emp.hourlyCost.toFixed(2)} €/h` : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {emp.factorialId ? (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Vinculado</span>
                              ) : (
                                <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Sin vincular</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                                emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', emp.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                                {emp.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredEmployees.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                              No hay empleados que coincidan con los filtros
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ROLES ── */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Roles y Permisos</h2>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  <Plus size={16} /> Nuevo Rol
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {MOCK_ROLES.map(role => (
                  <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{role.name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{role.users} usuarios</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COMPANIES ── */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Empresas del Grupo</h2>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  <Plus size={16} /> Nueva Empresa
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Código</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Nombre Completo</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">País</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Color</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Estado</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MOCK_COMPANIES.map(company => (
                      <tr key={company.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-xs px-2 py-1 rounded-lg text-white" style={{ background: company.color }}>
                            {company.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{company.fullName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{company.country}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="w-6 h-6 rounded-lg mx-auto" style={{ background: company.color }} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                            company.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                            {company.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ESTADOS ── */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Estados del Pipeline</h2>
              <div className="grid grid-cols-1 gap-3">
                {MOCK_STATUS.map(s => (
                  <div key={s.code} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-600">{s.code}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-slate-800">{s.label}</span>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
                          s.category === 'Presales' ? 'bg-blue-100 text-blue-600' :
                          s.category === 'Won'      ? 'bg-emerald-100 text-emerald-600' :
                          s.category === 'Proyecto' ? 'bg-teal-100 text-teal-600' :
                                                       'bg-red-100 text-red-600')}>
                          {s.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{s.description}</p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                      <Edit2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LÍNEAS DE NEGOCIO ── */}
          {activeTab === 'lineas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Líneas de Negocio</h2>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  <Plus size={16} /> Nueva Línea
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {MOCK_BUSINESS_LINES.map(bl => (
                  <div key={bl.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${bl.color}20` }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: bl.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{bl.name}</p>
                      <p className="text-xs text-slate-400 truncate">{bl.description}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', bl.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                      {bl.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OWNERS ── */}
          {activeTab === 'owners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Owners Comerciales</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Datos sincronizados desde la tabla de empleados de la BD</p>
                </div>
                <input
                  type="text"
                  placeholder="Buscar owner..."
                  value={ownerSearch}
                  onChange={e => setOwnerSearch(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {employeesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 size={28} className="animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredOwners.map(emp => (
                    <div key={emp.id} className={cn(
                      'bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm',
                      !emp.isActive && 'opacity-60'
                    )}>
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-amber-700">{emp.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {emp.department} · {emp.company}
                          {emp.email && ` · ${emp.email}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          emp.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                          {emp.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        {emp.factorialId && (
                          <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">
                            Factorial
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredOwners.length === 0 && !employeesLoading && (
                    <div className="col-span-2 py-10 text-center text-sm text-slate-400">
                      No hay owners que coincidan con la búsqueda
                    </div>
                  )}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                <strong>Nota:</strong> Los owners se obtienen directamente de la tabla de empleados.
                Para añadir o modificar un owner, actualiza el registro de empleado correspondiente.
                El campo <code className="bg-amber-100 px-1 rounded">owner</code> en las oportunidades debe
                coincidir exactamente con el nombre del empleado.
              </div>
            </div>
          )}

          {/* ── PAÍSES ── */}
          {activeTab === 'paises' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Países</h2>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  <Plus size={16} /> Añadir País
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MOCK_COUNTRIES.map(country => (
                  <div key={country.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <span className="text-3xl">{country.flag}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">{country.name}</p>
                      <p className="text-xs text-slate-400">Código: {country.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{country.opportunities}</p>
                      <p className="text-xs text-slate-400">proyectos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GENERAL ── */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Configuración General</h2>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700">Información de la Organización</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre de la Organización</label>
                    <input type="text" defaultValue="MTI Group Mingothings" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">CIF / NIF</label>
                    <input type="text" defaultValue="B12345678" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Principal</label>
                    <input type="email" defaultValue="info@mingothings.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Moneda por Defecto</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50">
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - Dólar</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700">Integraciones</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Factorial HR', desc: 'Sincronización de empleados y costes de proyecto', status: 'connected' },
                    { name: 'Google Drive', desc: 'Creación automática de carpetas de proyecto', status: 'pending' },
                    { name: 'Sage 50',      desc: 'Importación de asientos contables',             status: 'connected' },
                  ].map((int, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{int.name}</p>
                        <p className="text-xs text-slate-400">{int.desc}</p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                        int.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                        {int.status === 'connected' ? 'Conectado' : 'Pendiente configurar'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-600">Google Drive — Configuración pendiente</p>
                  <p>Para activar la integración de Drive, rellena en <code className="bg-slate-200 px-1 rounded">.env</code>:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li><code>GOOGLE_SERVICE_ACCOUNT_KEY</code> — JSON de la cuenta de servicio</li>
                    <li><code>GOOGLE_DRIVE_TEMPLATE_FOLDER_ID</code> — ID de la carpeta <em>_ESTRUCTURA CARPETAS</em></li>
                    <li><code>GOOGLE_DRIVE_DESTINATION_FOLDER_ID</code> — ID de la carpeta <em>00_PRE-VENTAS</em></li>
                  </ul>
                  <p className="mt-1">Encuentra el ID de una carpeta en la URL de Google Drive: <code>drive.google.com/drive/folders/<strong>ESTE_ID</strong></code></p>
                  <a
                    href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-600 hover:underline mt-1"
                  >
                    Google Cloud Console <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700">Preferencias del Sistema</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Notificaciones por email', description: 'Recibir alertas de nuevas oportunidades y cambios de estado' },
                    { label: 'Sincronización automática', description: 'Sincronizar datos automáticamente cada 24 horas' },
                    { label: 'Modo oscuro', description: 'Activar tema oscuro en la interfaz' },
                    { label: 'Mostrar moneda base en USD', description: 'Convertir automáticamente USD a EUR en el dashboard' },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{pref.label}</p>
                        <p className="text-xs text-slate-400">{pref.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
