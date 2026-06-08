'use client';

import { useState, useRef } from 'react';
import {
  Upload, CheckCircle, AlertTriangle, X, ChevronRight, ChevronLeft,
  FileSpreadsheet, Eye, Columns, List, AlertCircle, Check,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Subir Archivo', icon: Upload },
  { id: 2, label: 'Detectar Columnas', icon: Columns },
  { id: 3, label: 'Mapear Campos', icon: List },
  { id: 4, label: 'Validar Datos', icon: AlertTriangle },
  { id: 5, label: 'Vista Previa', icon: Eye },
  { id: 6, label: 'Confirmar', icon: CheckCircle },
];

const DETECTED_COLUMNS = [
  'ID', 'CLIENTE', 'FECHA', 'OPORTUNIDAD', 'DESCRIPCION', 'IMPORTE', 'MONEDA',
  'STATUS', 'EMPRESA', 'PROBABILIDAD', 'OWNER', 'PAIS', 'FECHA CIERRE',
  'HARDWARE', 'IA', 'BIM', 'TTIO/OM', 'EVENTOS', 'PROSERVICIOS',
  'COSTES', 'COSTE MATERIAL', 'COSTE PERSONAS', 'MARGEN',
  'TOTAL FACTURADO', 'PENDIENTE FACTURAR', 'WIP%',
];

const FIELD_MAPPING: { source: string; target: string; required: boolean }[] = [
  { source: 'ID', target: 'id', required: true },
  { source: 'CLIENTE', target: 'client', required: true },
  { source: 'FECHA', target: 'date', required: true },
  { source: 'OPORTUNIDAD', target: 'opportunity', required: true },
  { source: 'IMPORTE', target: 'amount', required: true },
  { source: 'MONEDA', target: 'currency', required: false },
  { source: 'STATUS', target: 'statusCode', required: true },
  { source: 'EMPRESA', target: 'company', required: true },
  { source: 'PROBABILIDAD', target: 'probability', required: false },
  { source: 'OWNER', target: 'owner', required: true },
  { source: 'PAIS', target: 'country', required: false },
  { source: 'FECHA CIERRE', target: 'expectedClosingDate', required: false },
  { source: 'HARDWARE', target: 'businessLines.hardware', required: false },
  { source: 'IA', target: 'businessLines.ia', required: false },
  { source: 'BIM', target: 'businessLines.bim', required: false },
  { source: 'TOTAL FACTURADO', target: 'totalInvoiced', required: false },
  { source: 'PENDIENTE FACTURAR', target: 'pendingToInvoice', required: false },
  { source: 'WIP%', target: 'wipStatus', required: false },
];

const VALIDATION_RESULTS = [
  { type: 'error', message: 'Fila 12: Valor de importe inválido ("N/A")' },
  { type: 'error', message: 'Fila 23: STATUS desconocido ("Closed Won")' },
  { type: 'warning', message: 'Fila 7: FECHA CIERRE en formato incorrecto - se corregirá automáticamente' },
  { type: 'warning', message: 'Fila 15: PROBABILIDAD fuera de rango (105%) - se normalizará a 100%' },
  { type: 'warning', message: 'Fila 31: EMPRESA no reconocida ("MINI") - se asignará "MTI"' },
  { type: 'info', message: '3 registros duplicados detectados - se omitirán' },
  { type: 'info', message: '2 registros con IMPORTE=0 se importarán como oportunidades exploratorias' },
];

