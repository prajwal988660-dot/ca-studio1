import type { InvoiceV2, PurchaseInvoice } from './gstInvoices';
import type { GSTR3BSummary, ITCRegisterRow } from './gstCompute';

/**
 * Compute GSTR-3B summary from invoice registers instead of journal entries.
 * Section 3.1 (Outward) from sales, Section 4 (ITC) from purchases, Section 5 (Net).
 */
export function computeGSTR3BFromInvoices(
  sales: InvoiceV2[],
  purchases: PurchaseInvoice[],
): GSTR3BSummary {
  // Section 3.1 — Outward supplies (exclude cancelled, exclude debit notes which are purchase docs)
  // Credit notes REDUCE outward supplies (sign = -1); all other sales types add normally
  const activeSales = sales.filter((s) => s.status !== 'CANCELLED' && s.doc_type !== 'DEBIT_NOTE');
  let outTxval = 0, outCgst = 0, outSgst = 0, outIgst = 0;
  for (const inv of activeSales) {
    const sign = inv.doc_type === 'CREDIT_NOTE' ? -1 : 1;
    outTxval += sign * inv.total_taxable;
    outCgst  += sign * inv.total_cgst;
    outSgst  += sign * inv.total_sgst;
    outIgst  += sign * inv.total_igst;
  }

  // Section 4(A) — Eligible ITC from purchase invoices
  let itcCgst = 0, itcSgst = 0, itcIgst = 0;
  for (const p of purchases) {
    if (p.itc_eligible && (!p.itc_status || p.itc_status === 'ELIGIBLE_FULL' || p.itc_status === 'ELIGIBLE_PARTIAL')) {
      itcCgst += p.cgst;
      itcSgst += p.sgst;
      itcIgst += p.igst;
    }
  }

  // Section 4(B)(2) — ITC to be reversed: purchase returns (debit notes stored in V2 invoice store)
  const debitNotes = sales.filter((s) => s.status !== 'CANCELLED' && s.doc_type === 'DEBIT_NOTE');
  let revCgst = 0, revSgst = 0, revIgst = 0;
  for (const dn of debitNotes) {
    revCgst += dn.total_cgst;
    revSgst += dn.total_sgst;
    revIgst += dn.total_igst;
  }

  // Net ITC = availed - reversed
  const netItcCgst = itcCgst - revCgst;
  const netItcSgst = itcSgst - revSgst;
  const netItcIgst = itcIgst - revIgst;

  return {
    outwardSupplies: {
      taxableValue: outTxval,
      cgst: outCgst,
      sgst: outSgst,
      igst: outIgst,
    },
    itcAvailed: {
      cgst: itcCgst,
      sgst: itcSgst,
      igst: itcIgst,
    },
    itcReversed: {
      cgst: revCgst,
      sgst: revSgst,
      igst: revIgst,
    },
    netTaxPayable: {
      cgst: outCgst - netItcCgst,
      sgst: outSgst - netItcSgst,
      igst: outIgst - netItcIgst,
    },
  };
}

/**
 * Compute ITC register rows from purchase invoices.
 * Maps itc_status to available/blocked/reversed.
 */
export function computeITCFromPurchases(
  purchases: PurchaseInvoice[],
): ITCRegisterRow[] {
  const rows: ITCRegisterRow[] = [];
  for (const p of purchases) {
    const total = p.cgst + p.sgst + p.igst;
    if (total <= 0) continue;

    let status: 'available' | 'blocked' | 'reversed' = 'available';
    if (p.itc_status) {
      if (p.itc_status.startsWith('BLOCKED_') || p.itc_status.startsWith('INELIGIBLE_')) {
        status = 'blocked';
      } else if (p.itc_status.startsWith('REVERSED_')) {
        status = 'reversed';
      } else if (p.itc_status === 'PENDING_2B') {
        status = 'available'; // pending but not blocked
      }
    }
    if (!p.itc_eligible) {
      status = 'blocked';
    }

    rows.push({
      date: p.invoice_date,
      supplierName: p.vendor_name,
      gstin: p.vendor_gstin || '',
      invoiceNumber: p.invoice_no,
      cgst: p.cgst,
      sgst: p.sgst,
      igst: p.igst,
      total,
      status,
    });
  }
  return rows;
}
