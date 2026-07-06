/**
 * GST system — single source of truth for how this app treats GST in books.
 *
 * Use this module for:
 * - GSTR-1 / GSTR-3B / ITC register / HSN summary (see gstCompute.ts)
 * - Aligning new features (AI, imports) with the same naming rules
 *
 * Conventions (must stay in sync with inventory expansion in inventoryJournal.ts):
 * - Sales with stock/GST: voucher **SLS**. Tax lines use **Output CGST | Output SGST | Output IGST**
 *   (prefix "Output", then space, then CGST/SGST/IGST).
 * - Purchases with stock/GST: voucher **PUR**. Tax lines use **Input CGST | Input SGST | Input IGST**.
 * - Taxable value: lines under COA sub-group **Revenue from Operations** (sales) or purchases cost
 *   lines as per voucher, matched in gstCompute.
 * - Party GSTIN: optional **party_gstin** on the journal entry (when captured).
 * - HSN: optional **hsn_code** on lines (or from inventory sub-lines → propagated where implemented).
 *
 * Account groups (master COA sub-groups) used for classification:
 */

/** Sales / outward taxable value (credit in sales entries). */
export const GST_REVENUE_SUBGROUPS = ['Revenue from Operations'] as const;

/** B2B party name — trade receivables line on sales. */
export const GST_DEBTOR_SUBGROUPS = ['Trade Receivables'] as const;

/** Supplier name — trade payables on purchases. */
export const GST_CREDITOR_SUBGROUPS = ['Trade Payables'] as const;

/** Output GST liability lines. */
export const GST_OUTPUT_SUBGROUPS = ['GST — Output Tax'] as const;

/** Input GST / ITC asset lines. */
export const GST_INPUT_SUBGROUPS = ['GST — Input Tax Credit'] as const;

/** Reverse charge etc. */
export const GST_RCM_SUBGROUPS = ['GST — RCM'] as const;

export const GST_VOUCHER = {
  SALES: 'SLS',
  PURCHASE: 'PUR',
} as const;

/** Line shape used by GST parsers (matches computeEngine JournalLine). */
export interface GstLineLike {
  account_name: string;
  account_group: string;
  debit: number;
  credit: number;
  hsn_code?: string;
}

function lower(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Detect CGST/SGST/IGST from account name for OUTPUT tax lines (sales side — typically credited).
 */
export function matchOutputGstTaxComponent(accountName: string, accountGroup: string): 'cgst' | 'sgst' | 'igst' | null {
  const n = lower(accountName);
  const inOutputGroup = GST_OUTPUT_SUBGROUPS.includes(accountGroup as (typeof GST_OUTPUT_SUBGROUPS)[number]);

  // Do not treat ITC-style names as output tax on the same entry.
  if (n.includes('input cgst') || n.includes('input sgst') || n.includes('input igst')) return null;

  if (n.includes('output cgst') || (inOutputGroup && n.includes('cgst'))) return 'cgst';
  if (n.includes('output sgst') || (inOutputGroup && n.includes('sgst'))) return 'sgst';
  if (n.includes('output igst') || (inOutputGroup && n.includes('igst'))) return 'igst';
  // Bare "igst" in name (e.g. legacy "IGST Payable") — only when clearly output, not input itc
  if (n.includes('igst') && !n.includes('input')) return 'igst';
  return null;
}

/**
 * Detect CGST/SGST/IGST for INPUT / ITC lines (purchases — typically debited).
 */
export function matchInputGstTaxComponent(accountName: string, accountGroup: string): 'cgst' | 'sgst' | 'igst' | null {
  const n = lower(accountName);
  const inInputGroup = GST_INPUT_SUBGROUPS.includes(accountGroup as (typeof GST_INPUT_SUBGROUPS)[number]);

  if (n.includes('output cgst') || n.includes('output sgst') || n.includes('output igst')) return null;

  if (n.includes('input cgst') || (inInputGroup && n.includes('cgst'))) return 'cgst';
  if (n.includes('input sgst') || (inInputGroup && n.includes('sgst'))) return 'sgst';
  if (n.includes('input igst') || (inInputGroup && n.includes('igst'))) return 'igst';
  return null;
}

export function matchRcmGstTaxComponent(accountName: string): 'cgst' | 'sgst' | 'igst' | null {
  const n = lower(accountName);
  if (n.includes('cgst')) return 'cgst';
  if (n.includes('sgst')) return 'sgst';
  if (n.includes('igst')) return 'igst';
  return null;
}

/** Add taxable + tax components from one line of a sales entry toward GSTR-1 row totals. */
export function accumulateGstr1Line(
  line: GstLineLike,
  acc: { taxableValue: number; cgst: number; sgst: number; igst: number }
): void {
  const ag = line.account_group;

  if (GST_REVENUE_SUBGROUPS.includes(ag as (typeof GST_REVENUE_SUBGROUPS)[number])) {
    acc.taxableValue += line.credit || 0;
    return;
  }

  const out = matchOutputGstTaxComponent(line.account_name, ag);
  if (out === 'cgst') acc.cgst += line.credit || 0;
  else if (out === 'sgst') acc.sgst += line.credit || 0;
  else if (out === 'igst') acc.igst += line.credit || 0;
}

/** Party name for B2B: first trade receivables line account name. */
export function pickDebtorPartyName(lines: GstLineLike[]): string {
  for (const line of lines) {
    if (GST_DEBTOR_SUBGROUPS.includes(line.account_group as (typeof GST_DEBTOR_SUBGROUPS)[number])) {
      return line.account_name;
    }
  }
  return '';
}

/** Supplier name on purchase: first trade payables line. */
export function pickCreditorPartyName(lines: GstLineLike[]): string {
  for (const line of lines) {
    if (GST_CREDITOR_SUBGROUPS.includes(line.account_group as (typeof GST_CREDITOR_SUBGROUPS)[number])) {
      return line.account_name;
    }
  }
  return '';
}

/** Sum ITC components from one purchase line. */
export function accumulateItcFromPurchaseLine(
  line: GstLineLike,
  acc: { cgst: number; sgst: number; igst: number }
): void {
  const ag = line.account_group;
  const kind = matchInputGstTaxComponent(line.account_name, ag);
  if (kind === 'cgst') acc.cgst += line.debit || 0;
  else if (kind === 'sgst') acc.sgst += line.debit || 0;
  else if (kind === 'igst') acc.igst += line.debit || 0;
}

/** RCM amounts (credited to liability lines in current model). */
export function accumulateRcmFromLine(line: GstLineLike, acc: { cgst: number; sgst: number; igst: number }): void {
  if (!GST_RCM_SUBGROUPS.includes(line.account_group as (typeof GST_RCM_SUBGROUPS)[number])) return;
  const kind = matchRcmGstTaxComponent(line.account_name);
  const amt = line.credit || 0;
  if (kind === 'cgst') acc.cgst += amt;
  else if (kind === 'sgst') acc.sgst += amt;
  else if (kind === 'igst') acc.igst += amt;
}
