/**
 * Ratio Analysis Compute Engine.
 *
 * Computes key financial ratios from journal entries:
 * - Liquidity Ratios (Current, Quick, Cash)
 * - Solvency Ratios (Debt-Equity, Proprietary, Interest Coverage)
 * - Profitability Ratios (Gross Profit, Net Profit, Operating Profit, Return on Equity, Return on Assets)
 * - Efficiency Ratios (Inventory Turnover, Debtors Turnover, Creditors Turnover, Asset Turnover, Working Capital Turnover)
 *
 * All data sourced exclusively from journal entries via computeAllBalances.
 */

import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';
import {
  TRADING_CREDIT_SUBGROUPS,
  TRADING_DEBIT_SUBGROUPS,
  PNL_INCOME_SUBGROUPS,
  PNL_EXPENSE_SUBGROUPS,
} from '@/lib/masterCOA';

export interface RatioResult {
  label: string;
  value: number | null;
  formula: string;
  category: 'liquidity' | 'solvency' | 'profitability' | 'efficiency';
}

export interface RatioAnalysisData {
  ratios: RatioResult[];
  components: {
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
    cashAndBank: number;
    tradeReceivables: number;
    tradePayables: number;
    totalAssets: number;
    totalLiabilities: number;
    shareholdersEquity: number;
    longTermDebt: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingProfit: number;
    netProfit: number;
    interestExpense: number;
  };
}

const CURRENT_ASSET_SUBGROUPS = [
  'Current Investments', 'Inventories', 'Trade Receivables',
  'Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents',
  'Short-term Loans & Advances', 'Other Current Assets',
  'GST — Input Tax Credit', 'GST — Refund',
];

const CURRENT_LIABILITY_SUBGROUPS = [
  'Short-term Borrowings', 'Trade Payables', 'Other Current Liabilities',
  'Statutory Liabilities', 'Short-term Provisions',
  'GST — Output Tax', 'GST — RCM', 'GST — Advances',
];

const EQUITY_SUBGROUPS = ['Share Capital', 'Reserves & Surplus'];

const LONG_TERM_DEBT_SUBGROUPS = ['Long-term Borrowings'];

function sumSubGroups(balances: AccountBalance[], subGroups: string[]): number {
  const set = new Set(subGroups);
  return balances
    .filter(b => set.has(b.account_group))
    .reduce((s, b) => s + Math.abs(b.balance), 0);
}

function sumNatureCredit(balances: AccountBalance[], subGroups: string[]): number {
  const set = new Set(subGroups);
  return balances
    .filter(b => set.has(b.account_group))
    .reduce((s, b) => s + b.total_credit - b.total_debit, 0);
}

function sumNatureDebit(balances: AccountBalance[], subGroups: string[]): number {
  const set = new Set(subGroups);
  return balances
    .filter(b => set.has(b.account_group))
    .reduce((s, b) => s + b.total_debit - b.total_credit, 0);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100) / 100;
}

