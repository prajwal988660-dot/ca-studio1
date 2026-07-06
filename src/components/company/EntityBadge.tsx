'use client';

import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

const colorMap: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  red:    'bg-red-50 text-red-700 border-red-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  pink:   'bg-pink-50 text-pink-700 border-pink-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  rose:   'bg-rose-50 text-rose-700 border-rose-100',
  cyan:   'bg-cyan-50 text-cyan-700 border-cyan-100',
  lime:   'bg-lime-50 text-lime-700 border-lime-100',
};

export function EntityBadge({ entityType }: { entityType: EntityType | string }) {
  const config = ENTITY_TYPES[entityType as EntityType];
  if (!config) return null;
  const cls = colorMap[config.color] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {config.shortLabel}
    </span>
  );
}
