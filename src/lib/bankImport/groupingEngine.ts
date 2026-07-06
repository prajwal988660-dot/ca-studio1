import type { BankTransaction, PayeeGroup } from './types';

/** Normalize payee: trim, collapse whitespace, title-case */
function normalizePayee(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Unknown';
  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Group transactions by normalized payee, sorted by count desc then total amount desc */
export function groupByPayee(transactions: BankTransaction[]): PayeeGroup[] {
  const map = new Map<string, BankTransaction[]>();

  for (const txn of transactions) {
    const key = normalizePayee(txn.payee);
    const existing = map.get(key);
    if (existing) {
      existing.push(txn);
    } else {
      map.set(key, [txn]);
    }
  }

  const groups: PayeeGroup[] = [];
  for (const [payee, txns] of map) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const t of txns) {
      totalDebit += t.debit;
      totalCredit += t.credit;
    }
    groups.push({
      payee,
      transactions: txns.sort((a, b) => a.date.localeCompare(b.date)),
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      count: txns.length,
    });
  }

  // Sort: count desc, then total amount desc
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (b.totalDebit + b.totalCredit) - (a.totalDebit + a.totalCredit);
  });

  return groups;
}
