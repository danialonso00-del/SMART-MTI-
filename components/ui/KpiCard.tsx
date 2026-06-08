'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  tooltip?: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'amber' | 'blue' | 'emerald' | 'violet' | 'teal' | 'rose' | 'slate';
  size?: 'sm' | 'md';
}

const colorMap = {
  amber: {
    icon: 'bg-amber-100 text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'border-l-amber-500',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    accent: 'border-l-blue-500',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'border-l-emerald-500',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-600',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    accent: 'border-l-violet-500',
  },
  teal: {
    icon: 'bg-teal-100 text-teal-600',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    accent: 'border-l-teal-500',
  },
  rose: {
    icon: 'bg-rose-100 text-rose-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    accent: 'border-l-rose-500',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-600',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    accent: 'border-l-slate-400',
  },
};

export default function KpiCard({
  label,
  value,
  tooltip,
  subtitle,
  change,
  changeLabel,
  icon,
  color = 'amber',
  size = 'md',
}: KpiCardProps) {
  const colors = colorMap[color];

  const changeDirection = change === undefined ? null : change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 border-l-4',
        colors.accent,
        size === 'sm' ? 'p-4' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn('text-slate-500 font-medium mb-1', size === 'sm' ? 'text-xs' : 'text-sm')}>
            {label}
          </p>
          <div className="relative group/tooltip">
            <p className={cn('font-bold text-slate-900 truncate', size === 'sm' ? 'text-xl' : 'text-2xl')}>
              {value}
            </p>
            {tooltip && (
              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tooltip:block z-50 pointer-events-none">
                <div className="bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {tooltip}
                </div>
                <div className="w-2 h-2 bg-slate-800 rotate-45 ml-3 -mt-1" />
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-xl flex items-center justify-center shrink-0', colors.icon, size === 'sm' ? 'w-9 h-9' : 'w-11 h-11')}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
              changeDirection === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              changeDirection === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-slate-50 text-slate-600 border-slate-200'
            )}
          >
            {changeDirection === 'positive' ? <TrendingUp size={11} /> :
             changeDirection === 'negative' ? <TrendingDown size={11} /> :
             <Minus size={11} />}
            {Math.abs(change)}%
          </div>
          {changeLabel && (
            <span className="text-xs text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
