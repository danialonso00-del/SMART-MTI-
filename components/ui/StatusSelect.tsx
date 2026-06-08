'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Calendar, X, CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_MAP, StatusCode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusSelectProps {
  id: string;
  statusCode: StatusCode;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (newCode: StatusCode) => void;
}

const colorClasses: Record<string, { bg: string; dot: string; hover: string }> = {
  blue:    { bg: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    hover: 'hover:bg-blue-200' },
  indigo:  { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',    dot: 'bg-indigo-500',  hover: 'hover:bg-indigo-200' },
  violet:  { bg: 'bg-violet-100 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  hover: 'hover:bg-violet-200' },
  orange:  { bg: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   hover: 'hover:bg-amber-200' },
  emerald: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-200' },
  teal:    { bg: 'bg-teal-100 text-teal-700 border-teal-200',          dot: 'bg-teal-500',    hover: 'hover:bg-teal-200' },
  slate:   { bg: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400',   hover: 'hover:bg-slate-200' },
  red:     { bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     hover: 'hover:bg-red-200' },
};

const STATUS_GROUPS = [
  { label: 'Presales',  codes: [2, 3, 4, 5] as StatusCode[] },
  { label: 'Proyecto',  codes: [6, 7]        as StatusCode[] },
  { label: 'Cerrado',   codes: [8, 9]        as StatusCode[] },
];

const REQUIRES_CONFIRM = new Set<StatusCode>([6, 7, 9]);

const CONFIRM_CONFIG: Record<number, {
  title: string;
  icon: React.ReactNode;
  dateLabel: string;
  askDate: boolean;
  btnLabel: string;
  btnColor: string;
  borderColor: string;
}> = {
  6: {
    title:       'Oportunidad Ganada',
    icon:        <CheckCircle2 size={20} className="text-emerald-500" />,
    dateLabel:   '¿En qué fecha fue aceptada / firmada?',
    askDate:     true,
    btnLabel:    'Confirmar victoria',
    btnColor:    'bg-emerald-500 hover:bg-emerald-600',
    borderColor: 'border-emerald-200',
  },
  7: {
    title:       'Proyecto en Delivery',
    icon:        <CheckCircle2 size={20} className="text-teal-500" />,
    dateLabel:   '¿En qué fecha comenzó el delivery?',
    askDate:     true,
    btnLabel:    'Confirmar delivery',
    btnColor:    'bg-teal-500 hover:bg-teal-600',
    borderColor: 'border-teal-200',
  },
  9: {
    title:       'Oportunidad Perdida',
    icon:        <XCircle size={20} className="text-red-500" />,
    dateLabel:   'Esta acción marcará la oportunidad como perdida.',
    askDate:     false,
    btnLabel:    'Confirmar pérdida',
    btnColor:    'bg-red-500 hover:bg-red-600',
    borderColor: 'border-red-200',
  },
};

export default function StatusSelect({ id, statusCode, size = 'md', onChange }: StatusSelectProps) {
  const [current, setCurrent]     = useState<StatusCode>(statusCode);
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const [pendingCode, setPendingCode]   = useState<StatusCode | null>(null);
  const [confirmDate, setConfirmDate]   = useState('');

  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setCurrent(statusCode); }, [statusCode]);

  // Calculate dropdown position (portal approach — no clipping)
  const recalcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    setMenuStyle({
      position: 'fixed',
      zIndex: 9999,
      left: r.left,
      minWidth: 180,
      ...(spaceBelow < 220
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: r.bottom + 4 }),
    });
  }, []);

  function openDropdown() {
    recalcPosition();
    setOpen(true);
  }

  // Close on outside click, scroll or Escape
  useEffect(() => {
    if (!open) return;
    function onMouse(e: MouseEvent) {
      const menu = document.getElementById('status-dropdown-portal');
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        !(menu && menu.contains(e.target as Node))
      ) setOpen(false);
    }
    function onScroll() { setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!pendingCode) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPendingCode(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pendingCode]);

  function handleSelect(newCode: StatusCode) {
    if (newCode === current) { setOpen(false); return; }
    setOpen(false);
    if (REQUIRES_CONFIRM.has(newCode)) {
      setConfirmDate(new Date().toISOString().slice(0, 10));
      setPendingCode(newCode);
      return;
    }
    doSave(newCode, {});
  }

  async function handleConfirm() {
    if (!pendingCode) return;
    const cfg   = CONFIRM_CONFIG[pendingCode];
    const extra: Record<string, unknown> = {};
    if (cfg.askDate && confirmDate) extra.acceptanceDate = confirmDate;
    await doSave(pendingCode, extra);
    setPendingCode(null);
  }

  async function doSave(newCode: StatusCode, extra: Record<string, unknown>) {
    setSaving(true);
    setError('');
    const prev = current;
    setCurrent(newCode);
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(id)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ statusCode: newCode, ...extra }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange?.(newCode);
    } catch {
      setCurrent(prev);
      setError('Error al guardar');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  const status = STATUS_MAP[current];
  const colors = colorClasses[status?.color] ?? colorClasses.slate;
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const padding = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-1';

  const dropdownMenu = open ? (
    <div id="status-dropdown-portal" style={menuStyle} className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 overflow-hidden">
      {STATUS_GROUPS.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="border-t border-slate-100 my-1" />}
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {group.label}
          </p>
          {group.codes.map(code => {
            const s = STATUS_MAP[code];
            const c = colorClasses[s.color] ?? colorClasses.slate;
            const isActive = code === current;
            return (
              <button
                key={code}
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleSelect(code); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                  isActive ? 'bg-slate-50 font-semibold text-slate-800' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
                {s.label}
                {isActive && <span className="ml-auto text-[10px] font-bold text-slate-400">✓</span>}
                {REQUIRES_CONFIRM.has(code) && !isActive && (
                  <span className="ml-auto text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">confirmar</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <>
      {/* ── Status pill ── */}
      <div className="relative inline-block" onClick={e => e.stopPropagation()}>
        <button
          ref={btnRef}
          type="button"
          onClick={() => { if (!saving) open ? setOpen(false) : openDropdown(); }}
          title="Cambiar estado"
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full border whitespace-nowrap transition-opacity',
            colors.bg, colors.hover, padding,
            saving && 'opacity-60 cursor-wait',
            !saving && 'cursor-pointer',
          )}
        >
          {saving
            ? <Loader2 size={10} className="animate-spin shrink-0" />
            : <span className={cn('rounded-full shrink-0', colors.dot, dotSize)} />
          }
          <span>{status?.label}</span>
          <ChevronDown size={10} className={cn('shrink-0 transition-transform ml-0.5', open && 'rotate-180')} />
        </button>

        {error && (
          <span className="absolute left-0 top-full mt-1.5 text-[10px] text-red-500 bg-white border border-red-200 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm z-50">
            {error}
          </span>
        )}
      </div>

      {/* ── Dropdown rendered via portal (no clipping) ── */}
      {typeof document !== 'undefined' && dropdownMenu && createPortal(dropdownMenu, document.body)}

      {/* ── Confirmation modal ── */}
      {pendingCode && (() => {
        const cfg = CONFIRM_CONFIG[pendingCode];
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setPendingCode(null); }}
          >
            <div className={cn('bg-white rounded-2xl shadow-2xl w-full max-w-sm border-t-4', cfg.borderColor)}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  {cfg.icon}
                  <h2 className="text-sm font-bold text-slate-900">{cfg.title}</h2>
                </div>
                <button
                  onClick={() => setPendingCode(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {cfg.askDate ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      {cfg.dateLabel}
                    </label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={confirmDate}
                        onChange={e => setConfirmDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    {cfg.dateLabel} Podrás añadir observaciones desde el detalle del registro.
                  </p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setPendingCode(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving || (cfg.askDate && !confirmDate)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-all',
                    cfg.btnColor,
                    (saving || (cfg.askDate && !confirmDate)) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {cfg.btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
