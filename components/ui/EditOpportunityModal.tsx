'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WORLD_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil',
  'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica',
  'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Guatemala', 'Honduras', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia',
  'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Moldova', 'Morocco',
  'Mozambique', 'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'Norway', 'Oman', 'Pakistan',
  'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa',
  'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Tanzania', 'Thailand',
  'Tunisia', 'Turkey', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay',
  'Venezuela', 'Vietnam', 'Zimbabwe',
];

export const COMPANY_OPTIONS = ['MTI', 'DIPRO', 'INGECO', 'BCN', 'MARINA EYE-CAM', 'MTI ARABIA'];

const STATUS_OPTIONS = [
  { value: 2, label: '2 - Oportunidad' },
  { value: 3, label: '3 - Req. Gathering' },
  { value: 4, label: '4 - Sol. Definition' },
  { value: 5, label: '5 - Contract Neg.' },
  { value: 6, label: '6 - Aceptado/Won' },
  { value: 7, label: '7 - Delivering' },
  { value: 8, label: '8 - Finalizado' },
  { value: 9, label: '9 - Perdido' },
];

const CURRENCY_OPTIONS = ['EUR', 'USD'];

const BL_KEYS = ['blHardware', 'blIa', 'blBim', 'blTtioOm', 'blEvents', 'blProservices'] as const;
const BL_LABELS: Record<string, string> = {
  blHardware: 'Hardware', blIa: 'IA', blBim: 'BIM',
  blTtioOm: 'TTIO/O&M', blEvents: 'Eventos', blProservices: 'Pro Services',
};

export interface EditableOpportunity {
  id: string;
  opportunity: string;
  client: string;
  description?: string | null;
  statusCode: number;
  company: string;
  owner: string;
  country: string;
  date: string;
  expectedClosingDate: string | null;
  acceptanceDate: string | null;
  amount: number;
  currency: string;
  probability: number;
  costs?: number | null;
  totalInvoiced: number;
  blHardware: number;
  blIa: number;
  blBim: number;
  blTtioOm: number;
  blEvents: number;
  blProservices: number;
}

interface Props {
  opportunity: EditableOpportunity;
  onClose: () => void;
  onSaved: (updated: EditableOpportunity) => void;
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all';
const selectCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
      {text}{required && <span className="text-amber-500 ml-1">*</span>}
    </label>
  );
}

