'use client';

import { STATUS_MAP, StatusCode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  statusCode: StatusCode;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const colorClasses: Record<string, { bg: string; dot: string }> = {
  blue:    { bg: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  indigo:  { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  violet:  { bg: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  orange:  { bg: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  teal:    { bg: 'bg-teal-100 text-teal-700 border-teal-200',     dot: 'bg-teal-500' },
  slate:   { bg: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
  red:     { bg: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500' },
};

export default function StatusBadge({ statusCode, size = 'md', showDot = true }: StatusBadgeProps) {
  const status = STATUS_MAP[statusCode];
  if (!status) return null;

  const colors = colorClasses[status.color] || colorClasses.slate;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border whitespace-nowrap',
        colors.bg,
        size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-1'
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', colors.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      )}
      {status.label}
    </span>
  );
}
