import type { JournalEntry } from './computeEngine';
import {
  GST_CREDITOR_SUBGROUPS,
  GST_INPUT_SUBGROUPS,
  GST_REVENUE_SUBGROUPS,
  GST_VOUCHER,
  accumulateGstr1Line,
  accumulateItcFromPurchaseLine,
  accumulateRcmFromLine,
  pickCreditorPartyName,
  pickDebtorPartyName,
} from './gstSystem';

export interface GSTRegisterRow {
  date: string;
  voucherNumber: string;
  partyName: string;
  gstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  invoiceTotal: number;
}

export interface GSTR1Summary {
  b2b: GSTRegisterRow[];
  b2c: GSTRegisterRow[];
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
}

export interface GSTR3BSummary {
  outwardSupplies: { taxableValue: number; cgst: number; sgst: number; igst: number };
  itcAvailed: { cgst: number; sgst: number; igst: number };
  /** ITC to be reversed — Section 4(B)(2): purchase returns / debit notes */
  itcReversed: { cgst: number; sgst: number; igst: number };
  netTaxPayable: { cgst: number; sgst: number; igst: number };
}

export interface ITCRegisterRow {
  date: string;
  supplierName: string;
  gstin: string;
  invoiceNumber: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: 'available' | 'reversed' | 'blocked';
}

export function computeGSTR1(entries: JournalEntry[]): GSTR1Summary {
  const b2b: GSTRegisterRow[] = [];
  const b2c: GSTRegisterRow[] = [];

  const salesEntries = entries.filter((e) => e.voucher_type === GST_VOUCHER.SALES);

  for (const entry of salesEntries) {
    const acc = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
    for (const line of entry.lines) {
      accumulateGstr1Line(line, acc);
    }

    const { taxableValue, cgst, sgst, igst } = acc;
    if (taxableValue > 0) {
      const partyName = pickDebtorPartyName(entry.lines);
      const gstin = entry.party_gstin ?? '';
      const row: GSTRegisterRow = {
        date: entry.entry_date,
        voucherNumber: entry.voucher_number || entry.entry_code,
        partyName,
        gstin,
        taxableValue,
        cgst,
        sgst,
        igst,
        totalGst: cgst + sgst + igst,
        invoiceTotal: taxableValue + cgst + sgst + igst,
      };
      (partyName ? b2b : b2c).push(row);
    }
  }

  const allRows = [...b2b, ...b2c];
  return {
    b2b,
    b2c,
    totalTaxableValue: allRows.reduce((s, r) => s + r.taxableValue, 0),
    totalCGST: allRows.reduce((s, r) => s + r.cgst, 0),
    totalSGST: allRows.reduce((s, r) => s + r.sgst, 0),
    totalIGST: allRows.reduce((s, r) => s + r.igst, 0),
  };
}

export function computeGSTR3B(entries: JournalEntry[]): GSTR3BSummary {
  const gstr1 = computeGSTR1(entries);

  const itc = { cgst: 0, sgst: 0, igst: 0 };
  const purchaseEntries = entries.filter((e) => e.voucher_type === GST_VOUCHER.PURCHASE);

  for (const entry of purchaseEntries) {
    for (const line of entry.lines) {
      accumulateItcFromPurchaseLine(line, itc);
    }
  }

  const rcm = { cgst: 0, sgst: 0, igst: 0 };
  for (const entry of entries) {
    for (const line of entry.lines) {
      accumulateRcmFromLine(line, rcm);
    }
  }

  return {
    outwardSupplies: {
      taxableValue: gstr1.totalTaxableValue,
      cgst: gstr1.totalCGST,
      sgst: gstr1.totalSGST,
      igst: gstr1.totalIGST,
    },
    itcAvailed: { cgst: itc.cgst, sgst: itc.sgst, igst: itc.igst },
    itcReversed: { cgst: 0, sgst: 0, igst: 0 }, // journal-based path; invoice-based path handles this
    netTaxPayable: {
      cgst: gstr1.totalCGST - itc.cgst + rcm.cgst,
      sgst: gstr1.totalSGST - itc.sgst + rcm.sgst,
      igst: gstr1.totalIGST - itc.igst + rcm.igst,
    },
  };
}

