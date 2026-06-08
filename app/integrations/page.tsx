'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet, Zap, Database, Globe, Check, AlertCircle,
  RefreshCw, Settings, ExternalLink, Key, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'ready' | 'future';
  icon: React.ReactNode;
  color: string;
  lastSync?: string;
  features: string[];
  hasConfig?: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'excel',
    name: 'Excel / CSV Import',
    description: 'Importación directa de datos desde archivos Excel o CSV. Soporte para el formato de control de negocio MTI con mapeo automático de columnas.',
    status: 'active',
    icon: <FileSpreadsheet size={28} />,
    color: 'emerald',
    lastSync: '10 May 2026, 09:32',
    features: ['Importación automática', 'Detección de columnas', 'Validación previa', 'Deduplicación', 'Historial de importaciones'],
    hasConfig: false,
  },
  {
    id: 'factorial',
    name: 'Factorial API',
    description: 'Integración con Factorial HR para sincronización de empleados, disponibilidad, costes de personal y proyectos asignados.',
    status: 'ready',
    icon: <Zap size={28} />,
    color: 'amber',
    features: ['Sync empleados', 'Disponibilidad en tiempo real', 'Costes hora actualizados', 'Proyectos asignados', 'Nóminas y contratos'],
    hasConfig: true,
  },
  {
    id: 'crm',
    name: 'CRM / Salesforce',
    description: 'Sincronización bidireccional con Salesforce CRM para gestión de oportunidades, cuentas y actividades comerciales.',
    status: 'future',
    icon: <Globe size={28} />,
    color: 'blue',
    features: ['Sync oportunidades', 'Gestión de cuentas', 'Pipeline unificado', 'Actividades comerciales', 'Reporting combinado'],
  },
  {
    id: 'erp',
    name: 'ERP / Finanzas',
    description: 'Conexión con sistema ERP para automatizar facturación, contabilidad y control financiero en tiempo real.',
    status: 'future',
    icon: <Database size={28} />,
    color: 'violet',
    features: ['Facturación automática', 'Contabilidad integrada', 'Control presupuestario', 'Reporting financiero', 'Cierre contable'],
  },
];

const statusConfig = {
  active: { label: 'Activo', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  ready: { label: 'Listo para configurar', bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  future: { label: 'Próximamente', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

const colorConfig = {
  emerald: { icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-300', header: 'bg-emerald-50' },
  amber: { icon: 'bg-amber-100 text-amber-600', border: 'border-amber-300', header: 'bg-amber-50' },
  blue: { icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200', header: 'bg-blue-50' },
  violet: { icon: 'bg-violet-100 text-violet-600', border: 'border-violet-200', header: 'bg-violet-50' },
};

function IntegrationCard({ integration }: { integration: Integration }) {
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const status = statusConfig[integration.status];
  const colors = colorConfig[integration.color as keyof typeof colorConfig];

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  return (
    <div className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all', integration.status !== 'future' ? 'hover:shadow-md' : 'opacity-75')}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b border-slate-100', colors.header)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm', colors.icon)}>
              {integration.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{integration.name}</h3>
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border mt-1', status.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {integration.status === 'active' && (
              <button
                onClick={handleSync}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Sincronizar"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              </button>
            )}
            {integration.status !== 'future' && (
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">{integration.description}</p>

        {/* Features */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Funcionalidades</p>
          <div className="grid grid-cols-1 gap-1.5">
            {integration.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check size={13} className={integration.status === 'future' ? 'text-slate-300' : 'text-emerald-500'} />
                <span className="text-xs text-slate-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last sync info */}
        {integration.lastSync && (
          <div className="mb-4 p-2 bg-emerald-50 rounded-lg">
            <p className="text-xs text-emerald-600">
              <span className="font-semibold">Última sincronización:</span> {integration.lastSync}
            </p>
          </div>
        )}

        {/* Factorial admin link */}
        {integration.hasConfig && integration.id === 'factorial' && (
          <div className="mb-4 space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <Key size={12} /> API Key configurada en <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code>
              </p>
            </div>
            <button
              onClick={() => router.push('/integrations/factorial')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors"
            >
              <span>Administrar integración Factorial</span>
              <ChevronRight size={16} />
            </button>
            <p className="text-xs text-slate-400">
              Mappings, sincronización de horas, costes reales por proyecto
            </p>
          </div>
        )}

        {/* Action button */}
        {!integration.hasConfig && (
          <div className="mt-4">
            {integration.status === 'active' ? (
              <div className="flex gap-2">
                <a
                  href="/import"
                  className="flex-1 text-center py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                >
                  Abrir Importación
                </a>
                <button className="px-3 py-2.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Ver Historial
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full py-2.5 text-sm font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed"
              >
                Disponible próximamente
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Integraciones"
        subtitle="Conecta MTI Business Control con tus herramientas y sistemas"
        badge="4 integraciones"
      />

      {/* Status overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Check size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-emerald-500">Activas</p>
            <p className="text-2xl font-bold text-emerald-800">1</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-500">Por configurar</p>
            <p className="text-2xl font-bold text-amber-800">1</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <RefreshCw size={20} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Próximamente</p>
            <p className="text-2xl font-bold text-slate-600">2</p>
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>

      {/* API docs callout */}
      <div className="bg-slate-900 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
          <Globe size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold mb-1">API REST MTI Business Control</h3>
          <p className="text-slate-400 text-sm mb-3">
            Accede a todos los datos de la plataforma a través de nuestra API REST.
            Integra con cualquier sistema externo usando autenticación Bearer token.
          </p>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors">
              Ver Documentación API
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors">
              Generar API Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
