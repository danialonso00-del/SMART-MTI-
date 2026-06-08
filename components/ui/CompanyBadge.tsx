'use client';

import { CompanyName } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CompanyBadgeProps {
  company: CompanyName | string;
  size?: 'sm' | 'md';
}

const companyColors: Record<string, string> = {
  MTI: 'bg-amber-500 text-white',
  MTi: 'bg-amber-400 text-white',
  'MTI ARABIA': 'bg-orange-500 text-white',
  BCN: 'bg-blue-500 text-white',
  DIPRO: 'bg-purple-500 text-white',
  INGECO: 'bg-green-600 text-white',
  'MARINA EYE-CAM': 'bg-cyan-600 text-white',
};

const companyShort: Record<string, string> = {
  MTI: 'MTI',
  MTi: 'MTi',
  'MTI ARABIA': 'ARABIA',
  BCN: 'BCN',
  DIPRO: 'DIPRO',
  INGECO: 'INGECO',
  'MARINA EYE-CAM': 'EYECAM',
};

export default function CompanyBadge({ company, size = 'md' }: CompanyBadgeProps) {
  const colorClass = companyColors[company] || 'bg-gray-500 text-white';
  const label = companyShort[company] || company;

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded-lg',
        colorClass,
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
      )}
    >
      {label}
    </span>
  );
}
