import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';
import { TRADING_DEBIT_SUBGROUPS } from '@/lib/masterCOA';

export interface CogsWorkingData {
  rawMaterialsConsumed: number; // A
  netWipAdjustment: number;     // B
  directManufacturingExpenses: number; // C
  costOfProduction: number;     // A + B + C
  openingFinishedGoods: number;
  closingFinishedGoods: number;
  cogs: number;                 // final COST OF GOODS SOLD
}

function sumDebitForSubGroups(balances: AccountBalance[], subGroups: string[]): number {
  const set = new Set(subGroups);
  return balances
    .filter((b) => set.has(b.account_group))
    .reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
}

export function computeCogsWorking(entries: JournalEntry[]): CogsWorkingData {
  const balances = computeAllBalances(entries);

  // Grouping aligned with Schedule III / trading account logic.
  // A: Raw materials consumed + purchases of traded goods
  const rawMaterialsConsumed = Math.max(
    0,
    sumDebitForSubGroups(balances, ['Cost of Materials Consumed', 'Purchases of Stock-in-Trade']),
  );

  // B: Net WIP / inventory adjustment (can be +/-)
  const netWipAdjustment = sumDebitForSubGroups(balances, ['Changes in Inventories']);

  // C: Direct / manufacturing expenses (factory wages, power, etc.)
  const directManufacturingExpenses = Math.max(
    0,
    sumDebitForSubGroups(balances, ['Direct Expenses']),
  );

  const costOfProduction = rawMaterialsConsumed + netWipAdjustment + directManufacturingExpenses;

  // Derive opening/closing finished goods from COA accounts (Opening/Closing Stock — Finished Goods, Traded Goods).
  let openingFinishedGoods = 0;
  let closingFinishedGoods = 0;
  for (const b of balances) {
    if (b.account_name === 'Opening Stock — Finished Goods' || b.account_name === 'Opening Stock — Traded Goods') {
      openingFinishedGoods += b.balance_type === 'Dr' ? b.balance : -b.balance;
    } else if (b.account_name === 'Closing Stock — Finished Goods' || b.account_name === 'Closing Stock — Traded Goods') {
      closingFinishedGoods += b.balance_type === 'Cr' ? b.balance : -b.balance;
    }
  }

  // Cross-check: COGS from trading side = sum of all trading debit sub-groups.
  const cogsFromTrading = sumDebitForSubGroups(balances, TRADING_DEBIT_SUBGROUPS);

  // COGS = Cost of Production + Opening FG - Closing FG; reconcile with trading total when components used.
  const cogsFromComponents = costOfProduction + openingFinishedGoods - closingFinishedGoods;
  const cogs =
    Math.abs(cogsFromComponents) > 0
      ? cogsFromComponents
      : cogsFromTrading;

  return {
    rawMaterialsConsumed,
    netWipAdjustment,
    directManufacturingExpenses,
    costOfProduction,
    openingFinishedGoods,
    closingFinishedGoods,
    cogs,
  };
}

