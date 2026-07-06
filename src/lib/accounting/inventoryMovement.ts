import type { JournalEntry } from '@/lib/accounting/computeEngine';
import type { InventorySubLine } from '@/types/journal';
import { isInventorySensitiveLine, summarizeInventorySubLines } from '@/lib/accounting/inventoryJournal';

export type InventoryDirection = 'IN' | 'OUT';

export type InventoryMovementType =
  | 'PURCHASE_IN'
  | 'PURCHASE_RETURN_OUT'
  | 'SALE_OUT'
  | 'SALES_RETURN_IN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'WRITE_OFF_OUT'
  | 'OTHER';

export interface InventoryMovement {
  companyId?: string;
  date: string;
  entryId: string;
  entryCode: string;
  lineIndex: number;
  itemName: string;
  unit: string;
  qty: number;
  direction: InventoryDirection;
  rate: number;
  value: number;
  movementType: InventoryMovementType;
  inventoryAccount: string;
}

function inferDirectionAndType(
  voucherType: string,
  accountName: string
): { direction: InventoryDirection; movementType: InventoryMovementType } {
  const vt = voucherType.toUpperCase();
  const name = accountName.toLowerCase();

  if (vt === 'PUR') {
    return { direction: 'IN', movementType: 'PURCHASE_IN' };
  }
  if (vt === 'SLS' || vt === 'SAL') {
    return { direction: 'OUT', movementType: 'SALE_OUT' };
  }
  if (vt === 'CN') {
    // Credit note – often sales return (stock back in)
    return { direction: 'IN', movementType: 'SALES_RETURN_IN' };
  }
  if (vt === 'DN') {
    // Debit note – often purchase return (stock out)
    return { direction: 'OUT', movementType: 'PURCHASE_RETURN_OUT' };
  }

  if (name.includes('write off') || name.includes('write-off') || name.includes('abnormal loss')) {
    return { direction: 'OUT', movementType: 'WRITE_OFF_OUT' };
  }

  // Fallback based on common sense: purchases-like words → IN, sales-like → OUT
  if (name.includes('purchase') || name.includes('opening stock')) {
    return { direction: 'IN', movementType: 'PURCHASE_IN' };
  }
  if (name.includes('sale') || name.includes('closing stock')) {
    return { direction: 'OUT', movementType: 'SALE_OUT' };
  }

  return { direction: 'OUT', movementType: 'OTHER' };
}

export function journalLinesToInventoryMovements(entries: JournalEntry[]): InventoryMovement[] {
  const movements: InventoryMovement[] = [];

  for (const entry of entries) {
    entry.lines.forEach((line, idx) => {
      if (!isInventorySensitiveLine(line.account_name)) return;
      const subLines: InventorySubLine[] = line.inventory_sub_lines ?? [];
      if (subLines.length === 0) return;

      const { direction, movementType } = inferDirectionAndType(entry.voucher_type, line.account_name);

      const summary = summarizeInventorySubLines(subLines);
      const totalQty = subLines.reduce((sum, s) => sum + (s.qty || 0), 0);

      // Avoid division by zero; if qty is zero, fall back to taxableTotal as value and qty 0.
      const baseRate = totalQty > 0 ? summary.taxableTotal / totalQty : 0;

      for (const sub of subLines) {
        const qty = sub.qty || 0;
        const rate = qty > 0 ? sub.rate : baseRate;
        const value = qty * rate;

        movements.push({
          date: entry.entry_date,
          entryId: entry.id,
          entryCode: entry.entry_code,
          lineIndex: idx,
          itemName: sub.inventory_name,
          unit: sub.unit,
          qty,
          direction,
          rate,
          value,
          movementType,
          inventoryAccount: line.account_name,
        });
      }
    });
  }

  return movements;
}

