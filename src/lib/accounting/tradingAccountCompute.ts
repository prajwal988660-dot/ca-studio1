import type { JournalEntry } from './computeEngine';
import { computeAllBalances } from './computeEngine';
import { TRADING_DEBIT_SUBGROUPS, TRADING_CREDIT_SUBGROUPS } from '@/lib/masterCOA';

export interface TradingAccountData {
  debitItems: { name: string; amount: number; jfCode?: string }[];
  creditItems: { name: string; amount: number; jfCode?: string }[];
  grossProfit: number;
  debitTotal: number;
  creditTotal: number;
  /** Opening stock total (from accounts named Opening Stock — *) for display as separate line if needed */
  openingStockTotal: number;
  /** Closing stock total (from accounts named Closing Stock — *) for display as separate line if needed */
  closingStockTotal: number;
}

export function computeTradingAccount(entries: JournalEntry[]): TradingAccountData {
  const balances = computeAllBalances(entries);

  const debitItems: TradingAccountData['debitItems'] = [];
  const creditItems: TradingAccountData['creditItems'] = [];

  let openingStockTotal = 0;
  let closingStockTotal = 0;

  for (const b of balances) {
    const group = b.account_group;
    if (/^Opening Stock\s*[—–-]/i.test(b.account_name)) {
      const amount = b.balance_type === 'Dr' ? b.balance : -b.balance;
      openingStockTotal += amount;
    } else if (/^Closing Stock\s*[—–-]/i.test(b.account_name)) {
      const amount = b.balance_type === 'Cr' ? b.balance : -b.balance;
      closingStockTotal += amount;
    }

    if (TRADING_DEBIT_SUBGROUPS.includes(group)) {
      const amount = b.balance_type === 'Cr' ? -b.balance : b.balance;
      debitItems.push({ name: b.account_name, amount });
    } else if (TRADING_CREDIT_SUBGROUPS.includes(group)) {
      const amount = b.balance_type === 'Dr' ? -b.balance : b.balance;
      creditItems.push({ name: b.account_name, amount });
    }
  }

  const debitTotal = debitItems.reduce((sum, i) => sum + i.amount, 0);
  const creditTotal = creditItems.reduce((sum, i) => sum + i.amount, 0);
  const grossProfit = creditTotal - debitTotal;

  if (grossProfit > 0) {
    debitItems.push({ name: 'Gross Profit c/d', amount: grossProfit });
  } else if (grossProfit < 0) {
    creditItems.push({ name: 'Gross Loss c/d', amount: Math.abs(grossProfit) });
  }

  return { debitItems, creditItems, grossProfit, debitTotal, creditTotal, openingStockTotal, closingStockTotal };
}
