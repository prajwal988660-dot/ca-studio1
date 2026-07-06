import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntryFilters } from '@/lib/offlineDb';
import { journalLinesToInventoryMovements, type InventoryMovement } from '@/lib/accounting/inventoryMovement';

export interface InventoryRegisterFilters {
  itemName?: string;
  inventoryAccount?: string;
}

export interface InventoryStockSummaryRow {
  itemName: string;
  inventoryAccount: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  inwardQty: number;
  inwardValue: number;
  outwardQty: number;
  outwardValue: number;
  closingQty: number;
  closingValue: number;
}

export function computeInventoryRegister(
  companyId: string,
  fromDate?: string,
  toDate?: string,
  filters?: InventoryRegisterFilters
): InventoryStockSummaryRow[] {
  const jf: JournalEntryFilters = {
    fromDate,
    toDate,
  };
  const entries = listJournalEntries(companyId, jf);

  const movements = journalLinesToInventoryMovements(entries).filter((mv) => {
    if (filters?.itemName && mv.itemName !== filters.itemName) return false;
    if (filters?.inventoryAccount && mv.inventoryAccount !== filters.inventoryAccount) return false;
    return true;
  });

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

  const rows: InventoryStockSummaryRow[] = [];

  for (const [key, bucket] of byKey) {
    const [itemName, inventoryAccount] = key.split('::');

    let openingQty = 0;
    let openingValue = 0;
    let inwardQty = 0;
    let inwardValue = 0;
    let outwardQty = 0;
    let outwardValue = 0;

    for (const mv of bucket.moves) {
      const sign = mv.direction === 'IN' ? 1 : -1;
      const qtySigned = mv.qty * sign;
      const valueSigned = mv.value * sign;

      if (fromDate && mv.date < fromDate) {
        openingQty += qtySigned;
        openingValue += valueSigned;
      } else {
        if (mv.direction === 'IN') {
          inwardQty += mv.qty;
          inwardValue += mv.value;
        } else {
          outwardQty += mv.qty;
          outwardValue += mv.value;
        }
      }
    }

    const closingQty = openingQty + inwardQty - outwardQty;
    const closingValue = openingValue + inwardValue - outwardValue;

    rows.push({
      itemName,
      inventoryAccount,
      unit: bucket.unit,
      openingQty,
      openingValue,
      inwardQty,
      inwardValue,
      outwardQty,
      outwardValue,
      closingQty,
      closingValue,
    });
  }

  return rows;
}

import type { InventorySubLine, JournalEntry, JournalLine, VoucherType } from '@/types/journal';
import { computeInventorySubLine } from '@/lib/accounting/inventoryJournal';

export interface InventoryRegisterRow {
  date: string;
  jf: string;
  particulars: string;
  qty: number;
  rate: number;
  grossAmount: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  cgstAmount: number;
  cgstPercent: number;
  sgstAmount: number;
  sgstPercent: number;
  igstAmount: number;
  igstPercent: number;
  finalAmount: number;
}

function isGstLine(line: JournalLine): boolean {
  const name = line.account_name.toLowerCase();
  return name.includes('cgst') || name.includes('sgst') || name.includes('igst') || name.includes('gst');
}

function lineValue(line: JournalLine): number {
  return Math.max(line.debit || 0, line.credit || 0, 0);
}

function normalized(name: string): string {
  return (name || '').trim().toLowerCase();
}

function canonicalInventoryAccount(name: string): 'PUR' | 'SLS' | 'DN' | 'CN' | null {
  const n = normalized(name);
  if (n === 'purchase' || n === 'purchases') return 'PUR';
  if (n === 'sale' || n === 'sales') return 'SLS';
  if (n === 'purchase return' || n === 'purchase returns') return 'DN';
  if (n === 'sales return' || n === 'sales returns') return 'CN';
  return null;
}

function isRelevantInventoryLine(line: JournalLine, voucherType: VoucherType): boolean {
  const fromAccountName = canonicalInventoryAccount(line.account_name);
  if (fromAccountName && line.inventory_sub_lines && line.inventory_sub_lines.length > 0) {
    return fromAccountName === voucherType;
  }

  const group = line.account_group || '';
  const name = (line.account_name || '').toLowerCase();

  if (voucherType === 'PUR') {
    return group === 'Cost of Materials Consumed' || group === 'Purchases of Stock-in-Trade' ||
           group.toLowerCase().includes('purchase') || name.includes('purchase');
  }
  if (voucherType === 'SLS') {
    return group === 'Revenue from Operations' ||
           group.toLowerCase().includes('sales') || name.includes('sales');
  }
  if (voucherType === 'DN') {
    return group === 'Cost of Materials Consumed' ||
           group.toLowerCase().includes('purchase return') || name.includes('purchase return');
  }
  if (voucherType === 'CN') {
    return group === 'Revenue from Operations' ||
           group.toLowerCase().includes('sales return') || name.includes('sales return');
  }
  return false;
}

