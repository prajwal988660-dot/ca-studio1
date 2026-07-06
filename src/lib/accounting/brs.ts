import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry, JournalLine } from '@/lib/accounting/computeEngine';

export interface ImportedBankTxn {
  date: string;
  amount: number;
  narration?: string;
  reference?: string;
}

export type BrsMatchStatus = 'matched' | 'unmatched_bank' | 'unmatched_books';

export interface BrsMatchRow {
  source: 'bank' | 'books';
  date: string;
  amount: number;
  narration: string;
  reference: string;
  matchStatus: BrsMatchStatus;
}

export interface ComputeBrsOptions {
  companyId: string;
  bankAccountName: string;
  fromDate?: string;
  toDate?: string;
  imported: ImportedBankTxn[];
  dateToleranceDays?: number;
}

function flattenBankLedgerEntries(
  entries: JournalEntry[],
  bankAccountName: string
): BrsMatchRow[] {
  const rows: BrsMatchRow[] = [];
  const target = bankAccountName.toLowerCase();

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.account_name.toLowerCase() !== target) continue;
      const amount = (line.debit || 0) - (line.credit || 0);
      if (amount === 0) continue;
      rows.push({
        source: 'books',
        date: entry.entry_date,
        amount,
        narration: entry.narration || line.account_name,
        reference: entry.entry_code,
        matchStatus: 'unmatched_books',
      });
    }
  }

  return rows;
}

function parseDate(s: string): number {
  return new Date(s).getTime();
}

export function computeBankReconciliation(
  options: ComputeBrsOptions
): BrsMatchRow[] {
  const {
    companyId,
    bankAccountName,
    fromDate,
    toDate,
    imported,
    dateToleranceDays = 3,
  } = options;

  const entries = listJournalEntries(companyId, {
    fromDate,
    toDate,
  });

  const bookRows = flattenBankLedgerEntries(entries, bankAccountName);
  const allRows: BrsMatchRow[] = [];

  const unmatchedBooks = [...bookRows];
  const unmatchedBank: BrsMatchRow[] = imported.map((tx) => ({
    source: 'bank',
    date: tx.date,
    amount: tx.amount,
    narration: tx.narration ?? '',
    reference: tx.reference ?? '',
    matchStatus: 'unmatched_bank',
  }));

  const toleranceMs = dateToleranceDays * 24 * 60 * 60 * 1000;

  for (const bankRow of unmatchedBank) {
    const bankTs = parseDate(bankRow.date);
    let bestIndex = -1;
    let bestDelta = Number.POSITIVE_INFINITY;

    unmatchedBooks.forEach((bRow, idx) => {
      if (bRow.amount !== bankRow.amount) return;
      const delta = Math.abs(parseDate(bRow.date) - bankTs);
      if (delta < bestDelta && delta <= toleranceMs) {
        bestDelta = delta;
        bestIndex = idx;
      }
    });

    if (bestIndex >= 0) {
      const matchBook = unmatchedBooks.splice(bestIndex, 1)[0];
      allRows.push({
        ...bankRow,
        matchStatus: 'matched',
      });
      allRows.push({
        ...matchBook,
        matchStatus: 'matched',
      });
    } else {
      allRows.push(bankRow);
    }
  }

  for (const remainingBook of unmatchedBooks) {
    allRows.push(remainingBook);
  }

  return allRows;
}

