import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/types/journal';

export interface LedgerRow {
  date: string;
  entryCode: string;
  voucherType: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

function computeOpeningBalance(entries: JournalEntry[], accountName: string, fromDate?: string): number {
  let balance = 0;

  for (const e of entries) {
    if (fromDate && e.entry_date >= fromDate) continue;
    for (const l of e.lines) {
      if (l.account_name !== accountName) continue;
      balance += (l.debit || 0) - (l.credit || 0);
    }
  }

  return balance;
}

export function computeLedger(
  companyId: string,
  accountName: string,
  fromDate?: string,
  toDate?: string
): LedgerRow[] {
  const allEntries = listJournalEntries(companyId);
  const openingBalance = computeOpeningBalance(allEntries, accountName, fromDate);

  const periodEntries = allEntries.filter((e) => {
    if (fromDate && e.entry_date < fromDate) return false;
    if (toDate && e.entry_date > toDate) return false;
    return true;
  });

  const rows: LedgerRow[] = [];
  let running = openingBalance;

  for (const e of periodEntries) {
    for (const l of e.lines) {
      if (l.account_name !== accountName) continue;

      const debit = l.debit || 0;
      const credit = l.credit || 0;
      running += debit - credit;

      const particulars = e.lines
        .filter((other) => other.account_name !== accountName)
        .map((other) => other.account_name)
        .join(', ');

      rows.push({
        date: e.entry_date,
        entryCode: e.entry_code,
        voucherType: e.voucher_type,
        particulars,
        debit,
        credit,
        runningBalance: running,
      });
    }
  }

  return rows;
}

