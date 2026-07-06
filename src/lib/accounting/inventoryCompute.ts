import type { JournalEntry } from './computeEngine';

export interface InventoryItem {
  itemName: string;
  openingQty: number;
  openingValue: number;
  purchasedQty: number;
  purchasedValue: number;
  soldQty: number;
  soldValue: number;
  closingQty: number;
  closingValue: number;
}

export interface StoresLedgerRow {
  date: string;
  particulars: string;
  receivedQty: number;
  receivedRate: number;
  receivedValue: number;
  issuedQty: number;
  issuedRate: number;
  issuedValue: number;
  balanceQty: number;
  balanceRate: number;
  balanceValue: number;
}

const INVENTORY_GROUPS = ['Inventories'];
const PURCHASE_GROUPS = ['Cost of Materials Consumed', 'Purchases of Stock-in-Trade'];
const SALES_GROUPS = ['Revenue from Operations'];

export function computeInventorySummary(
  entries: JournalEntry[],
  _method: 'fifo' | 'weighted_average'
): InventoryItem[] {
  const itemMap = new Map<string, {
    openingQty: number; openingValue: number;
    purchasedQty: number; purchasedValue: number;
    soldQty: number; soldValue: number;
  }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const group = line.account_group;
      const isInv = INVENTORY_GROUPS.includes(group);
      const isPur = PURCHASE_GROUPS.includes(group);
      const isSls = SALES_GROUPS.includes(group);
      // Legacy fallback
      const isLegacy = ['Stock-in-Trade', 'Purchases', 'Sales'].includes(group);
      if (!isInv && !isPur && !isSls && !isLegacy) continue;

      const name = line.account_name;
      if (!itemMap.has(name)) {
        itemMap.set(name, { openingQty: 0, openingValue: 0, purchasedQty: 0, purchasedValue: 0, soldQty: 0, soldValue: 0 });
      }
      const item = itemMap.get(name)!;

      if (entry.is_opening) {
        item.openingValue += line.debit || 0;
      } else if (isPur || group === 'Purchases') {
        item.purchasedValue += line.debit || 0;
      } else if (isSls || group === 'Sales') {
        item.soldValue += line.credit || 0;
      }
    }
  }

  const results: InventoryItem[] = [];
  for (const [itemName, data] of itemMap) {
    const closingValue = data.openingValue + data.purchasedValue - data.soldValue;
    results.push({
      itemName,
      openingQty: data.openingQty, openingValue: data.openingValue,
      purchasedQty: data.purchasedQty, purchasedValue: data.purchasedValue,
      soldQty: data.soldQty, soldValue: data.soldValue,
      closingQty: 0, closingValue: Math.max(0, closingValue),
    });
  }
  return results;
}