function rowsFromStoredSubLines(entry: JournalEntry, line: JournalLine): InventoryRegisterRow[] {
  const subLines = line.inventory_sub_lines ?? [];
  return subLines.map((sub: InventorySubLine) => {
    const computed = computeInventorySubLine(sub);
    return {
      date: entry.entry_date,
      jf: entry.entry_code,
      particulars: computed.inventory_name || line.account_name,
      qty: computed.qty,
      rate: computed.rate,
      grossAmount: computed.amount,
      discountAmount: computed.discount_amount,
      discountPercent: computed.discount_percent,
      taxableAmount: computed.taxable_amount,
      cgstAmount: computed.cgst_amount,
      cgstPercent: computed.cgst_percent,
      sgstAmount: computed.sgst_amount,
      sgstPercent: computed.sgst_percent,
      igstAmount: computed.igst_amount,
      igstPercent: computed.igst_percent,
      finalAmount: computed.final_amount,
    };
  });
}

function taxAmountsForEntry(entry: JournalEntry) {
  return entry.lines.reduce(
    (sum, line) => {
      const name = line.account_name.toLowerCase();
      const value = lineValue(line);
      if (name.includes('cgst')) sum.cgst += value;
      else if (name.includes('sgst')) sum.sgst += value;
      else if (name.includes('igst')) sum.igst += value;
      else if (isGstLine(line)) sum.igst += value;
      return sum;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );
}

export function buildInventoryRegisterRows(entries: JournalEntry[], voucherType: VoucherType): InventoryRegisterRow[] {
  const rows: InventoryRegisterRow[] = [];

  for (const entry of entries) {
    const itemLines = entry.lines.filter((line) => isRelevantInventoryLine(line, voucherType));
    if (itemLines.length === 0) continue;

    const storedRows = itemLines.flatMap((line) => rowsFromStoredSubLines(entry, line));
    if (storedRows.length > 0) {
      rows.push(...storedRows);
      continue;
    }

    const totalBase = itemLines.reduce((sum, line) => sum + lineValue(line), 0);
    const taxes = taxAmountsForEntry(entry);

    for (const line of itemLines) {
      const taxableAmount = lineValue(line);
      const grossAmount = taxableAmount;
      const discountAmount = 0;
      const discountPercent = 0;
      const allocatedCgst = totalBase > 0 ? (taxes.cgst * taxableAmount) / totalBase : 0;
      const allocatedSgst = totalBase > 0 ? (taxes.sgst * taxableAmount) / totalBase : 0;
      const allocatedIgst = totalBase > 0 ? (taxes.igst * taxableAmount) / totalBase : 0;
      const cgstPercent = taxableAmount > 0 ? (allocatedCgst / taxableAmount) * 100 : 0;
      const sgstPercent = taxableAmount > 0 ? (allocatedSgst / taxableAmount) * 100 : 0;
      const igstPercent = taxableAmount > 0 ? (allocatedIgst / taxableAmount) * 100 : 0;

      rows.push({
        date: entry.entry_date,
        jf: entry.entry_code,
        particulars: line.account_name,
        qty: 1,
        rate: grossAmount,
        grossAmount,
        discountAmount,
        discountPercent,
        taxableAmount,
        cgstAmount: allocatedCgst,
        cgstPercent,
        sgstAmount: allocatedSgst,
        sgstPercent,
        igstAmount: allocatedIgst,
        igstPercent,
        finalAmount: taxableAmount + allocatedCgst + allocatedSgst + allocatedIgst,
      });
    }
  }

  return rows;
}

export function getInventoryRegisterTotals(rows: InventoryRegisterRow[]) {
  return rows.reduce(
    (totals, row) => ({
      qty: totals.qty + row.qty,
      grossAmount: totals.grossAmount + row.grossAmount,
      discountAmount: totals.discountAmount + row.discountAmount,
      taxableAmount: totals.taxableAmount + row.taxableAmount,
      cgstAmount: totals.cgstAmount + row.cgstAmount,
      sgstAmount: totals.sgstAmount + row.sgstAmount,
      igstAmount: totals.igstAmount + row.igstAmount,
      finalAmount: totals.finalAmount + row.finalAmount,
    }),
    {
      qty: 0,
      grossAmount: 0,
      discountAmount: 0,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      finalAmount: 0,
    }
  );
}

