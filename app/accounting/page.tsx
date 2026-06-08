'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Building2, RefreshCw } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

interface ImportResult {
  imported: number;
  incomeEntries: number;
  expenseEntries: number;
  matchedEntries: number;
  generalExpenseMTI: number;
  generalExpenseING: number;
  unmatchedProjectCodes: string[];
  projectsWithData: number;
}

export default function AccountingPage() {
  const [dragging, setDragging]     = useState(false);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [error, setError]           = useState('');
  const [fileName, setFileName]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function runImport(file: File) {
    setImporting(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/accounting/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runImport(file);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runImport(file);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contabilidad</h1>
        <p className="text-sm text-slate-500 mt-1">
          Importa el extracto de Sage 50 para vincular facturas y gastos a cada proyecto.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFile}
        />
        {importing ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-amber-500" size={36} />
            <p className="text-sm font-medium text-amber-700">Importando {fileName}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="text-slate-300" size={36} />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Arrastra aquí el CSV de Sage 50 o haz clic para seleccionarlo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formato: &quot;Extracto por planes analíticos&quot; · separador punto y coma
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">
              Importado correctamente: <strong>{result.imported.toLocaleString()}</strong> registros
              desde <strong>{fileName}</strong>
            </p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-500" />
                <p className="text-xs text-slate-500">Registros ingreso</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{result.incomeEntries.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">cuentas 7xx</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-400" />
                <p className="text-xs text-slate-500">Registros gasto</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{result.expenseEntries.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">cuentas 6xx</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-blue-500" />
                <p className="text-xs text-slate-500">Vinculados a proyecto</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{result.matchedEntries.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{result.projectsWithData} proyectos</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={14} className="text-violet-500" />
                <p className="text-xs text-slate-500">Gastos generales</p>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {(result.generalExpenseMTI + result.generalExpenseING).toLocaleString('es', { maximumFractionDigits: 0 })} €
              </p>
              <p className="text-xs text-slate-400 mt-0.5">MTI + ING</p>
            </div>
          </div>

          {/* General expenses breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 size={15} className="text-violet-500" /> Gastos Generales de Empresa
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <p className="text-xs text-violet-600 mb-1">MTI — GASTOS GENERALES MTI</p>
                <p className="text-lg font-bold text-violet-900">{formatCurrency(result.generalExpenseMTI)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-600 mb-1">ING — GASTOS GENERALES INGECO</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(result.generalExpenseING)}</p>
              </div>
            </div>
          </div>

          {/* Unmatched codes */}
          {result.unmatchedProjectCodes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {result.unmatchedProjectCodes.length} código(s) no encontrados en la base de datos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.unmatchedProjectCodes.map(c => (
                  <span key={c} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* How to view */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-600">
              Los datos ya están disponibles en cada ficha de proyecto, pestaña
              <strong> Contabilidad</strong>. Los registros se han vinculado automáticamente
              por código analítico.
            </p>
          </div>
        </div>
      )}

      {/* Instructions if no result yet */}
      {!result && !importing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Cómo exportar desde Sage 50</h3>
          <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
            <li>Abre Sage 50 → Informes → Contabilidad Analítica</li>
            <li>Selecciona <strong>&quot;Extracto por planes analíticos&quot;</strong></li>
            <li>Elige el rango de fechas deseado (recomendado: 01/01/YYYY al día de hoy)</li>
            <li>Exporta en formato CSV con separador <strong>punto y coma (;)</strong></li>
            <li>Arrastra el archivo aquí o usa el botón de selección</li>
          </ol>
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">
              <strong>Nota:</strong> Cada importación reemplaza los datos anteriores. Las cuentas
              6xx se tratan como gastos y las 7xx como ingresos. La vinculación se realiza por el
              código del plan analítico (ej. <code>227 →&nbsp;25-227</code>, <code>A400 →&nbsp;26-400</code>).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
