import { listJournalEntries } from '@/lib/offlineDb';
import { computeAllBalances, type AccountBalance } from '@/lib/accounting/computeEngine';

export interface TrialBalanceRow extends AccountBalance {}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export function computeTrialBalance(
  companyId: string,
  fromDate?: string,
  toDate?: string
): TrialBalanceResult {
  const entries = listJournalEntries(companyId, {
    fromDate,
    toDate,
  });

  const rows = computeAllBalances(entries);
  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of rows) {
    if (row.balance_type === 'Dr') {
      totalDebit += row.balance;
    } else {
      totalCredit += row.balance;
    }
  }

  const TOLERANCE = 0.005;
  const balanced = Math.abs(totalDebit - totalCredit) <= TOLERANCE;

  return { rows, totalDebit, totalCredit, balanced };
}

