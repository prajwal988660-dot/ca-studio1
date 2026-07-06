import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import {
  journalLinesToInventoryMovements,
  type InventoryMovement,
} from '@/lib/accounting/inventoryMovement';

export interface InventoryClosingItemRow {
  itemName: string;
  inventoryAccount: string;
  unit: string;
  closingQty: number;
  weightedAvgRate: number;
  closingValue: number;
}

export interface InventoryClosingAccountRow {
  inventoryAccount: string;
  closingQty: number;
  closingValue: number;
}

export interface InventoryClosingResult {
  items: InventoryClosingItemRow[];
  accounts: InventoryClosingAccountRow[];
  totalClosingValue: number;
}

export type InventoryValuationMethod = 'WEIGHTED_AVG';

export interface ComputeInventoryClosingOptions {
  companyId: string;
  /**
   * Closing is computed using movements up to this date (inclusive).
   */
  asOfDate: string;
  method?: InventoryValuationMethod;
}

function loadEntriesUpTo(companyId: string, asOfDate: string): JournalEntry[] {
  return listJournalEntries(companyId, {
    toDate: asOfDate,
  });
}

function filterMovementsUpTo(
  movements: InventoryMovement[],
  asOfDate: string
): InventoryMovement[] {
  return movements.filter((mv) => mv.date <= asOfDate);
}

function computeWeightedAverageClosing(
  movements: InventoryMovement[]
): InventoryClosingItemRow[] {
  const byKey = new Map<string, { unit: string; moves: InventoryMovement[] }>();

  for (const mv of movements) {
    const key = `${mv.itemName}::${mv.inventoryAccount}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.moves.push(mv);
    } else {
      byKey.set(key, { unit: mv.unit, moves: [mv] });
    }
  }

  const rows: InventoryClosingItemRow[] = [];

  for (const [key, bucket] of byKey) {
    const [itemName, inventoryAccount] = key.split('::');

    let qty = 0;
    let value = 0;

    for (const mv of bucket.moves) {
      const sign = mv.direction === 'IN' ? 1 : -1;
      qty += mv.qty * sign;
      value += mv.value * sign;
    }

    const closingQty = qty;
    const closingValue = value;
    const weightedAvgRate = closingQty !== 0 ? closingValue / closingQty : 0;

    rows.push({
      itemName,
      inventoryAccount,
      unit: bucket.unit,
      closingQty,
      weightedAvgRate,
      closingValue,
    });
  }

  return rows;
}

export function computeInventoryClosing(
  options: ComputeInventoryClosingOptions
): InventoryClosingResult {
  const { companyId, asOfDate, method = 'WEIGHTED_AVG' } = options;

  const entries = loadEntriesUpTo(companyId, asOfDate);
  const allMovements = journalLinesToInventoryMovements(entries);
  const movements = filterMovementsUpTo(allMovements, asOfDate);

  if (method !== 'WEIGHTED_AVG') {
    throw new Error(`Unsupported inventory valuation method: ${method}`);
  }

  const items = computeWeightedAverageClosing(movements);

  const accountsMap = new Map<string, { closingQty: number; closingValue: number }>();

  for (const row of items) {
    const existing = accountsMap.get(row.inventoryAccount);
    if (existing) {
      existing.closingQty += row.closingQty;
      existing.closingValue += row.closingValue;
    } else {
      accountsMap.set(row.inventoryAccount, {
        closingQty: row.closingQty,
        closingValue: row.closingValue,
      });
    }
  }

  const accounts: InventoryClosingAccountRow[] = [];
  let totalClosingValue = 0;

  for (const [inventoryAccount, acc] of accountsMap) {
    accounts.push({
      inventoryAccount,
      closingQty: acc.closingQty,
      closingValue: acc.closingValue,
    });
    totalClosingValue += acc.closingValue;
  }

  return {
    items,
    accounts,
    totalClosingValue,
  };
}

