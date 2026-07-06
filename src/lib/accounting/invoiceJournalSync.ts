/**
 * Auto-generate journal entries from sales/purchase invoices & returns.
 *
 * Called after DocumentWizard saves a new invoice so that
 * financial statements (Ledger, Trial Balance, P&L, BS) stay in sync
 * with GST records without manual JE creation.
 */

import type { InvoiceV2 } from '@/lib/accounting/gstInvoices';
import type { PurchaseInvoice } from '@/lib/accounting/gstInvoices';
import type { JournalLine } from '@/types/journal';
import { createJournalEntry, type NewJournalEntryInput } from '@/lib/offlineDb';
import { generateUniqueEntryCode } from '@/lib/utils/entryCodeGenerator';

// ── Account constants ──

const ACCT = {
  // Asset
  debtors:     { name: 'Sundry Debtors',                           group: 'Trade Receivables',          nature: 'asset' as const },
  cash:        { name: 'Cash in Hand',                             group: 'Cash & Cash Equivalents',    nature: 'asset' as const },
  bank:        { name: 'Bank Account',                             group: 'Bank Balances',              nature: 'asset' as const },
  cgstItc:     { name: 'Input CGST',  group: 'GST — Input Tax Credit', nature: 'asset' as const },
  sgstItc:     { name: 'Input SGST',  group: 'GST — Input Tax Credit', nature: 'asset' as const },
  igstItc:     { name: 'Input IGST',  group: 'GST — Input Tax Credit', nature: 'asset' as const },
  // Liability
  creditors:   { name: 'Sundry Creditors', group: 'Trade Payables',    nature: 'liability' as const },
  cgstOutput:  { name: 'Output CGST', group: 'GST — Output Tax',       nature: 'liability' as const },
  sgstOutput:  { name: 'Output SGST', group: 'GST — Output Tax',       nature: 'liability' as const },
  igstOutput:  { name: 'Output IGST', group: 'GST — Output Tax',       nature: 'liability' as const },
  // Revenue
  sales:       { name: 'Sales Account',    group: 'Revenue from Operations',     nature: 'revenue' as const },
  // Expense
  purchases:   { name: 'Purchase Account', group: 'Purchases of Stock-in-Trade', nature: 'expense' as const },
} as const;

// ── Helpers ──

function line(acct: { name: string; group: string; nature: JournalLine['nature'] }, debit: number, credit: number): JournalLine {
  return { account_name: acct.name, account_group: acct.group, nature: acct.nature, debit, credit };
}

/** Derive book period string from a YYYY-MM-DD date. */
function toBookPeriod(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  const fyStart = m >= 4 ? y : y - 1;
  return `FY ${fyStart}-${String(fyStart + 1).slice(2)}`;
}

// ── Sales ──

/**
 * Create a journal entry for a newly saved sales invoice or credit note.
 * Returns the JE id on success, or null if skipped (zero-amount / error).
 */
