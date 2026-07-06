import { computeInventoryClosing } from '@/lib/accounting/inventoryValuation';
import { computeTrialBalance } from '@/lib/accounting/trialBalance';

export interface InventoryAccountReconciliationRow {
  inventoryAccount: string;
  movementClosingValue: number;
  trialBalanceValue: number;
  difference: number;
  differencePercent: number | null;
}

export interface InventoryCogsReconciliationRow {
  label: string;
  movementCogs: number;
  tradingCogs: number;
  difference: number;
}

export interface InventoryReconciliationResult {
  accounts: InventoryAccountReconciliationRow[];
  cogs?: InventoryCogsReconciliationRow;
}

export interface ComputeInventoryReconciliationOptions {
  companyId: string;
  asOfDate: string;
}

export function computeInventoryAccountReconciliation(
  options: ComputeInventoryReconciliationOptions
): InventoryAccountReconciliationRow[] {
  const { companyId, asOfDate } = options;

  const closing = computeInventoryClosing({ companyId, asOfDate });
  const tb = computeTrialBalance(companyId, undefined, asOfDate);

  const byAccount = new Map<string, number>();
  for (const acc of closing.accounts) {
    byAccount.set(acc.inventoryAccount, acc.closingValue);
  }

  const rows: InventoryAccountReconciliationRow[] = [];

  for (const row of tb.rows) {
    if (row.account_group !== 'Inventories') continue;

    const movementClosingValue = byAccount.get(row.account_name) ?? 0;
    const trialBalanceValue =
      row.balance_type === 'Dr' ? row.balance : -row.balance;
    const difference = movementClosingValue - trialBalanceValue;
    const denominator = Math.abs(trialBalanceValue) || Math.abs(movementClosingValue);
    const differencePercent =
      denominator === 0 ? null : (difference / denominator) * 100;

    rows.push({
      inventoryAccount: row.account_name,
      movementClosingValue,
      trialBalanceValue,
      difference,
      differencePercent,
    });
  }

  return rows;
}

export function computeInventoryCogsReconciliation(
  movementCogs: number,
  tradingCogs: number
): InventoryCogsReconciliationRow {
  const difference = movementCogs - tradingCogs;
  return {
    label: 'COGS reconciliation (movement vs Trading A/c)',
    movementCogs,
    tradingCogs,
    difference,
  };
}

