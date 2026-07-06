import type { JournalEntry } from './computeEngine';
import { listJournalEntries } from '@/lib/offlineDb';
import { computeTradingAccount, type TradingAccountData } from './tradingAccountCompute';
import { computeProfitLoss, type ProfitLossData } from './profitLossCompute';

export type TradingPlSectionId = 'trading' | 'profitAndLoss';

export interface TradingPlLine {
  label: string;
  amount: number;
  /**
   * Optional journal/ledger reference code that callers can
   * use to drive drilldown into registers / ledgers.
   */
  jfCode?: string;
}

export interface TradingPlSection {
  id: TradingPlSectionId;
  title: string;
  lines: TradingPlLine[];
  total: number;
}

export interface TradingPlResult {
  sections: TradingPlSection[];
  grossProfit: number;
  netProfit: number;
}

export interface ComputeTradingPlOptions {
  companyId: string;
  fromDate?: string;
  toDate?: string;
}

function loadEntriesForPeriod(options: ComputeTradingPlOptions): JournalEntry[] {
  const { companyId, fromDate, toDate } = options;
  return listJournalEntries(companyId, {
    fromDate,
    toDate,
  });
}

function buildTradingSection(trading: TradingAccountData): TradingPlSection {
  const lines: TradingPlLine[] = [];

  for (const item of trading.debitItems) {
    lines.push({
      label: item.name,
      amount: item.amount,
      jfCode: item.jfCode,
    });
  }

  for (const item of trading.creditItems) {
    lines.push({
      label: item.name,
      amount: -item.amount,
      jfCode: item.jfCode,
    });
  }

  const total = trading.creditTotal - trading.debitTotal;

  return {
    id: 'trading',
    title: 'Trading Account',
    lines,
    total,
  };
}

function buildProfitAndLossSection(pl: ProfitLossData): TradingPlSection {
  const lines: TradingPlLine[] = [];

  for (const item of pl.debitItems) {
    lines.push({
      label: item.name,
      amount: item.amount,
    });
  }

  for (const item of pl.creditItems) {
    lines.push({
      label: item.name,
      amount: -item.amount,
    });
  }

  const total = pl.creditTotal - pl.debitTotal;

  return {
    id: 'profitAndLoss',
    title: 'Profit & Loss Account',
    lines,
    total,
  };
}

export function computeTradingAndPL(options: ComputeTradingPlOptions): TradingPlResult {
  const entries = loadEntriesForPeriod(options);

  const trading = computeTradingAccount(entries);
  const pl = computeProfitLoss(entries, trading.grossProfit);

  const tradingSection = buildTradingSection(trading);
  const plSection = buildProfitAndLossSection(pl);

  return {
    sections: [tradingSection, plSection],
    grossProfit: trading.grossProfit,
    netProfit: pl.netProfit,
  };
}