export function createSalesJournalEntry(companyId: string, invoice: InvoiceV2): string | null {
  if (!invoice.total_amount) return null;

  const isCreditNote = invoice.doc_type === 'CREDIT_NOTE';
  const voucherType = isCreditNote ? 'CN' : 'SLS';

  // CASH → Cash in Hand, ONLINE → Bank Account, CREDIT/PARTIAL → party name (Trade Receivables)
  const debitAcct =
    invoice.payment_mode === 'CASH' ? ACCT.cash
    : invoice.payment_mode === 'ONLINE' ? ACCT.bank
    : { name: invoice.buyer_name || ACCT.debtors.name, group: 'Trade Receivables', nature: 'asset' as const };

  // Use the sum of components (not Math.round'd total_amount) so the JE always balances.
  // total_amount = Math.round(subtotal) but cgst/sgst/igst are unrounded floats, so
  // total_taxable + total_cgst + total_sgst + total_igst may differ from total_amount by up to ±0.5.
  const exactTotal = invoice.total_taxable + invoice.total_cgst + invoice.total_sgst + invoice.total_igst;

  const lines: JournalLine[] = [];

  if (!isCreditNote) {
    // ── Normal sale: DR Debtors/Cash, CR Sales + GST ──
    lines.push(line(debitAcct, exactTotal, 0));
    lines.push(line(ACCT.sales, 0, invoice.total_taxable));
    if (invoice.total_cgst > 0) lines.push(line(ACCT.cgstOutput, 0, invoice.total_cgst));
    if (invoice.total_sgst > 0) lines.push(line(ACCT.sgstOutput, 0, invoice.total_sgst));
    if (invoice.total_igst > 0) lines.push(line(ACCT.igstOutput, 0, invoice.total_igst));
  } else {
    // ── Credit note: DR Sales (reduces sales balance) + reverse GST, CR Debtors/Cash ──
    lines.push(line(ACCT.sales, invoice.total_taxable, 0));
    if (invoice.total_cgst > 0) lines.push(line(ACCT.cgstOutput, invoice.total_cgst, 0));
    if (invoice.total_sgst > 0) lines.push(line(ACCT.sgstOutput, invoice.total_sgst, 0));
    if (invoice.total_igst > 0) lines.push(line(ACCT.igstOutput, invoice.total_igst, 0));
    lines.push(line(debitAcct, 0, exactTotal));
  }

  const narration = isCreditNote
    ? `Credit Note ${invoice.invoice_no} — ${invoice.buyer_name || 'Consumer'}`
    : `Sales Invoice ${invoice.invoice_no} — ${invoice.buyer_name || 'Consumer'}`;

  try {
    const entry = createJournalEntry({
      company_id: companyId,
      entry_code: generateUniqueEntryCode(companyId, voucherType),
      entry_date: invoice.invoice_date,
      voucher_type: voucherType,
      voucher_number: invoice.invoice_no,
      lines,
      narration,
      book_period: toBookPeriod(invoice.invoice_date),
    } satisfies NewJournalEntryInput);
    return entry.id;
  } catch {
    console.error('[invoiceJournalSync] Failed to create sales JE for', invoice.invoice_no);
    return null;
  }
}

// ── Purchase ──

/**
 * Create a journal entry for a newly saved purchase invoice or debit note.
 * Returns the JE id on success, or null if skipped (zero-amount / error).
 */
export function createPurchaseJournalEntry(companyId: string, purchase: PurchaseInvoice): string | null {
  if (!purchase.total) return null;

  const isDebitNote = purchase.bucket === 'CDNR';
  const voucherType = isDebitNote ? 'DN' : 'PUR';

  // CASH → Cash in Hand, ONLINE → Bank Account, CREDIT/PARTIAL → party name (Trade Payables)
  const creditAcct =
    purchase.payment_mode === 'CASH' ? ACCT.cash
    : purchase.payment_mode === 'ONLINE' ? ACCT.bank
    : { name: purchase.vendor_name || ACCT.creditors.name, group: 'Trade Payables', nature: 'liability' as const };

  const lines: JournalLine[] = [];

  // When ITC is not eligible, the purchase amount includes tax
  const purchaseAmount = purchase.itc_eligible ? purchase.taxable_value : purchase.total;

  if (!isDebitNote) {
    // ── Normal purchase: DR Purchases + ITC, CR Creditors/Cash ──
    lines.push(line(ACCT.purchases, purchaseAmount, 0));
    if (purchase.itc_eligible) {
      if (purchase.cgst > 0) lines.push(line(ACCT.cgstItc, purchase.cgst, 0));
      if (purchase.sgst > 0) lines.push(line(ACCT.sgstItc, purchase.sgst, 0));
      if (purchase.igst > 0) lines.push(line(ACCT.igstItc, purchase.igst, 0));
    }
    lines.push(line(creditAcct, 0, purchase.total));
  } else {
    // ── Debit note: DR Creditors/Cash, CR All Purchases (reduces purchase balance) + reverse ITC ──
    lines.push(line(creditAcct, purchase.total, 0));
    lines.push(line(ACCT.purchases, 0, purchaseAmount));
    if (purchase.itc_eligible) {
      if (purchase.cgst > 0) lines.push(line(ACCT.cgstItc, 0, purchase.cgst));
      if (purchase.sgst > 0) lines.push(line(ACCT.sgstItc, 0, purchase.sgst));
      if (purchase.igst > 0) lines.push(line(ACCT.igstItc, 0, purchase.igst));
    }
  }

  const narration = isDebitNote
    ? `Debit Note ${purchase.invoice_no} — ${purchase.vendor_name}`
    : `Purchase Invoice ${purchase.invoice_no} — ${purchase.vendor_name}`;

  try {
    const entry = createJournalEntry({
      company_id: companyId,
      entry_code: generateUniqueEntryCode(companyId, voucherType),
      entry_date: purchase.invoice_date,
      voucher_type: voucherType,
      voucher_number: purchase.invoice_no,
      lines,
      narration,
      book_period: toBookPeriod(purchase.invoice_date),
    } satisfies NewJournalEntryInput);
    return entry.id;
  } catch {
    console.error('[invoiceJournalSync] Failed to create purchase JE for', purchase.invoice_no);
    return null;
  }
}

