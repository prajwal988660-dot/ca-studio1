import { GSTR1_CONFIG } from './config';
import type { InvoiceV2 } from '@/lib/accounting/gstInvoices';
import type {
  GSTR1Filing, B2BInvoice, B2CLInvoice, B2CSSummary,
  EXPInvoice, CDNRNote, CDNURNote, HSNSummary,
} from './types';

/** Convert YYYY-MM-DD → DD-MM-YYYY */
function toDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Auto-fill GSTR-1 sections from InvoiceV2 register data.
 * Replaces the old `autoFillFromEntries` (journal-based) approach.
 */
export function autoFillFromInvoices(
  invoices: InvoiceV2[],
  filing: GSTR1Filing,
  companyStateCode: string,
): GSTR1Filing {
  const [mm, yyyy] = [filing.period.slice(0, 2), filing.period.slice(2)];
  const monthStr = `${yyyy}-${mm}`;

  // Filter to this period, exclude cancelled
  const active = invoices.filter(
    (inv) => inv.invoice_date.startsWith(monthStr) && inv.status !== 'CANCELLED',
  );

  const b2b: B2BInvoice[] = [];
  const b2cl: B2CLInvoice[] = [];
  const b2csMap = new Map<string, B2CSSummary>();
  const exp: EXPInvoice[] = [];
  const cdnrMap = new Map<string, CDNRNote>();
  const cdnur: CDNURNote[] = [];
  const hsnMap = new Map<string, { desc: string; uqc: string; qty: number; val: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }>();

  for (const inv of active) {
    const idt = toDDMMYYYY(inv.invoice_date);
    const pos = inv.place_of_supply || inv.buyer_state_code || companyStateCode;
    const itms = inv.items.map((item, idx) => ({
      num: idx + 1,
      itm_det: {
        rt: item.gst_rate,
        txval: item.taxable_value,
        iamt: item.igst || undefined,
        camt: item.cgst || undefined,
        samt: item.sgst || undefined,
        csamt: item.cess || undefined,
      },
    }));

    // Aggregate HSN from all sales-type invoices
    if (inv.doc_type === 'TAX_INVOICE' || inv.doc_type === 'BILL_OF_SUPPLY') {
      for (const item of inv.items) {
        const hsn = item.hsn || 'N/A';
        const cur = hsnMap.get(hsn) ?? { desc: hsn === 'N/A' ? 'Not specified' : `HSN ${hsn}`, uqc: item.uqc || 'NOS', qty: 0, val: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        cur.qty += item.qty;
        cur.val += item.line_total;
        cur.txval += item.taxable_value;
        cur.iamt += item.igst;
        cur.camt += item.cgst;
        cur.samt += item.sgst;
        cur.csamt += item.cess;
        hsnMap.set(hsn, cur);
      }
    }

    // ── B2B ──
    if (inv.gstr1_table === 'B2B' && inv.doc_type === 'TAX_INVOICE') {
      b2b.push({
        id: inv.id,
        ctin: inv.buyer_gstin || '',
        inv_typ: (inv.invoice_type === 'CBW' ? 'R' : inv.invoice_type) || 'R',
        inum: inv.invoice_no,
        idt,
        val: inv.total_amount,
        pos,
        rchrg: inv.reverse_charge ? 'Y' : 'N',
        itms,
      });
    }

    // ── B2CL ──
    else if (inv.gstr1_table === 'B2CL' && inv.doc_type === 'TAX_INVOICE') {
      b2cl.push({
        id: inv.id,
        inum: inv.invoice_no,
        idt,
        val: inv.total_amount,
        pos,
        itms,
      });
    }

    // ── B2CS ──
    else if (inv.gstr1_table === 'B2CS' && inv.doc_type === 'TAX_INVOICE') {
      const sply_ty: 'INTRA' | 'INTER' = inv.supply_type === 'inter' ? 'INTER' : 'INTRA';
      for (const item of inv.items) {
        const key = `${pos}_${item.gst_rate}_${sply_ty}`;
        const existing = b2csMap.get(key);
        if (existing) {
          existing.txval += item.taxable_value;
          if (item.igst) existing.iamt = (existing.iamt ?? 0) + item.igst;
          if (item.cgst) existing.camt = (existing.camt ?? 0) + item.cgst;
          if (item.sgst) existing.samt = (existing.samt ?? 0) + item.sgst;
          if (item.cess) existing.csamt = (existing.csamt ?? 0) + item.cess;
        } else {
          b2csMap.set(key, {
            id: `b2cs_${key}`,
            sply_ty,
            pos,
            rt: item.gst_rate,
            txval: item.taxable_value,
            iamt: item.igst || undefined,
            camt: item.cgst || undefined,
            samt: item.sgst || undefined,
            csamt: item.cess || undefined,
          });
        }
      }
    }

    // ── EXP ──
    else if (inv.gstr1_table === 'EXP' && inv.doc_type === 'TAX_INVOICE') {
      exp.push({
        id: inv.id,
        exp_typ: inv.export_type || 'WPAY',
        inum: inv.invoice_no,
        idt,
        val: inv.total_amount,
        sbnum: inv.shipping_bill_no,
        sbdt: inv.shipping_bill_date ? toDDMMYYYY(inv.shipping_bill_date) : undefined,
        sbpcode: inv.port_code,
        itms: inv.items.map((item) => ({
          txval: item.taxable_value,
          rt: item.gst_rate,
          iamt: item.igst || undefined,
        })),
      });
    }

    // ── CDNR ──
    else if (inv.gstr1_table === 'CDNR' && (inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE')) {
      const ctin = inv.buyer_gstin || '';
      const ntty: 'C' | 'D' = inv.doc_type === 'CREDIT_NOTE' ? 'C' : 'D';
      const existing = cdnrMap.get(ctin);
      const ntEntry = { ntnum: inv.invoice_no, ntdt: idt, val: inv.total_amount, itms };
      if (existing) {
        existing.nt.push(ntEntry);
      } else {
        cdnrMap.set(ctin, {
          id: `cdnr_${ctin}_${inv.id}`,
          ctin,
          ntty,
          nt: [ntEntry],
        });
      }
    }

    // ── CDNUR ──
    else if (inv.gstr1_table === 'CDNUR' && (inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE')) {
      cdnur.push({
        id: inv.id,
        ntty: inv.doc_type === 'CREDIT_NOTE' ? 'C' : 'D',
        typ: inv.cdnur_type || 'B2CL',
        ntnum: inv.invoice_no,
        ntdt: idt,
        val: inv.total_amount,
        pos,
        itms,
      });
    }
  }

  // Build HSN summary array
  const hsn: HSNSummary[] = Array.from(hsnMap.entries()).map(([hsnCode, v], idx) => ({
    id: `hsn_${hsnCode}`,
    num: idx + 1,
    hsn_sc: hsnCode,
    desc: v.desc,
    uqc: v.uqc,
    qty: v.qty,
    val: v.val,
    txval: v.txval,
    iamt: v.iamt,
    camt: v.camt,
    samt: v.samt,
    csamt: v.csamt,
  }));

  return {
    ...filing,
    b2b,
    b2cl,
    b2cs: Array.from(b2csMap.values()),
    exp,
    cdnr: Array.from(cdnrMap.values()),
    cdnur,
    hsn,
  };
}
