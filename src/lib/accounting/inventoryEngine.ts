/**
 * Inventory Engine
 * ─────────────────────────────────────────────────────────
 * This engine reads from the Purchase Register and Sales Register
 * to automatically track all stock movements.
 *
 * - Purchases (non-capital goods) → Inward movement
 * - Sales → Outward movement  
 * - Purchase Returns (CDNR) → Outward (returned to vendor)
 * - Sales Returns (CREDIT_NOTE) → Inward (received back from customer)
 * - Capital goods purchases → routed to Fixed Assets, NOT inventory
 *
 * The inventory page is a "manager self-runner" — it just reads these
 * movements and displays the current state. No manual entries needed.
 */

import {
  listPurchaseInvoices,
  listInvoicesV2,
  type PurchaseInvoice,
  type InvoiceV2,
} from './gstInvoices';

// ─── Types ───

export type MovementType = 'INWARD' | 'OUTWARD' | 'RETURN_IN' | 'RETURN_OUT' | 'ISSUE_PRODUCTION';

export interface InventoryMovement {
  id: string;
  date: string;
  type: MovementType;
  itemName: string;
  itemHsn: string;
  qty: number;
  rate: number;
  value: number;
  sourceInvoiceNo: string;
  sourceInvoiceId: string;
  partyName: string;
  narration: string;
}

export interface InventoryStockItem {
  itemName: string;
  itemHsn: string;
  /** Total quantity received via purchases */
  totalInwardQty: number;
  totalInwardValue: number;
  /** Total quantity sold */
  totalOutwardQty: number;
  totalOutwardValue: number;
  /** Total quantity returned to vendors (purchase returns) */
  totalReturnOutQty: number;
  totalReturnOutValue: number;
  /** Total quantity received back from customers (sales returns) */
  totalReturnInQty: number;
  totalReturnInValue: number;
  /** Total issued to production */
  totalIssuedQty: number;
  totalIssuedValue: number;
  /** Net stock = inward + returnIn - outward - returnOut - issued */
  netStockQty: number;
  netStockValue: number;
  /** Movement log for this item */
  movements: InventoryMovement[];
}

export interface InventorySummary {
  items: InventoryStockItem[];
  totalInwardValue: number;
  totalOutwardValue: number;
  totalReturnInValue: number;
  totalReturnOutValue: number;
  totalIssuedValue: number;
  totalNetStockValue: number;
  movements: InventoryMovement[];
}

// ─── Production Issues (stored in localStorage) ───

const PRODUCTION_KEY = 'inv_production_issues';

export interface ProductionIssue {
  id: string;
  companyId: string;
  date: string;
  itemName: string;
  itemHsn: string;
  qty: number;
  rate: number;
  value: number;
  narration: string;
  createdAt: string;
}

function loadProductionIssues(companyId: string): ProductionIssue[] {
  try {
    const raw = localStorage.getItem(PRODUCTION_KEY);
    if (!raw) return [];
    const all: ProductionIssue[] = JSON.parse(raw);
    return all.filter(p => p.companyId === companyId);
  } catch {
    return [];
  }
}

function saveProductionIssue(issue: ProductionIssue): void {
  try {
    const raw = localStorage.getItem(PRODUCTION_KEY);
    const all: ProductionIssue[] = raw ? JSON.parse(raw) : [];
    all.push(issue);
    localStorage.setItem(PRODUCTION_KEY, JSON.stringify(all));
  } catch {
    // silent fail
  }
}

