import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Probabilidad fija por estado — fuente de verdad para toda la app
export const STATUS_PROB: Record<number, number> = {
  1: 100, 2: 5, 3: 20, 4: 40, 5: 60, 6: 100, 7: 100, 8: 100, 9: 0, 10: 0,
};

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'EUR'): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  }
  return formatCurrency(amount, currency);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getStatusColor(statusCode: number): string {
  const colors: Record<number, string> = {
    2: 'bg-blue-100 text-blue-700 border-blue-200',
    3: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    4: 'bg-violet-100 text-violet-700 border-violet-200',
    5: 'bg-amber-100 text-amber-700 border-amber-200',
    6: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    7: 'bg-teal-100 text-teal-700 border-teal-200',
    8: 'bg-slate-100 text-slate-600 border-slate-200',
    9: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[statusCode] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getStatusDotColor(statusCode: number): string {
  const colors: Record<number, string> = {
    2: 'bg-blue-500',
    3: 'bg-indigo-500',
    4: 'bg-violet-500',
    5: 'bg-amber-500',
    6: 'bg-emerald-500',
    7: 'bg-teal-500',
    8: 'bg-slate-400',
    9: 'bg-red-500',
  };
  return colors[statusCode] || 'bg-gray-500';
}

export function getCompanyColor(company: string): string {
  const colors: Record<string, string> = {
    MTI: 'bg-amber-500 text-white',
    MTi: 'bg-amber-400 text-white',
    'MTI ARABIA': 'bg-orange-500 text-white',
    BCN: 'bg-blue-500 text-white',
    DIPRO: 'bg-purple-500 text-white',
    INGECO: 'bg-green-600 text-white',
    'MARINA EYE-CAM': 'bg-cyan-600 text-white',
  };
  return colors[company] || 'bg-gray-500 text-white';
}

export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    Spain: '🇪🇸',
    'Saudi Arabia': '🇸🇦',
    Malaysia: '🇲🇾',
    Singapore: '🇸🇬',
    Kenya: '🇰🇪',
    Uzbekistan: '🇺🇿',
    'Costa Rica': '🇨🇷',
    Morocco: '🇲🇦',
    Portugal: '🇵🇹',
    France: '🇫🇷',
    UK: '🇬🇧',
    USA: '🇺🇸',
  };
  return flags[country] || '🌍';
}

export function calculateMarginPercent(amount: number, costs: number): number {
  if (amount === 0) return 0;
  return ((amount - costs) / amount) * 100;
}

export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getBusinessLineLabel(key: string): string {
  const labels: Record<string, string> = {
    hardware: 'Hardware',
    ia: 'IA',
    bim: 'BIM',
    ttioOm: 'TTIO/O&M',
    events: 'Eventos',
    proservices: 'Pro Services',
  };
  return labels[key] || key;
}

export function sumBusinessLines(bl: Record<string, number>): number {
  return Object.values(bl).reduce((sum, v) => sum + v, 0);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