const PREVIEW_ROWS = [
  { id: '26-501', client: 'Ayuntamiento Madrid', opportunity: 'Smart Mobility Platform', amount: '480,000 €', status: 'Oportunidad', company: 'MTI', owner: 'DANI' },
  { id: '26-502', client: 'Barcelona Activa', opportunity: 'IA Inserción Laboral', amount: '95,500 €', status: 'Req. Gathering', company: 'BCN', owner: 'SERGIO' },
  { id: '26-503', client: 'Generalitat Catalunya', opportunity: 'Digital Twin Infraestructura', amount: '1,200,000 €', status: 'Solution Def.', company: 'MTI', owner: 'JML' },
  { id: '26-504', client: 'Aigues Barcelona', opportunity: 'Smart Metering IoT', amount: '320,000 €', status: 'Neg. Contrato', company: 'BCN', owner: 'DANI' },
  { id: '26-505', client: 'Transports Metropolitans', opportunity: 'Sistema Predicción Demanda', amount: '275,000 €', status: 'Oportunidad', company: 'BCN', owner: 'JML' },
  { id: '26-506', client: 'Hospital Vall Hebrón', opportunity: 'IA Diagnóstico Imagen', amount: '890,000 €', status: 'Solution Def.', company: 'MTI', owner: 'SERGIO' },
  { id: '26-507', client: 'Port de Tarragona', opportunity: 'Digitalización Terminal Química', amount: '545,000 €', status: 'Req. Gathering', company: 'MTI', owner: 'DANI' },
  { id: '26-508', client: 'Mercat de Santa Caterina', opportunity: 'Smart Building Sensors', amount: '78,500 €', status: 'Oportunidad', company: 'BCN', owner: 'CARLES' },
  { id: '26-509', client: 'Agbar', opportunity: 'Predictive Maintenance Water', amount: '412,000 €', status: 'Solution Def.', company: 'MTI', owner: 'JML' },
  { id: '26-510', client: 'Ferrocarrils Catalunya', opportunity: 'IoT Mantenimiento Vías', amount: '680,000 €', status: 'Req. Gathering', company: 'MTI', owner: 'SERGIO' },
];

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isImportDone, setIsImportDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = VALIDATION_RESULTS.filter(r => r.type === 'error');
  const warnings = VALIDATION_RESULTS.filter(r => r.type === 'warning');
  const infos = VALIDATION_RESULTS.filter(r => r.type === 'info');

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file.name);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  }

  function handleNext() {
    if (currentStep < 6) setCurrentStep(s => s + 1);
    else setIsImportDone(true);
  }

  function handlePrev() {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  }

  function handleReset() {
    setCurrentStep(1);
    setUploadedFile(null);
    setIsImportDone(false);
  }

  if (isImportDone) {
    return (
      <div className="space-y-4 pb-8">
        <PageHeader title="Importar Excel" subtitle="Asistente de importación de datos" />
        <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Importación Completada</h2>
          <p className="text-slate-500 mb-1">Se han importado <span className="font-bold text-slate-800">10 registros</span> correctamente.</p>
          <p className="text-slate-400 text-sm mb-8">2 registros con errores fueron omitidos. 3 duplicados omitidos.</p>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
            <div className="bg-emerald-50 rounded-xl py-3">
              <p className="text-2xl font-bold text-emerald-700">10</p>
              <p className="text-xs text-emerald-500">Importados</p>
            </div>
            <div className="bg-red-50 rounded-xl py-3">
              <p className="text-2xl font-bold text-red-700">2</p>
              <p className="text-xs text-red-500">Errores</p>
            </div>
            <div className="bg-amber-50 rounded-xl py-3">
              <p className="text-2xl font-bold text-amber-700">3</p>
              <p className="text-xs text-amber-500">Duplicados</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
          >
            Nueva Importación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Importar Excel"
        subtitle="Asistente paso a paso para importar datos desde Excel"
      />

      {/* Step indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isDisabled = step.id > currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isCompleted ? 'bg-emerald-500 text-white' :
                      isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-500/20' :
                      'bg-slate-100 text-slate-400'
                    )}
                  >
                    {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <p className={cn('text-xs font-medium mt-1.5 text-center hidden sm:block', isCurrent ? 'text-amber-700' : isCompleted ? 'text-emerald-600' : 'text-slate-400')}>
                    {step.label}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 mt-[-14px]', isCompleted ? 'bg-emerald-400' : 'bg-slate-200')} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 sm:hidden">
          Paso {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].label}
        </p>
      </div>

      {/* Step content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-96">

        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Subir Archivo Excel</h2>
              <p className="text-sm text-slate-500 mt-1">Arrastra tu archivo Excel (.xlsx) o haz clic para seleccionarlo</p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                isDragOver ? 'border-amber-500 bg-amber-50' :
                uploadedFile ? 'border-emerald-400 bg-emerald-50' :
                'border-slate-300 hover:border-amber-400 hover:bg-amber-50/30'
              )}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
              {uploadedFile ? (
                <div>
                  <FileSpreadsheet size={48} className="mx-auto text-emerald-500 mb-3" />
                  <p className="text-lg font-bold text-emerald-700">{uploadedFile}</p>
                  <p className="text-sm text-emerald-500 mt-1">Archivo listo para procesar</p>
                  <button
                    className="mt-3 text-xs text-slate-400 hover:text-slate-600"
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-lg font-semibold text-slate-600">Arrastra tu archivo aquí</p>
                  <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar</p>
                  <p className="text-xs text-slate-300 mt-3">Formatos soportados: .xlsx, .xls, .csv · Máx. 50MB</p>
                </div>
              )}
            </div>

            {!uploadedFile && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-xs font-semibold text-slate-700">Excel Nativo</p>
                  <p className="text-xs text-slate-400">Exporta directamente desde tu Excel de control</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl mb-1">🗂️</div>
                  <p className="text-xs font-semibold text-slate-700">Mapeo Automático</p>
                  <p className="text-xs text-slate-400">Detectamos las columnas automáticamente</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl mb-1">✅</div>
                  <p className="text-xs font-semibold text-slate-700">Validación Previa</p>
                  <p className="text-xs text-slate-400">Revisamos errores antes de importar</p>
                </div>
              </div>
            )}

            {!uploadedFile && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Para continuar la demo sin un archivo real, puedes avanzar directamente.
                  El sistema usará datos de ejemplo predefinidos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column detection */}
        {currentStep === 2 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Columnas Detectadas</h2>
              <p className="text-sm text-slate-500 mt-1">Hemos detectado {DETECTED_COLUMNS.length} columnas en tu archivo</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {DETECTED_COLUMNS.map((col) => (
                <div key={col} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{col}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs text-emerald-700">
                <span className="font-semibold">✓ Detección completada:</span> {DETECTED_COLUMNS.length} columnas identificadas.
                Iniciando mapeo automático de campos...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Field mapping */}
        {currentStep === 3 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Mapeo de Campos</h2>
              <p className="text-sm text-slate-500 mt-1">Verifica el mapeo entre las columnas de Excel y los campos del sistema</p>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Columna Excel</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Campo Sistema</th>
                    <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Requerido</th>
                    <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FIELD_MAPPING.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{m.source}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-600">{m.target}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {m.required ? (
                          <span className="text-xs text-red-600 font-semibold">Sí</span>
                        ) : (
                          <span className="text-xs text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <Check size={13} />
                          Mapeado
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 4: Validation */}
        {currentStep === 4 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Validación de Datos</h2>
              <p className="text-sm text-slate-500 mt-1">Resultado del análisis de calidad de datos</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-700">{errors.length}</p>
                <p className="text-xs text-red-500 mt-1">Errores</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-700">{warnings.length}</p>
                <p className="text-xs text-amber-500 mt-1">Advertencias</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{infos.length}</p>
                <p className="text-xs text-blue-500 mt-1">Información</p>
              </div>
            </div>
            <div className="space-y-2">
              {VALIDATION_RESULTS.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-xs',
                    r.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                    r.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  )}
                >
                  {r.type === 'error' ? <X size={14} className="shrink-0 mt-0.5" /> :
                   r.type === 'warning' ? <AlertTriangle size={14} className="shrink-0 mt-0.5" /> :
                   <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                  {r.message}
                </div>
              ))}
            </div>
            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                Los registros con errores serán omitidos. Los registros válidos se importarán correctamente.
              </div>
            )}
          </div>
        )}

        {/* Step 5: Preview */}
        {currentStep === 5 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Vista Previa</h2>
              <p className="text-sm text-slate-500 mt-1">Primeros 10 registros que se importarán</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">ID</th>
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">Cliente</th>
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">Oportunidad</th>
                    <th className="text-right font-semibold text-slate-500 px-3 py-2.5">Importe</th>
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">Estado</th>
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">Empresa</th>
                    <th className="text-left font-semibold text-slate-500 px-3 py-2.5">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PREVIEW_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-400">{row.id}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.client}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{row.opportunity}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{row.amount}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{row.status}</span>
                      </td>
                      <td className="px-3 py-2 font-bold text-amber-700">{row.company}</td>
                      <td className="px-3 py-2 text-slate-500">{row.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Mostrando 10 de 12 registros válidos (2 con errores omitidos)
            </p>
          </div>
        )}

        {/* Step 6: Confirmation */}
        {currentStep === 6 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet size={36} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Listo para Importar</h2>
            <p className="text-slate-500 mb-6">Se importarán los siguientes datos:</p>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-emerald-700">10</p>
                <p className="text-xs text-emerald-500 mt-1">Registros a importar</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-slate-700">5</p>
                <p className="text-xs text-slate-500 mt-1">Omitidos</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-amber-700">4</p>
                <p className="text-xs text-amber-500 mt-1">Nuevas oportunidades</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-700">6</p>
                <p className="text-xs text-blue-500 mt-1">Actualizaciones</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 max-w-sm mx-auto">
              Al confirmar, los datos se importarán permanentemente a la plataforma.
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors',
            currentStep === 1
              ? 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'
              : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
          )}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                step.id === currentStep ? 'w-6 bg-amber-500' :
                step.id < currentStep ? 'bg-emerald-400' :
                'bg-slate-200'
              )}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
        >
          {currentStep === 6 ? (
            <>
              <Check size={16} />
              Importar Ahora
            </>
          ) : (
            <>
              Siguiente
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