export function computeITCRegister(entries: JournalEntry[]): ITCRegisterRow[] {
  const rows: ITCRegisterRow[] = [];
  const purchaseEntries = entries.filter((e) => e.voucher_type === GST_VOUCHER.PURCHASE);

  for (const entry of purchaseEntries) {
    const acc = { cgst: 0, sgst: 0, igst: 0 };
    for (const line of entry.lines) {
      accumulateItcFromPurchaseLine(line, acc);
    }

    const { cgst, sgst, igst } = acc;
    if (cgst > 0 || sgst > 0 || igst > 0) {
      const supplierName = pickCreditorPartyName(entry.lines);
      const gstin = entry.party_gstin ?? '';
      rows.push({
        date: entry.entry_date,
        supplierName,
        gstin,
        invoiceNumber: entry.voucher_number || entry.entry_code,
        cgst,
        sgst,
        igst,
        total: cgst + sgst + igst,
        status: 'available',
      });
    }
  }
  return rows;
}

export interface HSNSummaryRow {
  hsnCode: string;
  description: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

/** HSN-wise summary for GSTR-1 / reporting. Uses line.hsn_code when present; else grouped under "N/A". */
export function computeHSNSummary(entries: JournalEntry[]): HSNSummaryRow[] {
  const byHsn = new Map<string, { taxableValue: number; cgst: number; sgst: number; igst: number }>();

  const salesEntries = entries.filter((e) => e.voucher_type === GST_VOUCHER.SALES);
  for (const entry of salesEntries) {
    let hsnCode = 'N/A';
    const acc = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };

    for (const line of entry.lines) {
      if (
        GST_REVENUE_SUBGROUPS.includes(line.account_group as (typeof GST_REVENUE_SUBGROUPS)[number]) &&
        line.hsn_code
      ) {
        hsnCode = line.hsn_code;
      }
      accumulateGstr1Line(line, acc);
    }

    const { taxableValue, cgst, sgst, igst } = acc;
    if (taxableValue > 0 || cgst > 0 || sgst > 0 || igst > 0) {
      const cur = byHsn.get(hsnCode) ?? { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      cur.taxableValue += taxableValue;
      cur.cgst += cgst;
      cur.sgst += sgst;
      cur.igst += igst;
      byHsn.set(hsnCode, cur);
    }
  }

  return Array.from(byHsn.entries()).map(([hsnCode, v]) => ({
    hsnCode,
    description: hsnCode === 'N/A' ? 'Not specified' : `HSN ${hsnCode}`,
    taxableValue: v.taxableValue,
    cgst: v.cgst,
    sgst: v.sgst,
    igst: v.igst,
    totalTax: v.cgst + v.sgst + v.igst,
  }));
}

export interface GSTReconciliationRow {
  invoiceNumber: string;
  invoiceDate: string;
  supplierGstin: string;
  taxableValue: number;
  taxAmount: number;
  bookValue: number;
  bookTax: number;
  matchStatus: 'matched' | 'mismatch' | 'not_in_2b' | 'extra_in_2b';
}

/** Placeholder for GSTR-2A/2B vs books reconciliation. Pass external 2B data when available. */
export function computeGSTReconciliation(
  entries: JournalEntry[],
  _gstr2BData?: { invoiceNumber: string; taxableValue: number; taxAmount: number }[]
): GSTReconciliationRow[] {
  const purchaseEntries = entries.filter((e) => e.voucher_type === GST_VOUCHER.PURCHASE);
  const rows: GSTReconciliationRow[] = [];
  for (const entry of purchaseEntries) {
    let taxableValue = 0;
    let taxAmount = 0;
    for (const line of entry.lines) {
      if (GST_CREDITOR_SUBGROUPS.includes(line.account_group as (typeof GST_CREDITOR_SUBGROUPS)[number])) {
        taxableValue += line.credit || line.debit || 0;
      }
      if (GST_INPUT_SUBGROUPS.includes(line.account_group as (typeof GST_INPUT_SUBGROUPS)[number])) {
        taxAmount += line.debit || 0;
      }
    }
    if (taxableValue > 0 || taxAmount > 0) {
      rows.push({
        invoiceNumber: entry.voucher_number || entry.entry_code,
        invoiceDate: entry.entry_date,
        supplierGstin: entry.party_gstin ?? '',
        taxableValue,
        taxAmount,
        bookValue: taxableValue,
        bookTax: taxAmount,
        matchStatus: _gstr2BData ? 'matched' : 'not_in_2b',
      });
    }
  }
  return rows;
}