export function computeRatioAnalysis(
  entries: JournalEntry[],
  previousEntries?: JournalEntry[]
): RatioAnalysisData {
  const balances = computeAllBalances(entries);
  const prevBalances = previousEntries ? computeAllBalances(previousEntries) : null;

  const currentAssets = sumSubGroups(balances, CURRENT_ASSET_SUBGROUPS);
  const currentLiabilities = sumSubGroups(balances, CURRENT_LIABILITY_SUBGROUPS);
  const inventory = sumSubGroups(balances, ['Inventories']);
  const cashAndBank = sumSubGroups(balances, ['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents']);
  const tradeReceivables = sumSubGroups(balances, ['Trade Receivables']);
  const tradePayables = sumSubGroups(balances, ['Trade Payables']);
  const shareholdersEquity = sumSubGroups(balances, EQUITY_SUBGROUPS);
  const longTermDebt = sumSubGroups(balances, LONG_TERM_DEBT_SUBGROUPS);
  const totalLiabilities = currentLiabilities + longTermDebt + sumSubGroups(balances, [
    'Other Long-term Liabilities', 'Long-term Provisions', 'Deferred Tax Liability',
  ]);
  const totalAssets = currentAssets + sumSubGroups(balances, [
    'Tangible Fixed Assets', 'Capital Work in Progress', 'Intangible Assets',
    'Non-current Investments', 'Long-term Loans & Advances', 'Other Non-current Assets',
    'Deferred Tax Asset',
  ]) - sumSubGroups(balances, ['Accumulated Depreciation', 'Accumulated Amortisation']);

  const avg = (curr: number, prev: number) => (curr + prev) / 2;
  const prevEquity = prevBalances ? sumSubGroups(prevBalances, EQUITY_SUBGROUPS) : shareholdersEquity;
  const prevAssets = prevBalances
    ? sumSubGroups(prevBalances, CURRENT_ASSET_SUBGROUPS) +
      sumSubGroups(prevBalances, [
        'Tangible Fixed Assets', 'Capital Work in Progress', 'Intangible Assets',
        'Non-current Investments', 'Long-term Loans & Advances', 'Other Non-current Assets',
        'Deferred Tax Asset',
      ]) - sumSubGroups(prevBalances, ['Accumulated Depreciation', 'Accumulated Amortisation'])
    : totalAssets;
  const avgEquity = prevBalances ? avg(shareholdersEquity, prevEquity) : shareholdersEquity;
  const avgAssets = prevBalances ? avg(totalAssets, prevAssets) : totalAssets;
  const avgInventory = prevBalances ? avg(inventory, sumSubGroups(prevBalances, ['Inventories'])) : inventory;
  const avgReceivables = prevBalances ? avg(tradeReceivables, sumSubGroups(prevBalances, ['Trade Receivables'])) : tradeReceivables;
  const avgPayables = prevBalances ? avg(tradePayables, sumSubGroups(prevBalances, ['Trade Payables'])) : tradePayables;

  const revenue = sumNatureCredit(balances, [...TRADING_CREDIT_SUBGROUPS, ...PNL_INCOME_SUBGROUPS]);
  const cogs = sumNatureDebit(balances, TRADING_DEBIT_SUBGROUPS);
  const grossProfit = revenue - cogs;
  const operatingExpenses = sumNatureDebit(balances, PNL_EXPENSE_SUBGROUPS);
  const interestExpense = sumNatureDebit(balances, ['Finance Costs']);
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = operatingProfit;

  const capitalEmployed = shareholdersEquity + longTermDebt;
  const avgCapitalEmployed = prevBalances ? avg(capitalEmployed, prevEquity + sumSubGroups(prevBalances, LONG_TERM_DEBT_SUBGROUPS)) : capitalEmployed;

  const inventoryTurnover = ratio(cogs, avgInventory);
  const debtorsTurnover = ratio(revenue, avgReceivables);
  const creditorsTurnover = ratio(cogs, avgPayables);

  const ratios: RatioResult[] = [
    { label: 'Current Ratio', value: ratio(currentAssets, currentLiabilities), formula: 'Current Assets / Current Liabilities', category: 'liquidity' },
    { label: 'Quick Ratio', value: ratio(currentAssets - inventory, currentLiabilities), formula: '(Current Assets − Inventory) / Current Liabilities', category: 'liquidity' },
    { label: 'Cash Ratio', value: ratio(cashAndBank, currentLiabilities), formula: 'Cash & Bank / Current Liabilities', category: 'liquidity' },

    { label: 'Debt-Equity Ratio', value: ratio(longTermDebt, shareholdersEquity), formula: 'Long-term Debt / Shareholders\' Equity', category: 'solvency' },
    { label: 'Proprietary Ratio', value: ratio(shareholdersEquity, totalAssets), formula: 'Shareholders\' Equity / Total Assets', category: 'solvency' },
    { label: 'Interest Coverage Ratio', value: ratio(operatingProfit + interestExpense, interestExpense), formula: '(Operating Profit + Interest) / Interest', category: 'solvency' },

    { label: 'Gross Profit Ratio (%)', value: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : null, formula: 'Gross Profit / Revenue × 100', category: 'profitability' },
    { label: 'Net Profit Ratio (%)', value: revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : null, formula: 'Net Profit / Revenue × 100', category: 'profitability' },
    { label: 'Operating Profit Ratio (%)', value: revenue > 0 ? Math.round((operatingProfit / revenue) * 10000) / 100 : null, formula: 'Operating Profit / Revenue × 100', category: 'profitability' },
    { label: 'Return on Equity (%)', value: avgEquity > 0 ? Math.round((netProfit / avgEquity) * 10000) / 100 : null, formula: 'Net Profit / Avg Shareholders\' Equity × 100', category: 'profitability' },
    { label: 'Return on Assets (%)', value: avgAssets > 0 ? Math.round((netProfit / avgAssets) * 10000) / 100 : null, formula: 'Net Profit / Avg Total Assets × 100', category: 'profitability' },
    { label: 'Return on Capital Employed (%)', value: avgCapitalEmployed > 0 ? Math.round((operatingProfit / avgCapitalEmployed) * 10000) / 100 : null, formula: 'Operating Profit / Avg Capital Employed × 100', category: 'profitability' },

    { label: 'Inventory Turnover', value: inventoryTurnover, formula: 'COGS / Avg Inventory', category: 'efficiency' },
    { label: 'Debtors Turnover', value: debtorsTurnover, formula: 'Revenue / Avg Trade Receivables', category: 'efficiency' },
    { label: 'Creditors Turnover', value: creditorsTurnover, formula: 'COGS / Avg Trade Payables', category: 'efficiency' },
    { label: 'Asset Turnover', value: ratio(revenue, avgAssets), formula: 'Revenue / Avg Total Assets', category: 'efficiency' },
    { label: 'Working Capital Turnover', value: ratio(revenue, currentAssets - currentLiabilities), formula: 'Revenue / Working Capital', category: 'efficiency' },
    { label: 'Debtors Collection Period (days)', value: debtorsTurnover != null && debtorsTurnover > 0 ? Math.round(365 / debtorsTurnover) : null, formula: '365 / Debtors Turnover', category: 'efficiency' },
    { label: 'Creditors Payment Period (days)', value: creditorsTurnover != null && creditorsTurnover > 0 ? Math.round(365 / creditorsTurnover) : null, formula: '365 / Creditors Turnover', category: 'efficiency' },
    { label: 'Inventory Holding Period (days)', value: inventoryTurnover != null && inventoryTurnover > 0 ? Math.round(365 / inventoryTurnover) : null, formula: '365 / Inventory Turnover', category: 'efficiency' },
  ];

  return {
    ratios,
    components: {
      currentAssets, currentLiabilities, inventory, cashAndBank,
      tradeReceivables, tradePayables, totalAssets, totalLiabilities,
      shareholdersEquity, longTermDebt, revenue, cogs,
      grossProfit, operatingExpenses, operatingProfit, netProfit, interestExpense,
    },
  };
}
