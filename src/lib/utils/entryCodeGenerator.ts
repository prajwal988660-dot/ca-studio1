/**
 * Structured journal entry codes.
 * Format: {PREFIX}{5-digit-number}
 * Examples: JE00001, S00001, P00001, CN00001, DN00001, RCT00001, PMT00001
 */

import { listJournalEntries } from '@/lib/offlineDb';

const VOUCHER_PREFIX: Record<string, string> = {
  JRN:  'JE',
  SLS:  'S',
  PUR:  'P',
  CN:   'CN',
  DN:   'DN',
  RCT:  'RCT',
  PMT:  'PMT',
  CTRA: 'CTR',
};

function getPrefix(voucherType?: string): string {
  if (!voucherType) return 'JE';
  return VOUCHER_PREFIX[voucherType] ?? 'JE';
}

/**
 * Returns a sequential, structured entry code unique for this company + voucher type.
 * e.g. JE00001, JE00002 for journals; S00001 for sales; P00001 for purchases.
 */
export function generateUniqueEntryCode(companyId: string, voucherType?: string): string {
  const prefix = getPrefix(voucherType);
  const entries = listJournalEntries(companyId);
  const maxNum = entries
    .map(e => e.entry_code)
    .filter(c => c.startsWith(prefix))
    .reduce((max, c) => {
      const num = parseInt(c.slice(prefix.length), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
  return prefix + String(maxNum + 1).padStart(5, '0');
}

// Legacy function signatures kept for any callers that still use them
export function generateShortEntryCode(): string {
  return 'JE00001';
}

export function generateUniqueShortEntryCode(existing: Set<string>): string {
  let n = existing.size + 1;
  while (existing.has('JE' + String(n).padStart(5, '0'))) n++;
  return 'JE' + String(n).padStart(5, '0');
}