export function issueToProduction(
  companyId: string,
  itemName: string,
  itemHsn: string,
  qty: number,
  rate: number,
  narration: string
): ProductionIssue {
  const issue: ProductionIssue = {
    id: `PI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    date: new Date().toISOString().slice(0, 10),
    itemName,
    itemHsn,
    qty,
    rate,
    value: qty * rate,
    narration: narration || `Issued to production: ${itemName}`,
    createdAt: new Date().toISOString(),
  };
  saveProductionIssue(issue);
  return issue;
}

// ─── Core Engine ───

export function computeInventoryFromRegisters(companyId: string): InventorySummary {
  const purchases = listPurchaseInvoices(companyId);
  const salesInvoices = listInvoicesV2(companyId);
  const productionIssues = loadProductionIssues(companyId);

  const movements: InventoryMovement[] = [];
  const itemMap = new Map<string, InventoryStockItem>();

  function ensureItem(name: string, hsn: string): InventoryStockItem {
    const key = name.toLowerCase().trim();
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        itemName: name,
        itemHsn: hsn,
        totalInwardQty: 0,
        totalInwardValue: 0,
        totalOutwardQty: 0,
        totalOutwardValue: 0,
        totalReturnOutQty: 0,
        totalReturnOutValue: 0,
        totalReturnInQty: 0,
        totalReturnInValue: 0,
        totalIssuedQty: 0,
        totalIssuedValue: 0,
        netStockQty: 0,
        netStockValue: 0,
        movements: [],
      });
    }
    return itemMap.get(key)!;
  }

  // ── Process Purchases ──
  for (const inv of purchases) {
    const itemName = inv.item_description || `Purchase ${inv.invoice_no}`;
    const hsn = inv.item_hsn || '';
    const qty = inv.item_qty || 1;
    const rate = inv.item_rate || inv.taxable_value;
    const value = inv.taxable_value;

    // Capital goods go to Fixed Assets, NOT inventory
    if (inv.capital_goods) continue;

    if (inv.bucket === 'CDNR') {
      // Purchase Return → Outward (returned to vendor)
      const item = ensureItem(itemName, hsn);
      const mv: InventoryMovement = {
        id: inv.id,
        date: inv.invoice_date,
        type: 'RETURN_OUT',
        itemName,
        itemHsn: hsn,
        qty,
        rate,
        value,
        sourceInvoiceNo: inv.invoice_no,
        sourceInvoiceId: inv.id,
        partyName: inv.vendor_name,
        narration: `Return to ${inv.vendor_name} (DN: ${inv.invoice_no})`,
      };
      movements.push(mv);
      item.movements.push(mv);
      item.totalReturnOutQty += qty;
      item.totalReturnOutValue += value;
    } else {
      // Regular Purchase → Inward
      const item = ensureItem(itemName, hsn);
      const mv: InventoryMovement = {
        id: inv.id,
        date: inv.invoice_date,
        type: 'INWARD',
        itemName,
        itemHsn: hsn,
        qty,
        rate,
        value,
        sourceInvoiceNo: inv.invoice_no,
        sourceInvoiceId: inv.id,
        partyName: inv.vendor_name,
        narration: `Purchased from ${inv.vendor_name}`,
      };
      movements.push(mv);
      item.movements.push(mv);
      item.totalInwardQty += qty;
      item.totalInwardValue += value;
    }
  }

  // ── Process Sales (V2 invoices) ──
  for (const inv of salesInvoices) {
    if (inv.doc_type === 'DELIVERY_CHALLAN' || inv.doc_type === 'PAYMENT_VOUCHER' || inv.doc_type === 'RECEIPT_VOUCHER' || inv.doc_type === 'REFUND_VOUCHER') continue;

    for (const lineItem of inv.items) {
      if (!lineItem.description) continue;
      const itemName = lineItem.description;
      const hsn = lineItem.hsn || '';
      const qty = lineItem.qty || 1;
      const rate = lineItem.rate || lineItem.taxable_value;
      const value = lineItem.taxable_value;

      if (inv.doc_type === 'CREDIT_NOTE') {
        // Sales Return → Inward (goods received back from customer)
        const item = ensureItem(itemName, hsn);
        const mv: InventoryMovement = {
          id: `${inv.id}-${lineItem.sl_no}`,
          date: inv.invoice_date,
          type: 'RETURN_IN',
          itemName,
          itemHsn: hsn,
          qty,
          rate,
          value,
          sourceInvoiceNo: inv.invoice_no,
          sourceInvoiceId: inv.id,
          partyName: inv.buyer_name,
          narration: `Return from ${inv.buyer_name} (CN: ${inv.invoice_no})`,
        };
        movements.push(mv);
        item.movements.push(mv);
        item.totalReturnInQty += qty;
        item.totalReturnInValue += value;
      } else {
        // Regular Sale → Outward
        const item = ensureItem(itemName, hsn);
        const mv: InventoryMovement = {
          id: `${inv.id}-${lineItem.sl_no}`,
          date: inv.invoice_date,
          type: 'OUTWARD',
          itemName,
          itemHsn: hsn,
          qty,
          rate,
          value,
          sourceInvoiceNo: inv.invoice_no,
          sourceInvoiceId: inv.id,
          partyName: inv.buyer_name,
          narration: `Sold to ${inv.buyer_name}`,
        };
        movements.push(mv);
        item.movements.push(mv);
        item.totalOutwardQty += qty;
        item.totalOutwardValue += value;
      }
    }
  }

  // ── Process Production Issues ──
  for (const pi of productionIssues) {
    const item = ensureItem(pi.itemName, pi.itemHsn);
    const mv: InventoryMovement = {
      id: pi.id,
      date: pi.date,
      type: 'ISSUE_PRODUCTION',
      itemName: pi.itemName,
      itemHsn: pi.itemHsn,
      qty: pi.qty,
      rate: pi.rate,
      value: pi.value,
      sourceInvoiceNo: '',
      sourceInvoiceId: pi.id,
      partyName: 'Production',
      narration: pi.narration,
    };
    movements.push(mv);
    item.movements.push(mv);
    item.totalIssuedQty += pi.qty;
    item.totalIssuedValue += pi.value;
  }

  // ── Calculate Net Stock ──
  let totalInwardValue = 0;
  let totalOutwardValue = 0;
  let totalReturnInValue = 0;
  let totalReturnOutValue = 0;
  let totalIssuedValue = 0;
  let totalNetStockValue = 0;

  for (const item of itemMap.values()) {
    item.netStockQty = item.totalInwardQty + item.totalReturnInQty - item.totalOutwardQty - item.totalReturnOutQty - item.totalIssuedQty;
    item.netStockValue = item.totalInwardValue + item.totalReturnInValue - item.totalOutwardValue - item.totalReturnOutValue - item.totalIssuedValue;

    totalInwardValue += item.totalInwardValue;
    totalOutwardValue += item.totalOutwardValue;
    totalReturnInValue += item.totalReturnInValue;
    totalReturnOutValue += item.totalReturnOutValue;
    totalIssuedValue += item.totalIssuedValue;
    totalNetStockValue += item.netStockValue;

    // Sort movements by date
    item.movements.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Sort all movements by date
  movements.sort((a, b) => a.date.localeCompare(b.date));

  return {
    items: Array.from(itemMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName)),
    totalInwardValue,
    totalOutwardValue,
    totalReturnInValue,
    totalReturnOutValue,
    totalIssuedValue,
    totalNetStockValue,
    movements,
  };
}
