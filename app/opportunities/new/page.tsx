'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { WORLD_COUNTRIES, COMPANY_OPTIONS } from '@/components/ui/EditOpportunityModal';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '2', label: '2 - Oportunidad' },
  { value: '3', label: '3 - Req. Gathering' },
  { value: '4', label: '4 - Sol. Definition' },
  { value: '5', label: '5 - Contract Neg.' },
  { value: '6', label: '6 - Aceptado/Won' },
  { value: '7', label: '7 - Delivering' },
  { value: '8', label: '8 - Finalizado' },
  { value: '9', label: '9 - Perdido' },
];

const CURRENCY_OPTIONS = ['EUR', 'USD'];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FormField({
  label, required, helper, children, className,
}: {
  label: string; required?: boolean; helper?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-amber-500 ml-1">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-slate-400">{helper}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all';
const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all';

export default function NewOpportunityPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [id, setId]           = useState('');
  const [name, setName]       = useState('');
  const [client, setClient]   = useState('');
  const [description, setDescription] = useState('');

  const [status, setStatus]   = useState('2');
  const [company, setCompany] = useState('MTI');
  const [owner, setOwner]     = useState('');
  const [country, setCountry] = useState('Spain');
  const [date, setDate]       = useState(today);
  const [expectedClosingDate, setExpectedClosingDate] = useState('');

  const [currency, setCurrency]         = useState('EUR');

  const [blHardware,    setBlHardware]    = useState('0');
  const [blIa,          setBlIa]          = useState('0');
  const [blBim,         setBlBim]         = useState('0');
  const [blTtioOm,      setBlTtioOm]      = useState('0');
  const [blEvents,      setBlEvents]      = useState('0');
  const [blProservices, setBlProservices] = useState('0');

  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);
  const [ownerOptions, setOwnerOptions]           = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const statusCode = parseInt(status);
  const isProject  = statusCode >= 6;

  const amount = (
    (parseFloat(blHardware)    || 0) +
    (parseFloat(blIa)          || 0) +
    (parseFloat(blBim)         || 0) +
    (parseFloat(blTtioOm)      || 0) +
    (parseFloat(blEvents)      || 0) +
    (parseFloat(blProservices) || 0)
  ).toFixed(2);

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then((data: { name: string }[]) => {
        if (Array.isArray(data)) setClientSuggestions(data.map(c => c.name));
      })
      .catch(() => {});

    fetch('/api/employees?isActive=true')
      .then(r => r.json())
      .then(data => {
        if (data.employees) {
          setOwnerOptions(data.employees.map((e: { name: string }) => e.name).sort());
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const finalId =
      id.trim() !== ''
        ? id.trim()
        : `${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 900 + 100)}`;

    const computedAmount = parseFloat(amount) || 0;

    const payload = {
      id: finalId,
      opportunity: name,
      client,
      description,
      statusCode,
      company,
      owner,
      country,
      date,
      expectedClosingDate: expectedClosingDate || null,
      amount:           computedAmount,
      currency,
      probability:      isProject ? 100 : 50,
      costs:            0,
      totalInvoiced:    0,
      blHardware:       parseFloat(blHardware)     || 0,
      blIa:             parseFloat(blIa)           || 0,
      blBim:            parseFloat(blBim)          || 0,
      blTtioOm:         parseFloat(blTtioOm)       || 0,
      blEvents:         parseFloat(blEvents)       || 0,
      blProservices:    parseFloat(blProservices)  || 0,
      weightedPipeline: computedAmount * (isProject ? 1 : 0.5),
      materialCost:     0,
      peopleCost:       0,
      margin:           0,
      pendingToInvoice: computedAmount,
      wipStatus:        0,
      totalPercentage:  0,
      isInternal:       false,
    };

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }

      const created = await res.json();
      router.push(`/projects/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      <PageHeader
        title="Nueva Oportunidad / Proyecto"
        subtitle="Registra una nueva oportunidad de negocio o proyecto"
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
            Volver
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 0 - Empresa (primero) */}
        <SectionCard title="Empresa">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FormField label="Empresa" required className="sm:col-span-1">
              <select value={company} onChange={e => setCompany(e.target.value)} required className={selectClass}>
                {COMPANY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="ID" helper="Déjalo vacío para auto-generar" className="sm:col-span-1">
              <input
                type="text"
                value={id}
                onChange={e => setId(e.target.value)}
                placeholder="26-200"
                className={inputClass}
              />
            </FormField>
            <FormField label="Estado" required className="sm:col-span-1">
              <select value={status} onChange={e => setStatus(e.target.value)} required className={selectClass}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
          </div>
        </SectionCard>

        {/* Section 1 - Información Básica */}
        <SectionCard title="Información Básica">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Nombre / Oportunidad" required>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Descripción corta del proyecto"
                required
                className={inputClass}
              />
            </FormField>

            <FormField label="Cliente" required>
              <input
                type="text"
                value={client}
                onChange={e => setClient(e.target.value)}
                list="client-suggestions"
                placeholder="Nombre del cliente"
                required
                className={inputClass}
              />
              <datalist id="client-suggestions">
                {clientSuggestions.map(c => <option key={c} value={c} />)}
              </datalist>
            </FormField>

            <FormField label="Descripción" className="sm:col-span-2">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción detallada (opcional)"
                rows={3}
                className={cn(inputClass, 'resize-none')}
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Section 2 - Clasificación */}
        <SectionCard title="Clasificación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Owner / Responsable" required>
              {ownerOptions.length > 0 ? (
                <select value={owner} onChange={e => setOwner(e.target.value)} required className={selectClass}>
                  <option value="">— Seleccionar responsable —</option>
                  {ownerOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  placeholder="Nombre del responsable"
                  required
                  className={inputClass}
                />
              )}
            </FormField>

            <FormField label="País">
              <select value={country} onChange={e => setCountry(e.target.value)} className={selectClass}>
                {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Fecha" required>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </FormField>

            <FormField label="Fecha Cierre Esperada">
              <input
                type="date"
                value={expectedClosingDate}
                onChange={e => setExpectedClosingDate(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Section 3 - Líneas de Negocio */}
        <SectionCard title="Líneas de Negocio">
          <p className="text-xs text-slate-400 mb-4">
            Introduce el importe por línea de negocio. El total se calculará automáticamente.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              ['Hardware', blHardware, setBlHardware],
              ['IA', blIa, setBlIa],
              ['BIM', blBim, setBlBim],
              ['TTIO / O&M', blTtioOm, setBlTtioOm],
              ['Eventos', blEvents, setBlEvents],
              ['Pro Services', blProservices, setBlProservices],
            ].map(([label, value, setter]) => (
              <FormField key={label as string} label={label as string}>
                <input
                  type="number"
                  value={value as string}
                  onChange={e => (setter as (v: string) => void)(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </FormField>
            ))}
          </div>
        </SectionCard>

        {/* Section 4 - Importes (auto-calculado) */}
        <SectionCard title="Importes">
          <p className="text-xs text-slate-400 mb-4">
            El importe total se calcula automáticamente a partir de las líneas de negocio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Importe Total" helper="Calculado automáticamente">
              <input
                type="number"
                value={amount}
                readOnly
                tabIndex={-1}
                className={cn(inputClass, 'bg-slate-50 text-slate-500 cursor-not-allowed')}
              />
            </FormField>
            <FormField label="Moneda">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectClass}>
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
          </div>
        </SectionCard>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all',
            submitting
              ? 'bg-amber-300 text-amber-800 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
          )}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {isProject ? 'Crear Proyecto' : 'Crear Oportunidad'}
        </button>
      </form>
    </div>
  );
}
