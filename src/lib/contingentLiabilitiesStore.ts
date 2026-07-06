/**
 * Store for contingent liabilities and contingent assets (AS 29).
 * Persisted per company in localStorage for BS notes integration.
 */

import { mirrorUpsert, mirrorDelete } from '@/lib/sync/cloudSync';

export interface ContingentItem {
  id: string;
  type: 'liability' | 'asset';
  description: string;
  amount: number;
  category?: string;
  asAtDate?: string;
}

const KEY_PREFIX = 'ca_contingent_';

// Map a ContingentItem to its cloud row shape: stamp company_id (the record has
// none — it is scoped by the localStorage key) and rename asAtDate -> as_at_date.
function toCloudRow(companyId: string, item: ContingentItem): Record<string, unknown> {
  return {
    id: item.id,
    company_id: companyId,
    type: item.type,
    description: item.description,
    amount: item.amount,
    category: item.category ?? null,
    as_at_date: item.asAtDate ?? null,
  };
}

export function getContingentItems(companyId: string): ContingentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_PREFIX + companyId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContingentItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setContingentItems(companyId: string, items: ContingentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_PREFIX + companyId, JSON.stringify(items));
  } catch {
    // ignore
  }
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op when offline).
  // This is the single funnel for the whole array; add/update flow through here.
  try { mirrorUpsert('contingent_items', items.map((i) => toCloudRow(companyId, i))); } catch { /* best-effort */ }
}

export function addContingentItem(companyId: string, item: Omit<ContingentItem, 'id'>): ContingentItem[] {
  const list = getContingentItems(companyId);
  const newItem: ContingentItem = {
    ...item,
    id: crypto.randomUUID?.() ?? `cl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  const next = [...list, newItem];
  setContingentItems(companyId, next);
  return next;
}

export function updateContingentItem(companyId: string, id: string, patch: Partial<ContingentItem>): ContingentItem[] {
  const list = getContingentItems(companyId);
  const next = list.map((i) => (i.id === id ? { ...i, ...patch } : i));
  setContingentItems(companyId, next);
  return next;
}

export function removeContingentItem(companyId: string, id: string): ContingentItem[] {
  const list = getContingentItems(companyId).filter((i) => i.id !== id);
  setContingentItems(companyId, list);
  // setContingentItems upserts the remaining rows; delete the removed one too.
  try { mirrorDelete('contingent_items', id); } catch { /* best-effort */ }
  return list;
}