// ── Returns ──

/**
 * Create a journal entry for a sales return (Credit Note) or purchase return
 * (Debit Note) saved as InvoiceV2 by ReturnModal.
 *
 * Voucher types: CR → SR (SR00001…), DN → PR (PR00001…)
 *
 * Sales Return (Credit Note):
 *   DR Sales Account [taxable]  +  DR GST Output [gst]  →  CR party/Cash/Bank [total]
 *
 * Purchase Return (Debit Note):
 *   DR party/Cash/Bank [total]  →  CR Purchase Account [taxable]  +  CR GST ITC [gst]
 */
export function createReturnJournalEntry(companyId: string, invoice: InvoiceV2): string | null {
  if (!invoice.total_amount) return null;

  const isCreditNote = invoice.doc_type === 'CREDIT_NOTE';
  const voucherType = isCreditNote ? 'SR' : 'PR';

  // Resolve the party / cash / bank account
  const partyAcct =
    invoice.payment_mode === 'CASH' ? ACCT.cash
    : invoice.payment_mode === 'ONLINE' ? ACCT.bank
    : isCreditNote
      ? { name: invoice.buyer_name || ACCT.debtors.name,   group: 'Trade Receivables', nature: 'asset'     as const }
      : { name: invoice.buyer_name || ACCT.creditors.name, group: 'Trade Payables',    nature: 'liability' as const };

  // Use component sum as the party amount so the JE always balances (same rounding fix as createSalesJournalEntry).
  const exactTotal = invoice.total_taxable + invoice.total_cgst + invoice.total_sgst + invoice.total_igst;

  const lines: JournalLine[] = [];

  if (isCreditNote) {
    // Sales Return: DR Sales + reverse GST output; CR party/Cash/Bank
    lines.push(line(ACCT.sales, invoice.total_taxable, 0));
    if (invoice.total_cgst > 0) lines.push(line(ACCT.cgstOutput, invoice.total_cgst, 0));
    if (invoice.total_sgst > 0) lines.push(line(ACCT.sgstOutput, invoice.total_sgst, 0));
    if (invoice.total_igst > 0) lines.push(line(ACCT.igstOutput, invoice.total_igst, 0));
    lines.push(line(partyAcct, 0, exactTotal));
  } else {
    // Purchase Return: DR party/Cash/Bank; CR Purchases + reverse ITC
    lines.push(line(partyAcct, exactTotal, 0));
    lines.push(line(ACCT.purchases, 0, invoice.total_taxable));
    if (invoice.total_cgst > 0) lines.push(line(ACCT.cgstItc, 0, invoice.total_cgst));
    if (invoice.total_sgst > 0) lines.push(line(ACCT.sgstItc, 0, invoice.total_sgst));
    if (invoice.total_igst > 0) lines.push(line(ACCT.igstItc, 0, invoice.total_igst));
  }

  const partyName = invoice.buyer_name || (isCreditNote ? 'Consumer' : 'Vendor');
  const narration = isCreditNote
    ? `Credit Note ${invoice.invoice_no} — ${partyName}`
    : `Debit Note ${invoice.invoice_no} — ${partyName}`;

  try {
    const entry = createJournalEntry({
      company_id: companyId,
      entry_code: generateUniqueEntryCode(companyId, voucherType),
      entry_date: invoice.invoice_date,
      voucher_type: voucherType,
      voucher_number: invoice.invoice_no,
      lines,
      narration,
      book_period: toBookPeriod(invoice.invoice_date),
    } satisfies NewJournalEntryInput);
    return entry.id;
  } catch {
    console.error('[invoiceJournalSync] Failed to create return JE for', invoice.invoice_no);
    return null;
  }
}
