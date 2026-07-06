import type { JournalEntry } from './computeEngine';
import { computeAllBalances } from './computeEngine';

export interface TrialBalanceRow {
  sno: number;
  account_name: string;
  account_group: string;
  debit_balance: number | null;
  credit_balance: number | null;
}

export function computeTrialBalance(
  entries: JournalEntry[],
  options?: { includeZeroBalances?: boolean }
): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  tallies: boolean;
} {
  const balances = computeAllBalances(entries);
  let totalDebit = 0;
  let totalCredit = 0;

  const includeZero = options?.includeZeroBalances ?? false;
  const rows: TrialBalanceRow[] = balances
    .filter(b => includeZero || b.balance > 0)
    .map((b, index) => {
      const isDebit = b.balance_type === 'Dr';
      if (isDebit) totalDebit += b.balance;
      else totalCredit += b.balance;

      return {
        sno: index + 1,
        account_name: b.account_name,
        account_group: b.account_group,
        debit_balance: isDebit ? b.balance : null,
        credit_balance: !isDebit ? b.balance : null,
      };
    });

  return {
    rows,
    totalDebit,
    totalCredit,
    tallies: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}
