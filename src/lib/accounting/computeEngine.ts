import { listJournalEntries, type JournalEntryFilters } from '@/lib/offlineDb';
import type { InventorySubLine } from '@/types/journal';

export interface JournalLine {
  account_name: string;
  account_group: string;
  nature: 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';
  debit: number;
  credit: number;
  inventory_sub_lines?: InventorySubLine[];
  /** HSN code for GST reporting (e.g. 998314). */
  hsn_code?: string;
  tds_section?: string;
  tds_rate?: number;
  tcs_section?: string;
  tcs_rate?: number;
}

export interface JournalEntry {
  id: string;
  entry_code: string;
  entry_date: string;
  voucher_type: string;
  voucher_number: string | null;
  lines: JournalLine[];
  narration: string;
  book_period: string;
  is_opening: boolean;
  is_closing: boolean;
  created_at: string;
  /** Party GSTIN for sales/purchase (from party master or entry). */
  party_gstin?: string;
  /** Deductee PAN for TDS entries (valid PAN triggers normal rate; missing/invalid triggers 206AA). */
  deductee_pan?: string;
  /** TDS deposit status for this entry when applicable. */
  tds_deposit_status?: 'deducted' | 'deposited' | 'pending';
}

export interface AccountBalance {
  account_name: string;
  account_group: string;
  nature: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  balance_type: 'Dr' | 'Cr';
}

/** Kept for callers after mutations; journal reads no longer use an in-memory cache (always fresh from local storage). */
export function invalidateEntriesCache(_companyId?: string) {}

export async function fetchJournalEntries(
  companyId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    accountName?: string;
    entryCode?: string;
    limit?: number;
  }
): Promise<JournalEntry[]> {
  const filters: JournalEntryFilters | undefined = options
    ? {
        fromDate: options.fromDate,
        toDate: options.toDate,
        voucherType: options.voucherType,
        entryCode: options.entryCode,
      }
    : undefined;

  let entries = listJournalEntries(companyId, filters);

  const accountQ = options?.accountName?.trim().toLowerCase();
  if (accountQ) {
    entries = entries.filter((e) =>
      e.lines.some((l) => (l.account_name || '').toLowerCase().includes(accountQ)),
    );
  }

  if (options?.limit && entries.length > options.limit) {
    entries = entries.slice(-options.limit);
  }

  return entries;
}

export function computeAllBalances(entries: JournalEntry[]): AccountBalance[] {
  const balanceMap = new Map<string, {
    account_group: string;
    nature: string;
    total_debit: number;
    total_credit: number;
  }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const existing = balanceMap.get(line.account_name);
      if (existing) {
        existing.total_debit += line.debit || 0;
        existing.total_credit += line.credit || 0;
        // Update group/nature if the stored line has a more specific value
        if (!existing.account_group || existing.account_group === 'Auto') {
          if (line.account_group && line.account_group !== 'Auto') {
            existing.account_group = line.account_group;
            existing.nature = line.nature;
          }
        }
      } else {
        balanceMap.set(line.account_name, {
          account_group: line.account_group || 'Other Expenses — Administration',
          nature: line.nature || 'expense',
          total_debit: line.debit || 0,
          total_credit: line.credit || 0,
        });
      }
    }
  }

  const results: AccountBalance[] = [];

  for (const [account_name, data] of balanceMap) {
    const diff = data.total_debit - data.total_credit;
    results.push({
      account_name,
      account_group: data.account_group,
      nature: data.nature,
      total_debit: data.total_debit,
      total_credit: data.total_credit,
      balance: Math.abs(diff),
      balance_type: diff >= 0 ? 'Dr' : 'Cr',
    });
  }

  return results;
}