export default function EditOpportunityModal({ opportunity, onClose, onSaved }: Props) {
  type FormState = Omit<EditableOpportunity, 'date' | 'expectedClosingDate' | 'acceptanceDate'> & {
    date: string;
    expectedClosingDate: string;
    acceptanceDate: string;
  };

  const [form, setForm] = useState<FormState>({
    ...opportunity,
    description: opportunity.description ?? '',
    costs: opportunity.costs ?? 0,
    date: opportunity.date?.slice(0, 10) ?? '',
    expectedClosingDate: opportunity.expectedClosingDate?.slice(0, 10) ?? '',
    acceptanceDate: opportunity.acceptanceDate?.slice(0, 10) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [owners, setOwners] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  const computedAmount = (
    (Number(form.blHardware)    || 0) +
    (Number(form.blIa)          || 0) +
    (Number(form.blBim)         || 0) +
    (Number(form.blTtioOm)      || 0) +
    (Number(form.blEvents)      || 0) +
    (Number(form.blProservices) || 0)
  );

  useEffect(() => {
    fetch('/api/employees?isActive=true')
      .then(r => r.json())
      .then(data => {
        if (data.employees) {
          setOwners(data.employees.map((e: { name: string }) => e.name).sort());
        }
      })
      .catch(() => {});
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setClients(data.map((c: { name: string }) => c.name));
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const isProject = form.statusCode >= 6;
      const payload = {
        ...form,
        statusCode:       form.statusCode,
        amount:           computedAmount,
        probability:      isProject ? 100 : (Number(form.probability) || 50),
        costs:            Number(form.costs)         || 0,
        totalInvoiced:    Number(form.totalInvoiced) || 0,
        blHardware:       Number(form.blHardware)    || 0,
        blIa:             Number(form.blIa)          || 0,
        blBim:            Number(form.blBim)         || 0,
        blTtioOm:         Number(form.blTtioOm)      || 0,
        blEvents:         Number(form.blEvents)      || 0,
        blProservices:    Number(form.blProservices) || 0,
        expectedClosingDate: form.expectedClosingDate || null,
        acceptanceDate:      form.acceptanceDate      || null,
      };
      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }
      const updated = await res.json();
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      setSaving(false);
    }
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Editar Registro</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{opportunity.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Empresa — at the top */}
          <div>
            <Label text="Empresa" required />
            <select value={form.company} onChange={e => set('company', e.target.value)} className={selectCls}>
              {COMPANY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Name + Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Nombre / Oportunidad" required />
              <input type="text" value={form.opportunity} onChange={e => set('opportunity', e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label text="Cliente" required />
              <input
                type="text"
                value={form.client}
                onChange={e => set('client', e.target.value)}
                list="edit-client-suggestions"
                className={inputCls}
              />
              <datalist id="edit-client-suggestions">
                {clients.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label text="Descripción" />
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          {/* Status + Owner + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label text="Estado" />
              <select value={form.statusCode} onChange={e => set('statusCode', Number(e.target.value))} className={selectCls}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label text="Owner / Responsable" required />
              {owners.length > 0 ? (
                <select value={form.owner} onChange={e => set('owner', e.target.value)} className={selectCls}>
                  {!owners.includes(form.owner) && <option value={form.owner}>{form.owner}</option>}
                  {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={form.owner} onChange={e => set('owner', e.target.value)} className={inputCls} />
              )}
            </div>
            <div>
              <Label text="País" />
              <select value={form.country} onChange={e => set('country', e.target.value)} className={selectCls}>
                {!WORLD_COUNTRIES.includes(form.country) && <option value={form.country}>{form.country}</option>}
                {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Fecha" />
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label text="Fecha Cierre Esperada" />
              <input type="date" value={form.expectedClosingDate} onChange={e => set('expectedClosingDate', e.target.value)} className={inputCls} />
            </div>
            {/* Acceptance date — visible when status is Won/Delivering/Finished */}
            {form.statusCode >= 6 && form.statusCode <= 8 && (
              <div className="sm:col-span-2">
                {!form.acceptanceDate && (
                  <div className="flex items-center gap-2 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Esta oportunidad está marcada como ganada pero no tiene fecha de aceptación registrada.
                    </p>
                  </div>
                )}
                <Label text="Fecha de Aceptación / Firma" required={form.statusCode >= 6 && form.statusCode <= 8} />
                <input
                  type="date"
                  value={form.acceptanceDate}
                  onChange={e => set('acceptanceDate', e.target.value)}
                  className={cn(inputCls, !form.acceptanceDate ? 'border-amber-300 focus:ring-amber-400' : '')}
                />
                <p className="text-xs text-slate-400 mt-1">Fecha en que se firmó o aceptó la oportunidad</p>
              </div>
            )}
          </div>

          {/* BL */}
          <div>
            <Label text="Líneas de Negocio" />
            <p className="text-xs text-slate-400 mb-2">El importe total se calcula automáticamente a partir de estas líneas.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BL_KEYS.map(k => (
                <div key={k}>
                  <p className="text-xs text-slate-500 mb-1">{BL_LABELS[k]}</p>
                  <input
                    type="number"
                    value={form[k]}
                    onChange={e => set(k, Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Amount + Currency (amount is read-only, auto-computed) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label text="Importe Total" />
              <input
                type="number"
                value={computedAmount.toFixed(2)}
                readOnly
                tabIndex={-1}
                className={cn(inputCls, 'bg-slate-50 text-slate-500 cursor-not-allowed')}
              />
              <p className="text-xs text-slate-400 mt-1">Calculado automáticamente</p>
            </div>
            <div>
              <Label text="Moneda" />
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={selectCls}>
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all',
              saving
                ? 'bg-amber-300 text-amber-800 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
            )}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
