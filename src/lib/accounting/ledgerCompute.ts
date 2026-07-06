import type { JournalEntry } from './computeEngine';

export interface LedgerRow {
  date: string;
  entry_id: string;
  entry_code: string;
  particulars: string;
  voucher_type: string;
  debit: number;
  credit: number;
  running_balance: number;
  balance_type: 'Dr' | 'Cr';
}

export function computeLedger(
  entries: JournalEntry[],
  accountName: string
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let runningDebit = 0;
  let runningCredit = 0;

  const isAllSales = accountName === 'All Sales Accounts';
  const isAllPurchases = accountName === 'All Purchase Accounts';

  for (const entry of entries) {
    const matchingLines = entry.lines.filter(l => {
      if (isAllSales) return l.account_group === 'Revenue from Operations';
      if (isAllPurchases) return l.account_group === 'Purchases of Stock-in-Trade';
      return l.account_name === accountName;
    });

    if (matchingLines.length === 0) continue;

    for (const line of matchingLines) {
      const otherAccounts = entry.lines
        .filter(l => {
          if (isAllSales) return l.account_group !== 'Revenue from Operations';
          if (isAllPurchases) return l.account_group !== 'Purchases of Stock-in-Trade';
          return l.account_name !== accountName;
        })
        .map(l => l.account_name);

      let particulars = otherAccounts.length === 1
        ? otherAccounts[0]
        : 'Sundries (' + otherAccounts.join(', ') + ')';

      if (isAllSales || isAllPurchases) {
        particulars = `${line.account_name} (${particulars})`;
      }

      runningDebit += line.debit || 0;
      runningCredit += line.credit || 0;
      const diff = runningDebit - runningCredit;

      rows.push({
        date: entry.entry_date,
        entry_id: entry.id,
        entry_code: entry.entry_code,
        particulars,
        voucher_type: entry.voucher_type,
        debit: line.debit || 0,
        credit: line.credit || 0,
        running_balance: Math.abs(diff),
        balance_type: diff >= 0 ? 'Dr' : 'Cr',
      });
    }
  }
  return rows;
}

export function computeLedgerTFormat(
  entries: JournalEntry[],
  accountName: string
): { debitSide: LedgerRow[]; creditSide: LedgerRow[] } {
  const allRows = computeLedger(entries, accountName);
  return {
    debitSide: allRows.filter(r => r.debit > 0),
    creditSide: allRows.filter(r => r.credit > 0),
  };
}
