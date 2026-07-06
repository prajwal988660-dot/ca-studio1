import { emitInvoiceDataChanged } from '@/lib/journalSync';
import { mirrorUpsert, mirrorDelete } from '@/lib/sync/cloudSync';

export type SalesBucket = 'B2B' | 'B2CL' | 'B2CS' | 'EXP' | 'CDNR' | 'CDNUR';
export type PurchaseBucket =
  | 'B2B'
  | 'URD'
  | 'IMPG'
  | 'IMPG_SEZ'
  | 'IMPS'
  | 'ISD'
  | 'CDNR'
  | 'EXEMPT_NIL'
  | 'CAPITAL_GOODS';
export type SupplyType = 'intra' | 'inter';

export type DocType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'RECEIPT_VOUCHER'
  | 'REFUND_VOUCHER'
  | 'PAYMENT_VOUCHER'
  | 'DELIVERY_CHALLAN';

export type BuyerType =
  | 'REGISTERED'
  | 'UNREGISTERED'
  | 'CONSUMER'
  | 'OVERSEAS'
  | 'SEZ'
  | 'DEEMED_EXPORT'
  | 'CBW';

export type SupplyNature =
  | 'TAXABLE'
  | 'ZERO_RATED'
  | 'NIL_RATED'
  | 'EXEMPT'
  | 'NON_GST'
  | 'MRP_INCLUSIVE';

export type Gstr1Table =
  | 'B2B'
  | 'B2BA'
  | 'B2CL'
  | 'B2CS'
  | 'B2CSA'
  | 'EXP'
  | 'EXPA'
  | 'CDNR'
  | 'CDNRA'
  | 'CDNUR'
  | 'CDNURA'
  | 'NIL'
  | 'AT'
  | 'ATA'
  | 'ATADJ'
  | 'TXPDA'
  | 'SEWP'
  | 'SEWOP'
  | 'DE'
  | 'NONE';

export type InvoiceStatus = 'DRAFT' | 'SAVED' | 'FILED' | 'CANCELLED';

export type BosReason =
  | 'COMPOSITION'
  | 'EXEMPT'
  | 'NIL_RATED'
  | 'NON_GST'
  | 'MRP_INCLUSIVE'
  | 'EXPORT_LUT';

export type CdnReason =
  | 'SALES_RETURN'
  | 'PRICE_REDUCTION'
  | 'DEFICIENCY_SERVICE'
  | 'POST_SALE_DISCOUNT'
  | 'CORRECTION'
  | 'OTHER';

export type RcmNature =
  | 'LEGAL_SERVICES'
  | 'DIRECTOR_SERVICES'
  | 'SECURITY_SERVICES'
  | 'MOTOR_VEHICLE_RENT'
  | 'IMPORT_SERVICES'
  | 'WORKS_CONTRACT'
  | 'OTHER_RCM';

export type ChallanPurpose =
  | 'JOB_WORK'
  | 'APPROVAL'
  | 'EXHIBITION'
  | 'LINE_SALES'
  | 'OTHER';

export const DOC_TYPE_OPTIONS: Array<{ code: DocType; label: string; description: string }> = [
  { code: 'TAX_INVOICE', label: 'Tax Invoice', description: 'Regular taxable supply' },
  { code: 'BILL_OF_SUPPLY', label: 'Bill of Supply', description: 'Exempt / Composition / MRP' },
  { code: 'CREDIT_NOTE', label: 'Credit Note', description: 'Reduces tax liability' },
  { code: 'DEBIT_NOTE', label: 'Debit Note', description: 'Increases tax liability' },
  { code: 'RECEIPT_VOUCHER', label: 'Receipt Voucher', description: 'Advance received' },
  { code: 'REFUND_VOUCHER', label: 'Refund Voucher', description: 'Refund of advance' },
  { code: 'PAYMENT_VOUCHER', label: 'Payment Voucher', description: 'RCM payment' },
  { code: 'DELIVERY_CHALLAN', label: 'Delivery Challan', description: 'Goods movement' },
];

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '96': 'Outside India',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([k, v]) => [v, k])
);

export const UQC_OPTIONS = [
  'NOS', 'KGS', 'MTR', 'LTR', 'SQM', 'CBM', 'TON', 'PAC', 'BOX', 'ROL',
  'TUB', 'BAG', 'BDL', 'BKL', 'BOU', 'BTL', 'CAN', 'CMS', 'DRM', 'GMS',
  'GRS', 'GYD', 'HRS', 'INC', 'JAR', 'KLR', 'KME', 'MLT', 'MRM', 'NLR',
  'PCS', 'PRS', 'QTL', 'SHT', 'SQF', 'SQY', 'TBS', 'TIN', 'UGS', 'UNT', 'YDS', 'OTH',
];

export const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 12, 18, 28, 40];

export const CESS_HSN_CODES: Record<string, { cessRate: number; specific: boolean; specificPerTon?: number; desc: string }> = {
  '2401': { cessRate: 0, specific: true, desc: 'Unmanufactured tobacco' },
  '2402': { cessRate: 5, specific: true, desc: 'Cigars, cheroots, cigarettes' },
  '2403': { cessRate: 0, specific: true, desc: 'Other manufactured tobacco' },
  '2106': { cessRate: 60, specific: false, desc: 'Pan masala' },
  '2202': { cessRate: 12, specific: false, desc: 'Aerated waters' },
  '2701': { cessRate: 0, specific: false, specificPerTon: 400, desc: 'Coal' },
  '2702': { cessRate: 0, specific: false, specificPerTon: 400, desc: 'Lignite' },
  '2703': { cessRate: 0, specific: false, specificPerTon: 400, desc: 'Peat' },
  '8703': { cessRate: 1, specific: false, desc: 'Motor cars' },
};

export type Gstr1SectionCode =
  | 'B2B'
  | 'B2BA'
  | 'B2CL'
  | 'B2CLA'
  | 'B2CS'
  | 'B2CSA'
  | 'CDNR'
  | 'CDNRA'
  | 'CDNUR'
  | 'CDNURA'
  | 'EXP'
  | 'EXPA'
  | 'AT'
  | 'ATA'
  | 'TXPD'
  | 'TXPDA'
  | 'NIL'
  | 'DOCS'
  | 'HSN_B2B'
  | 'HSN_B2C'
  | 'ECO_14'
  | 'ECO_14A_B2B'
  | 'ECO_14A_B2C'
  | 'ECO_14A_URP2B'
  | 'ECO_14A_URP2C'
  | 'ECO_15'
  | 'ECO_15A_B2B'
  | 'ECO_15A_B2C'
  | 'ECO_15A_URP2B'
  | 'ECO_15A_URP2C';

export const GSTR1_SECTION_OPTIONS: Array<{ code: Gstr1SectionCode; label: string }> = [
  { code: 'B2B', label: 'B2B, SEZ, DE Invoices - 4A, 4B, 6B, 6C' },
  { code: 'B2BA', label: 'Amended B2B Invoices' },
  { code: 'B2CL', label: 'B2C(Large) Invoices - 5A, 5B' },
  { code: 'B2CLA', label: 'Amended B2C(Large) Invoices' },
  { code: 'B2CS', label: 'B2C(Small) Details - 7' },
  { code: 'B2CSA', label: 'Amended B2C(Small) Details' },
  { code: 'CDNR', label: 'Credit/Debit Notes(Registered) - 9B' },
  { code: 'CDNRA', label: 'Amended Credit/Debit Notes(Registered)' },
  { code: 'CDNUR', label: 'Credit/Debit Notes(Unregistered) - 9B' },
  { code: 'CDNURA', label: 'Amended Credit/Debit Notes(Unregistered)' },
  { code: 'EXP', label: 'Exports Invoices - 6A' },
  { code: 'EXPA', label: 'Amended Exports Invoices' },
  { code: 'AT', label: 'Tax Liability(Advances Received) - 11A(1), 11A(2)' },
  { code: 'ATA', label: 'Amended Tax Liability(Advances Received)' },
  { code: 'TXPD', label: 'Adjustment of Advances - 11B(1), 11B(2)' },
  { code: 'TXPDA', label: 'Amended Adjustment of Advances' },
  { code: 'NIL', label: 'Nil Rated Invoices' },
  { code: 'DOCS', label: 'Documents Issued' },
  { code: 'HSN_B2B', label: 'HSN-wise summary of outward supplies (B2B) - 12' },
  { code: 'HSN_B2C', label: 'HSN-wise summary of outward supplies (B2C) - 12' },
  { code: 'ECO_14', label: 'Supplies made through ECO - 14' },
  { code: 'ECO_14A_B2B', label: 'Amended Supplies made through ECO - 14A (B2B)' },
  { code: 'ECO_14A_B2C', label: 'Amended Supplies made through ECO - 14A (B2C)' },
  { code: 'ECO_14A_URP2B', label: 'Amended Supplies made through ECO - 14A (URP2B)' },
  { code: 'ECO_14A_URP2C', label: 'Amended Supplies made through ECO - 14A (URP2C)' },
  { code: 'ECO_15', label: 'Supplies U/s 9(5) - 15' },
  { code: 'ECO_15A_B2B', label: 'Amended Supplies U/s 9(5) - 15A (B2B)' },
  { code: 'ECO_15A_B2C', label: 'Amended Supplies U/s 9(5) - 15A (B2C)' },
  { code: 'ECO_15A_URP2B', label: 'Amended Supplies U/s 9(5) - 15A (URP2B)' },
  { code: 'ECO_15A_URP2C', label: 'Amended Supplies U/s 9(5) - 15A (URP2C)' },
];

export interface LineItem {
  sl_no: number;
  description: string;
  hsn: string;
  is_service: boolean;
  uqc: string;
  qty: number;
  rate: number;
  discount: number;
  taxable_value: number;
  supply_nature: SupplyNature;
  gst_rate: number;
  cess_rate: number;
  cess_specific_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  line_total: number;
}

export interface InvoiceV2Draft {
  doc_type: DocType;
  gstr1_table: Gstr1Table;
  is_amendment?: boolean;
  invoice_no: string;
  invoice_date: string;
  period: string;
  reverse_charge: boolean;
  invoice_type?: 'R' | 'DE' | 'SEWP' | 'SEWOP' | 'CBW';
  ecom_gstin?: string;
  b2cs_typ?: 'OE' | 'E';
  diff_percent?: number;
  original_invoice_no?: string;
  original_invoice_date?: string;
  original_period?: string;
  cdnur_type?: 'B2CL' | 'EXPWP' | 'EXPWOP';
  note_type?: 'C' | 'D' | 'R';
  cdn_reason?: CdnReason;
  buyer_type: BuyerType;
  b2c_type?: 'B2CL' | 'B2CS';
  buyer_gstin?: string;
  buyer_name: string;
  buyer_address?: string;
  buyer_state: string;
  buyer_state_code: string;
  buyer_pincode?: string;
  export_type?: 'WPAY' | 'WOPAY';
  port_code?: string;
  shipping_bill_no?: string;
  shipping_bill_date?: string;
  currency: string;
  exchange_rate: number;
  place_of_supply: string;
  supply_type: SupplyType;
  is_intra_state: boolean;
  bos_reason?: BosReason;
  rcm_nature?: RcmNature;
  challan_purpose?: ChallanPurpose;
  vehicle_no?: string;
  transport_name?: string;
  items: LineItem[];
  total_taxable: number;
  total_discount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  round_off: number;
  total_amount: number;
  amount_in_words: string;
  nil_rated_value: number;
  exempt_value: number;
  non_gst_value: number;
  irn?: string;
  irn_date?: string;
  ack_no?: string;
  ack_date?: string;
  signed_qr?: string;
  status: InvoiceStatus;
  force_igst?: boolean;
  cancel_reason?: string;
  notes?: string;
  payment_mode?: 'CASH' | 'ONLINE' | 'CREDIT' | 'PARTIAL';
  received_medium?: 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER';
  amount_received?: number;
  amount_pending?: number;
  due_date?: string;
}

export interface InvoiceV2 extends InvoiceV2Draft {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface SalesInvoiceDraft {
  invoice_date: string;
  bucket: SalesBucket;
  section_code?: Gstr1SectionCode;
  customer_name: string;
  customer_gstin?: string;
  place_of_supply_state: string;
  supply_type: SupplyType;
  invoice_type?: 'Regular' | 'SEZWP' | 'SEZWOP' | 'DE' | 'EXPWP' | 'EXPWOP';
  reverse_charge?: boolean;
  ecommerce_gstin?: string;
  original_invoice_no?: string;
  original_invoice_date?: string;
  note_type?: 'Credit' | 'Debit';
  linked_journal_id?: string;
  hsn_code?: string;
  quantity?: number;
  uqc?: string;
  taxable_value: number;
  gst_rate: number;
  narration?: string;
  payment_mode?: 'CASH' | 'ONLINE' | 'CREDIT' | 'PARTIAL';
  received_medium?: 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER';
  amount_received?: number;
  amount_pending?: number;
  due_date?: string;
}

export interface PurchaseInvoiceDraft {
  invoice_date: string;
  vendor_invoice_no?: string;
  bucket: PurchaseBucket;
  purchase_sub_type?: string;
  vendor_name: string;
  vendor_gstin?: string;
  item_description?: string;
  item_hsn?: string;
  item_qty?: number;
  item_rate?: number;
  place_of_supply_state: string;
  supply_type: SupplyType;
  rcm_applicable?: boolean;
  taxable_value: number;
  gst_rate: number;
  itc_eligible: boolean;
  itc_status?: 'ELIGIBLE_FULL' | 'ELIGIBLE_PARTIAL' | 'BLOCKED_17_5' | 'INELIGIBLE_EXEMPT' | 'INELIGIBLE_PERSONAL' | 'INELIGIBLE_NO_DOC' | 'PENDING_2B' | 'REVERSED_42' | 'REVERSED_43';
  itc_block_reason?: '17(5)(a)' | '17(5)(aa)' | '17(5)(ab)' | '17(5)(b)' | '17(5)(c)' | '17(5)(d)' | '17(5)(e)' | '17(5)(f)' | '17(5)(g)' | '17(5)(h)';
  bill_of_entry_no?: string;
  bill_of_entry_date?: string;
  port_code?: string;
  assessment_value?: number;
  bcd_amount?: number;
  isd_type?: 'NORMAL' | 'REVERSAL';
  capital_goods?: boolean;
  original_invoice_no?: string;
  original_invoice_date?: string;
  linked_journal_id?: string;
  narration?: string;
  payment_mode?: 'CASH' | 'ONLINE' | 'CREDIT' | 'PARTIAL';
  paid_medium?: 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER';
  amount_paid?: number;
  amount_pending?: number;
  due_date?: string;
}

export interface SalesInvoice extends SalesInvoiceDraft {
  id: string;
  company_id: string;
  invoice_no: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoice extends PurchaseInvoiceDraft {
  id: string;
  company_id: string;
  invoice_no: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  created_at: string;
  updated_at: string;
}

type DbSchema = {
  sales: SalesInvoice[];
  purchases: PurchaseInvoice[];
};

const STORAGE_KEY = 'vaarta_gst_invoice_portal_v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadDb(): DbSchema {
  if (!isBrowser()) return { sales: [], purchases: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const empty = { sales: [], purchases: [] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DbSchema>;
    return {
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
    };
  } catch {
    return { sales: [], purchases: [] };
  }
}

function saveDb(db: DbSchema) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function id() {
  return `gst_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function financialYearShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = m < 3 ? y - 1 : y;
  const end = (start + 1).toString().slice(2);
  return `${start.toString().slice(2)}${end}`;
}

function nextInvoiceNo(companyId: string, kind: 'SLS' | 'PUR' | 'SCN' | 'DN', dateIso: string): string {
  const db = loadDb();
  const fy = financialYearShort(dateIso);
  const prefix = `${kind}-${fy}-`;
  const store = kind === 'SLS' || kind === 'SCN' ? db.sales : db.purchases;
  const seq = store
    .filter((x) => x.company_id === companyId && x.invoice_no.startsWith(prefix))
    .map((x) => Number.parseInt(x.invoice_no.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

function taxSplit(taxable: number, rate: number, supplyType: SupplyType) {
  const tax = (taxable || 0) * ((rate || 0) / 100);
  if (supplyType === 'inter') return { cgst: 0, sgst: 0, igst: tax };
  return { cgst: tax / 2, sgst: tax / 2, igst: 0 };
}

export function gstinIsValid(gstin?: string): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(gstin.trim());
}

export function bucketNeedsGstin(bucket: SalesBucket | PurchaseBucket): boolean {
  return bucket === 'B2B' || bucket === 'CDNR';
}

export function sectionNeedsGstin(section: Gstr1SectionCode): boolean {
  return ['B2B', 'B2BA', 'CDNR', 'CDNRA', 'ECO_14A_B2B', 'ECO_15A_B2B'].includes(section);
}

export function sectionNeedsOriginalRef(section: Gstr1SectionCode): boolean {
  return section.endsWith('A');
}

export function sectionNeedsHsn(section: Gstr1SectionCode): boolean {
  return section === 'HSN_B2B' || section === 'HSN_B2C';
}

export function listSalesInvoices(companyId: string): SalesInvoice[] {
  return loadDb().sales
    .filter((x) => x.company_id === companyId)
    .sort((a, b) => (a.invoice_date === b.invoice_date ? b.created_at.localeCompare(a.created_at) : b.invoice_date.localeCompare(a.invoice_date)));
}

export function listPurchaseInvoices(companyId: string): PurchaseInvoice[] {
  return loadDb().purchases
    .filter((x) => x.company_id === companyId)
    .sort((a, b) => (a.invoice_date === b.invoice_date ? b.created_at.localeCompare(a.created_at) : b.invoice_date.localeCompare(a.invoice_date)));
}

export function createSalesInvoice(companyId: string, draft: SalesInvoiceDraft): SalesInvoice {
  const db = loadDb();
  const now = new Date().toISOString();
  const taxable = Number(draft.taxable_value || 0);
  const rate = Number(draft.gst_rate || 0);
  const split = taxSplit(taxable, rate, draft.supply_type);
  const invoice: SalesInvoice = {
    ...draft,
    id: id(),
    company_id: companyId,
    invoice_no: nextInvoiceNo(companyId, 'SLS', draft.invoice_date),
    taxable_value: taxable,
    gst_rate: rate,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    total: taxable + split.cgst + split.sgst + split.igst,
    payment_mode: draft.payment_mode,
    received_medium: draft.received_medium,
    amount_received: draft.amount_received,
    amount_pending: draft.amount_pending,
    due_date: draft.due_date,
    created_at: now,
    updated_at: now,
  };
  db.sales.push(invoice);
  saveDb(db);
  return invoice;
}

export function createPurchaseInvoice(companyId: string, draft: PurchaseInvoiceDraft): PurchaseInvoice {
  const db = loadDb();
  const now = new Date().toISOString();
  const taxable = Number(draft.taxable_value || 0);
  const rate = Number(draft.gst_rate || 0);
  const split = taxSplit(taxable, rate, draft.supply_type);
  const invoice: PurchaseInvoice = {
    ...draft,
    id: id(),
    company_id: companyId,
    invoice_no: (draft.bucket === 'CDNR' && draft.vendor_invoice_no?.trim())
      ? draft.vendor_invoice_no.trim()
      : nextInvoiceNo(companyId, draft.bucket === 'CDNR' ? 'DN' : 'PUR', draft.invoice_date),
    taxable_value: taxable,
    gst_rate: rate,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    total: taxable + split.cgst + split.sgst + split.igst,
    payment_mode: draft.payment_mode,
    paid_medium: draft.paid_medium,
    amount_paid: draft.amount_paid,
    amount_pending: draft.amount_pending,
    due_date: draft.due_date,
    created_at: now,
    updated_at: now,
  };
  db.purchases.push(invoice);
  saveDb(db);
  return invoice;
}

export function updatePurchaseInvoice(id: string, draft: Partial<PurchaseInvoiceDraft>): PurchaseInvoice | null {
  const db = loadDb();
  const idx = db.purchases.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const existing = db.purchases[idx];
  const merged: PurchaseInvoice = {
    ...existing,
    ...draft,
    taxable_value: Number((draft.taxable_value ?? existing.taxable_value) || 0),
    gst_rate: Number((draft.gst_rate ?? existing.gst_rate) || 0),
    updated_at: new Date().toISOString(),
  };
  const split = taxSplit(merged.taxable_value, merged.gst_rate, merged.supply_type);
  merged.cgst = split.cgst;
  merged.sgst = split.sgst;
  merged.igst = split.igst;
  merged.total = merged.taxable_value + split.cgst + split.sgst + split.igst;
  db.purchases[idx] = merged;
  saveDb(db);
  emitInvoiceDataChanged(merged.company_id);
  return merged;
}

export function deleteSalesInvoice(id: string) {
  const db = loadDb();
  db.sales = db.sales.filter((x) => x.id !== id);
  saveDb(db);
}

export function deletePurchaseInvoice(id: string) {
  const db = loadDb();
  db.purchases = db.purchases.filter((x) => x.id !== id);
  saveDb(db);
}

export function getStateFromGSTIN(gstin?: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  return STATE_CODES[gstin.substring(0, 2)] || null;
}

export function getStateCodeFromGSTIN(gstin?: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  return STATE_CODES[code] ? code : null;
}

export function getStateCodeFromName(stateName?: string): string | null {
  if (!stateName) return null;
  return STATE_NAME_TO_CODE[stateName] || null;
}

export function getPanFromGSTIN(gstin?: string): string | null {
  if (!gstin || gstin.length < 12) return null;
  return gstin.substring(2, 12);
}

export function determineSupplyType(
  sellerStateCode?: string,
  buyerStateCode?: string,
  placeOfSupply?: string
): SupplyType {
  const pos = placeOfSupply || buyerStateCode;
  if (!sellerStateCode || !pos) return 'intra';
  return sellerStateCode === pos ? 'intra' : 'inter';
}

export function determineGSTR1Table(inv: InvoiceV2Draft): Gstr1Table {
  if (inv.doc_type === 'DELIVERY_CHALLAN') return 'NONE';
  if (inv.doc_type === 'PAYMENT_VOUCHER') return 'NONE';

  if (inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE') {
    const cdnRegisteredSide =
      inv.buyer_type === 'REGISTERED' ||
      inv.buyer_type === 'SEZ' ||
      inv.buyer_type === 'DEEMED_EXPORT' ||
      inv.buyer_type === 'CBW';
    if (cdnRegisteredSide) return inv.is_amendment ? 'CDNRA' : 'CDNR';
    return inv.is_amendment ? 'CDNURA' : 'CDNUR';
  }

  if (inv.doc_type === 'RECEIPT_VOUCHER') return inv.is_amendment ? 'ATA' : 'AT';
  if (inv.doc_type === 'REFUND_VOUCHER') return inv.is_amendment ? 'TXPDA' : 'ATADJ';
  if (inv.doc_type === 'BILL_OF_SUPPLY') return 'NIL';

  if (inv.doc_type === 'TAX_INVOICE') {
    if (inv.buyer_type === 'OVERSEAS') return inv.is_amendment ? 'EXPA' : 'EXP';
    if (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER') {
      if (inv.is_amendment) return 'B2CSA';
    }
    if (inv.buyer_type === 'REGISTERED' || inv.buyer_type === 'SEZ' || inv.buyer_type === 'DEEMED_EXPORT' || inv.buyer_type === 'CBW') {
      if (inv.is_amendment) return 'B2BA';
    }
    if (inv.invoice_type === 'DE') return 'DE';
    if (inv.invoice_type === 'SEWP') return 'SEWP';
    if (inv.invoice_type === 'SEWOP') return 'SEWOP';
    if (inv.buyer_type === 'CBW') return 'B2B';
    if (inv.buyer_type === 'SEZ') {
      return inv.export_type === 'WPAY' ? 'SEWP' : 'SEWOP';
    }
    if (inv.buyer_type === 'DEEMED_EXPORT') return 'DE';
    if (inv.buyer_type === 'REGISTERED') return 'B2B';
    if (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER') {
      if (inv.b2c_type === 'B2CL') return 'B2CL';
      if (inv.b2c_type === 'B2CS') return 'B2CS';
      const isInterState = inv.supply_type === 'inter';
      const isLarge = inv.total_amount > 100000;
      return isInterState && isLarge ? 'B2CL' : 'B2CS';
    }
  }

  return 'B2B';
}

/** Sales register thumbnail tiles — maps to doc_type + buyer / B2C presets */
export type SalesEntryKind =
  | 'B2B_REGISTERED'
  | 'B2C'
  | 'B2C_LARGE'
  | 'B2C_SMALL'
  | 'BOS_NIL_MRP'
  | 'RECEIPT_VOUCHER'
  | 'REFUND_VOUCHER'
  | 'RCM_PAYMENT';

export function inferSalesEntryKind(
  inv: Pick<InvoiceV2Draft, 'doc_type' | 'buyer_type' | 'b2c_type'>
): SalesEntryKind | null {
  if (inv.doc_type === 'TAX_INVOICE' && inv.buyer_type === 'REGISTERED') return 'B2B_REGISTERED';
  if (inv.doc_type === 'TAX_INVOICE' && (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER')) {
    if (inv.b2c_type === 'B2CL') return 'B2C_LARGE';
    if (inv.b2c_type === 'B2CS') return 'B2C_SMALL';
    return 'B2C';
  }
  if (inv.doc_type === 'BILL_OF_SUPPLY') return 'BOS_NIL_MRP';
  if (inv.doc_type === 'RECEIPT_VOUCHER') return 'RECEIPT_VOUCHER';
  if (inv.doc_type === 'REFUND_VOUCHER') return 'REFUND_VOUCHER';
  if (inv.doc_type === 'PAYMENT_VOUCHER') return 'RCM_PAYMENT';
  return null;
}

function getInvTyp(inv: InvoiceV2): 'R' | 'DE' | 'SEWP' | 'SEWOP' | 'CBW' {
  if (inv.invoice_type) return inv.invoice_type;
  if (inv.buyer_type === 'SEZ') return inv.export_type === 'WPAY' ? 'SEWP' : 'SEWOP';
  if (inv.buyer_type === 'DEEMED_EXPORT') return 'DE';
  if (inv.buyer_type === 'CBW') return 'CBW';
  return 'R';
}

function toItemNum(rate: number): number {
  return Math.round((rate || 0) * 100) + 1;
}

export function calcLineItem(
  item: Partial<LineItem>,
  isIntraState: boolean,
  docType: DocType
): { cgst: number; sgst: number; igst: number; cess: number; taxableValue: number; lineTotal: number } {
  const qty = item.qty || 0;
  const rate = item.rate || 0;
  const discount = item.discount || 0;
  const taxableValue = qty * rate - discount;
  const gstRate = item.gst_rate || 0;
  const cessRate = item.cess_rate || 0;
  const cessSpecific = item.cess_specific_rate || 0;

  if (docType === 'BILL_OF_SUPPLY' || docType === 'DELIVERY_CHALLAN') {
    return { cgst: 0, sgst: 0, igst: 0, cess: 0, taxableValue, lineTotal: taxableValue };
  }

  const nature = item.supply_nature || 'TAXABLE';
  if (['NIL_RATED', 'EXEMPT', 'NON_GST', 'MRP_INCLUSIVE', 'ZERO_RATED'].includes(nature)) {
    return { cgst: 0, sgst: 0, igst: 0, cess: 0, taxableValue, lineTotal: taxableValue };
  }

  const totalGST = taxableValue * gstRate / 100;
  const cgst = isIntraState ? totalGST / 2 : 0;
  const sgst = isIntraState ? totalGST / 2 : 0;
  const igst = isIntraState ? 0 : totalGST;
  const cess = taxableValue * cessRate / 100 + qty * cessSpecific;
  const lineTotal = taxableValue + cgst + sgst + igst + cess;

  return { cgst, sgst, igst, cess, taxableValue, lineTotal };
}

export function isCessApplicable(hsnCode?: string): boolean {
  if (!hsnCode) return false;
  return Object.keys(CESS_HSN_CODES).some((k) => hsnCode.startsWith(k));
}

export function getCessInfo(hsnCode?: string): { cessRate: number; specificPerTon?: number } | null {
  if (!hsnCode) return null;
  const match = Object.entries(CESS_HSN_CODES).find(([k]) => hsnCode.startsWith(k));
  if (!match) return null;
  return { cessRate: match[1].cessRate, specificPerTon: match[1].specificPerTon };
}

export function amountToWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  let result = 'Rupees ' + (rupees === 0 ? 'Zero' : convert(rupees));
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

export function formatDateDDMMYYYY(isoDate?: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

export function formatDateYYYYMM(isoDate?: string): string {
  if (!isoDate) return '';
  return isoDate.slice(0, 7);
}

export function createEmptyLineItem(slNo: number = 1): LineItem {
  return {
    sl_no: slNo,
    description: '',
    hsn: '',
    is_service: false,
    uqc: 'NOS',
    qty: 1,
    rate: 0,
    discount: 0,
    taxable_value: 0,
    supply_nature: 'TAXABLE',
    gst_rate: 18,
    cess_rate: 0,
    cess_specific_rate: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    line_total: 0,
  };
}

export function createEmptyInvoiceV2Draft(docType: DocType = 'TAX_INVOICE'): InvoiceV2Draft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    doc_type: docType,
    gstr1_table: 'B2B',
    invoice_no: '',
    invoice_date: today,
    period: formatDateYYYYMM(today),
    reverse_charge: false,
    buyer_type: 'CONSUMER',
    b2c_type: undefined,
    buyer_name: '',
    buyer_state: '',
    buyer_state_code: '',
    place_of_supply: '',
    supply_type: 'intra',
    is_intra_state: true,
    currency: 'INR',
    exchange_rate: 1,
    items: [createEmptyLineItem(1)],
    total_taxable: 0,
    total_discount: 0,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    round_off: 0,
    total_amount: 0,
    amount_in_words: '',
    nil_rated_value: 0,
    exempt_value: 0,
    non_gst_value: 0,
    force_igst: false,
    status: 'DRAFT',
    payment_mode: 'CREDIT',
    received_medium: 'BANK_TRANSFER',
    amount_received: 0,
    amount_pending: 0,
  };
}

export function buildDraftForSalesEntryKind(kind: SalesEntryKind): InvoiceV2Draft {
  switch (kind) {
    case 'B2B_REGISTERED':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'REGISTERED',
        b2c_type: undefined,
        buyer_name: '',
        gstr1_table: 'B2B',
      };
    case 'B2C':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'CONSUMER',
        b2c_type: undefined,
        buyer_name: '',
      };
    case 'B2C_LARGE':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'CONSUMER',
        b2c_type: 'B2CL',
        supply_type: 'inter',
        buyer_name: '',
      };
    case 'B2C_SMALL':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'CONSUMER',
        b2c_type: 'B2CS',
        buyer_name: 'B2C Consolidated',
      };
    case 'BOS_NIL_MRP':
      return {
        ...createEmptyInvoiceV2Draft('BILL_OF_SUPPLY'),
        bos_reason: 'EXEMPT',
        buyer_type: 'CONSUMER',
        buyer_name: '',
        gstr1_table: 'NIL',
      };
    case 'RECEIPT_VOUCHER':
      return createEmptyInvoiceV2Draft('RECEIPT_VOUCHER');
    case 'REFUND_VOUCHER':
      return createEmptyInvoiceV2Draft('REFUND_VOUCHER');
    case 'RCM_PAYMENT':
      return {
        ...createEmptyInvoiceV2Draft('PAYMENT_VOUCHER'),
        reverse_charge: true,
        rcm_nature: 'OTHER_RCM',
      };
  }
}

/** Step-1 thumbnails: coarse buckets — subtype is chosen in step 2 */
export type SalesBucketId =
  | 'BUSINESS_REGISTERED'
  | 'B2C'
  | 'BILL_OF_SUPPLY'
  | 'ADVANCES'
  | 'CREDIT_DEBIT'
  | 'EXPORT'
  | 'RCM'
  | 'CHALLAN';

export function inferSalesBucket(
  inv: Pick<InvoiceV2Draft, 'doc_type' | 'buyer_type' | 'b2c_type'>
): SalesBucketId | null {
  if (inv.doc_type === 'DELIVERY_CHALLAN') return 'CHALLAN';
  if (inv.doc_type === 'PAYMENT_VOUCHER') return 'RCM';
  if (inv.doc_type === 'RECEIPT_VOUCHER' || inv.doc_type === 'REFUND_VOUCHER') return 'ADVANCES';
  if (inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE') return 'CREDIT_DEBIT';
  if (inv.doc_type === 'BILL_OF_SUPPLY') return 'BILL_OF_SUPPLY';
  if (inv.doc_type === 'TAX_INVOICE' && inv.buyer_type === 'OVERSEAS') return 'EXPORT';
  if (inv.doc_type === 'TAX_INVOICE' && (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER')) {
    return 'B2C';
  }
  if (
    inv.doc_type === 'TAX_INVOICE' &&
    (inv.buyer_type === 'REGISTERED' ||
      inv.buyer_type === 'SEZ' ||
      inv.buyer_type === 'DEEMED_EXPORT' ||
      inv.buyer_type === 'CBW')
  ) {
    return 'BUSINESS_REGISTERED';
  }
  return null;
}

export function buildDraftForSalesBucket(id: SalesBucketId): InvoiceV2Draft {
  switch (id) {
    case 'BUSINESS_REGISTERED':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'REGISTERED',
        invoice_type: 'R',
        b2c_type: undefined,
        buyer_name: '',
        gstr1_table: 'B2B',
      };
    case 'B2C':
      return buildDraftForSalesEntryKind('B2C');
    case 'BILL_OF_SUPPLY':
      return buildDraftForSalesEntryKind('BOS_NIL_MRP');
    case 'ADVANCES':
      return createEmptyInvoiceV2Draft('RECEIPT_VOUCHER');
    case 'CREDIT_DEBIT':
      return {
        ...createEmptyInvoiceV2Draft('CREDIT_NOTE'),
        buyer_type: 'REGISTERED',
        invoice_type: 'R',
        gstr1_table: 'CDNR',
      };
    case 'EXPORT':
      return {
        ...createEmptyInvoiceV2Draft('TAX_INVOICE'),
        buyer_type: 'OVERSEAS',
        b2c_type: undefined,
        buyer_name: '',
        gstr1_table: 'EXP',
        export_type: 'WOPAY',
      };
    case 'RCM':
      return buildDraftForSalesEntryKind('RCM_PAYMENT');
    case 'CHALLAN':
      return {
        ...createEmptyInvoiceV2Draft('DELIVERY_CHALLAN'),
        challan_purpose: 'JOB_WORK',
      };
  }
}

/** One control for B2B / DE / SEZ / CBW (tax invoice & registered CDN) */
export type SupplyCategory = 'REGULAR_B2B' | 'DEEMED_EXPORT' | 'SEZ_WP' | 'SEZ_WOP' | 'CBW';

export function getSupplyCategory(
  inv: Pick<InvoiceV2Draft, 'buyer_type' | 'invoice_type' | 'export_type'>
): SupplyCategory {
  if (inv.buyer_type === 'CBW') return 'CBW';
  if (inv.buyer_type === 'DEEMED_EXPORT') return 'DEEMED_EXPORT';
  if (inv.buyer_type === 'SEZ') return inv.export_type === 'WPAY' ? 'SEZ_WP' : 'SEZ_WOP';
  if (inv.buyer_type === 'REGISTERED') {
    if (inv.invoice_type === 'DE') return 'DEEMED_EXPORT';
    if (inv.invoice_type === 'SEWP') return 'SEZ_WP';
    if (inv.invoice_type === 'SEWOP') return 'SEZ_WOP';
    if (inv.invoice_type === 'CBW') return 'CBW';
    return 'REGULAR_B2B';
  }
  return 'REGULAR_B2B';
}

export function applySupplyCategory(cat: SupplyCategory): Partial<InvoiceV2Draft> {
  switch (cat) {
    case 'REGULAR_B2B':
      return { buyer_type: 'REGISTERED', invoice_type: 'R', export_type: undefined };
    case 'DEEMED_EXPORT':
      return { buyer_type: 'DEEMED_EXPORT', invoice_type: 'DE' };
    case 'SEZ_WP':
      return { buyer_type: 'SEZ', invoice_type: 'R', export_type: 'WPAY' };
    case 'SEZ_WOP':
      return { buyer_type: 'SEZ', invoice_type: 'R', export_type: 'WOPAY' };
    case 'CBW':
      return { buyer_type: 'CBW', invoice_type: 'CBW' };
  }
}

/** B2B / SEZ / DE / CBW — GSTIN required for GSTR-1 */
export function buyerRequiresGstin(buyerType: BuyerType): boolean {
  return (
    buyerType === 'REGISTERED' ||
    buyerType === 'SEZ' ||
    buyerType === 'DEEMED_EXPORT' ||
    buyerType === 'CBW'
  );
}

export type WizardValidationResult = { ok: true } | { ok: false; error: string };

/** Step 2 — bucket-aware mandatory fields for GSTR-1–aligned sales entry */
export function validateSalesWizardStep2(
  inv: InvoiceV2Draft,
  opts: { sellerStateCode?: string }
): WizardValidationResult {
  const { sellerStateCode } = opts;

  if (!inv.invoice_date?.trim()) {
    return { ok: false, error: 'Invoice / document date is required' };
  }

  if (inv.is_amendment) {
    if (!inv.original_invoice_no?.trim()) {
      return { ok: false, error: 'Original invoice / note number is required for amendment' };
    }
    if (!inv.original_invoice_date) {
      return { ok: false, error: 'Original invoice / note date is required for amendment' };
    }
    const tbl = determineGSTR1Table(inv);
    if (['B2CSA', 'ATA', 'TXPDA'].includes(tbl) && !inv.original_period?.trim()) {
      return { ok: false, error: 'Original return period (MMYYYY) is required for this amendment' };
    }
  }

  const isB2cSmallFlow =
    inv.doc_type === 'TAX_INVOICE' &&
    (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER') &&
    inv.b2c_type === 'B2CS';

  if (!isB2cSmallFlow && !inv.buyer_name.trim()) {
    return { ok: false, error: 'Buyer / party name is required' };
  }

  if (buyerRequiresGstin(inv.buyer_type) && !gstinIsValid(inv.buyer_gstin)) {
    return { ok: false, error: 'Valid buyer GSTIN is required for this supply type' };
  }

  const needsIndianPos =
    inv.doc_type === 'TAX_INVOICE' ||
    inv.doc_type === 'BILL_OF_SUPPLY' ||
    inv.doc_type === 'CREDIT_NOTE' ||
    inv.doc_type === 'DEBIT_NOTE' ||
    inv.doc_type === 'RECEIPT_VOUCHER' ||
    inv.doc_type === 'REFUND_VOUCHER' ||
    inv.doc_type === 'PAYMENT_VOUCHER';

  if (needsIndianPos && inv.buyer_type !== 'OVERSEAS' && !inv.place_of_supply?.trim()) {
    return { ok: false, error: 'Place of supply (state) is required' };
  }

  if (inv.doc_type === 'TAX_INVOICE' && (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER')) {
    if (!inv.b2c_type) {
      return { ok: false, error: 'Choose B2C category: B2CL (invoice-level) or B2CS (consolidated)' };
    }
    if (inv.b2c_type === 'B2CL') {
      if (inv.supply_type !== 'inter') {
        return { ok: false, error: 'B2CL must be inter-state (IGST)' };
      }
      if (sellerStateCode && inv.place_of_supply === sellerStateCode) {
        return { ok: false, error: 'B2CL place of supply must differ from your GST registration state' };
      }
    }
  }

  if (inv.doc_type === 'BILL_OF_SUPPLY' && !inv.bos_reason) {
    return { ok: false, error: 'Reason for bill of supply is required' };
  }

  if (
    (inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE') &&
    (inv.buyer_type === 'UNREGISTERED' || inv.buyer_type === 'CONSUMER')
  ) {
    if (!inv.cdnur_type) {
      return { ok: false, error: 'CDNUR type (B2CL / EXPWP / EXPWOP) is required' };
    }
  }

  if (inv.buyer_type === 'OVERSEAS' && !inv.export_type) {
    return { ok: false, error: 'Export type (with payment / without payment) is required' };
  }

  if (inv.doc_type === 'DELIVERY_CHALLAN' && !inv.challan_purpose) {
    return { ok: false, error: 'Delivery challan purpose is required' };
  }

  return { ok: true };
}

/** Step 3 — line items + HSN + totals */
export function validateSalesWizardStep3(inv: InvoiceV2Draft): WizardValidationResult {
  if (!inv.items?.length) {
    return { ok: false, error: 'Add at least one line item' };
  }

  for (let i = 0; i < inv.items.length; i++) {
    const item = inv.items[i];
    const idx = i + 1;
    if (!item.description?.trim()) {
      return { ok: false, error: `Line ${idx}: Description is required` };
    }
    if (item.qty <= 0) {
      return { ok: false, error: `Line ${idx}: Quantity must be greater than zero` };
    }
    if (item.rate < 0) {
      return { ok: false, error: `Line ${idx}: Rate cannot be negative` };
    }
    const hsn = item.hsn?.trim() || '';
    if (hsn.length < 4) {
      return { ok: false, error: `Line ${idx}: HSN / SAC is required (at least 4 characters)` };
    }
  }

  const isBoS = inv.doc_type === 'BILL_OF_SUPPLY';
  const isChallan = inv.doc_type === 'DELIVERY_CHALLAN';
  const allowZeroOrLowTotal = isBoS || isChallan;

  if (!allowZeroOrLowTotal && inv.total_amount <= 0) {
    return { ok: false, error: 'Total amount must be greater than zero' };
  }

  if (isBoS && inv.total_taxable <= 0) {
    return { ok: false, error: 'Bill of supply needs positive line value(s) in at least one line' };
  }

  if (inv.doc_type === 'TAX_INVOICE' || inv.doc_type === 'CREDIT_NOTE' || inv.doc_type === 'DEBIT_NOTE') {
    for (let i = 0; i < inv.items.length; i++) {
      const item = inv.items[i];
      if (item.supply_nature === 'TAXABLE' && (item.gst_rate == null || item.gst_rate < 0)) {
        return { ok: false, error: `Line ${i + 1}: GST rate is required for taxable supply` };
      }
    }
  }

  return { ok: true };
}

export function recalculateInvoiceTotals(inv: InvoiceV2Draft): InvoiceV2Draft {
  const isIntra = inv.is_intra_state;
  let totalTaxable = 0;
  let totalDiscount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  let nilRatedValue = 0;
  let exemptValue = 0;
  let nonGstValue = 0;

  const updatedItems = inv.items.map((item) => {
    const calc = calcLineItem(item, isIntra, inv.doc_type);
    totalTaxable += calc.taxableValue;
    totalDiscount += item.discount || 0;
    totalCgst += calc.cgst;
    totalSgst += calc.sgst;
    totalIgst += calc.igst;
    totalCess += calc.cess;

    if (item.supply_nature === 'NIL_RATED') nilRatedValue += calc.taxableValue;
    if (item.supply_nature === 'EXEMPT') exemptValue += calc.taxableValue;
    if (item.supply_nature === 'NON_GST') nonGstValue += calc.taxableValue;

    return {
      ...item,
      taxable_value: calc.taxableValue,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      cess: calc.cess,
      line_total: calc.lineTotal,
    };
  });

  const subtotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
  const roundOff = Math.round(subtotal) - subtotal;
  const totalAmount = Math.round(subtotal);

  return {
    ...inv,
    items: updatedItems,
    total_taxable: totalTaxable,
    total_discount: totalDiscount,
    total_cgst: totalCgst,
    total_sgst: totalSgst,
    total_igst: totalIgst,
    total_cess: totalCess,
    round_off: roundOff,
    total_amount: totalAmount,
    amount_in_words: amountToWords(totalAmount),
    nil_rated_value: nilRatedValue,
    exempt_value: exemptValue,
    non_gst_value: nonGstValue,
    gstr1_table: determineGSTR1Table(inv),
  };
}

const STORAGE_KEY_V2 = 'vaarta_gst_invoices_v2';

function loadDbV2(): { invoices: InvoiceV2[] } {
  if (!isBrowser()) return { invoices: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY_V2);
  if (!raw) {
    const empty = { invoices: [] };
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(empty));
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as { invoices?: InvoiceV2[] };
    return { invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [] };
  } catch {
    return { invoices: [] };
  }
}

function saveDbV2(db: { invoices: InvoiceV2[] }) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(db));
}

function nextInvoiceNoV2(companyId: string, docType: DocType, dateIso: string): string {
  const db = loadDbV2();
  const fy = financialYearShort(dateIso);
  const prefixMap: Record<DocType, string> = {
    TAX_INVOICE: 'INV',
    BILL_OF_SUPPLY: 'BOS',
    CREDIT_NOTE: 'CN',
    DEBIT_NOTE: 'DN',
    RECEIPT_VOUCHER: 'RV',
    REFUND_VOUCHER: 'RF',
    PAYMENT_VOUCHER: 'PV',
    DELIVERY_CHALLAN: 'DC',
  };
  const prefix = `${prefixMap[docType]}/${fy}/`;
  const seq = db.invoices
    .filter((x) => x.company_id === companyId && x.invoice_no.startsWith(prefix))
    .map((x) => Number.parseInt(x.invoice_no.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export function listInvoicesV2(companyId: string): InvoiceV2[] {
  return loadDbV2()
    .invoices.filter((x) => x.company_id === companyId)
    .sort((a, b) =>
      a.invoice_date === b.invoice_date
        ? b.created_at.localeCompare(a.created_at)
        : b.invoice_date.localeCompare(a.invoice_date)
    );
}

export function getInvoiceV2(invoiceId: string): InvoiceV2 | null {
  return loadDbV2().invoices.find((x) => x.id === invoiceId) || null;
}

export function createInvoiceV2(companyId: string, draft: InvoiceV2Draft): InvoiceV2 {
  const db = loadDbV2();
  const now = new Date().toISOString();
  const recalc = recalculateInvoiceTotals(draft);
  const invoice: InvoiceV2 = {
    ...recalc,
    id: id(),
    company_id: companyId,
    invoice_no: draft.invoice_no || nextInvoiceNoV2(companyId, draft.doc_type, draft.invoice_date),
    created_at: now,
    updated_at: now,
  };
  db.invoices.push(invoice);
  saveDbV2(db);
  // Fire-and-forget cloud mirror (best-effort; never throws / never awaited).
  try { mirrorUpsert('invoices', invoice); } catch { /* best-effort */ }
  return invoice;
}

export function updateInvoiceV2(invoiceId: string, draft: Partial<InvoiceV2Draft>): InvoiceV2 | null {
  const db = loadDbV2();
  const idx = db.invoices.findIndex((x) => x.id === invoiceId);
  if (idx === -1) return null;
  const existing = db.invoices[idx];
  const merged = { ...existing, ...draft, updated_at: new Date().toISOString() };
  const recalc = recalculateInvoiceTotals(merged);
  db.invoices[idx] = { ...merged, ...recalc };
  saveDbV2(db);
  emitInvoiceDataChanged(existing.company_id);
  // Fire-and-forget cloud mirror (best-effort; never throws / never awaited).
  try { mirrorUpsert('invoices', db.invoices[idx]); } catch { /* best-effort */ }
  return db.invoices[idx];
}

export function deleteInvoiceV2(invoiceId: string) {
  const db = loadDbV2();
  db.invoices = db.invoices.filter((x) => x.id !== invoiceId);
  saveDbV2(db);
  // Fire-and-forget cloud mirror (best-effort; never throws / never awaited).
  try { mirrorDelete('invoices', invoiceId); } catch { /* best-effort */ }
}

export function listInvoicesByGstr1Table(companyId: string, table: Gstr1Table): InvoiceV2[] {
  return listInvoicesV2(companyId).filter((x) => x.gstr1_table === table);
}

export function listInvoicesByPeriod(companyId: string, period: string): InvoiceV2[] {
  return listInvoicesV2(companyId).filter((x) => x.period === period);
}

export interface Gstr1JsonOutput {
  gstin: string;
  fp: string;
  gt: number;
  cur_gt: number;
  b2b?: Array<{
    ctin: string;
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      inv_typ: string;
      etin?: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  b2ba?: Array<{
    ctin: string;
    inv: Array<{
      oinum: string;
      oidt: string;
      inum: string;
      idt: string;
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      inv_typ: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  b2cl?: Array<{
    pos: string;
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      etin?: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  b2cs?: Array<{
    sply_ty: 'INTRA' | 'INTER';
    pos: string;
    typ: 'OE' | 'E';
    diff_percent?: number;
    rt: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  }>;
  b2csa?: Array<{
    sply_ty: 'INTRA' | 'INTER';
    pos: string;
    typ: 'OE' | 'E';
    omon: string;
    itms: Array<{
      rt: number;
      txval: number;
      iamt?: number;
      camt?: number;
      samt?: number;
      csamt: number;
    }>;
  }>;
  exp?: Array<{
    exp_typ: 'WPAY' | 'WOPAY';
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      sbpcode?: string;
      sbnum?: string;
      sbdt?: string;
      itms: Array<{
        txval: number;
        rt: number;
        iamt: number;
        csamt: number;
      }>;
    }>;
  }>;
  expa?: Array<{
    exp_typ: 'WPAY' | 'WOPAY';
    inv: Array<{
      oinum: string;
      oidt: string;
      inum: string;
      idt: string;
      val: number;
      sbpcode?: string;
      sbnum?: string;
      sbdt?: string;
      itms: Array<{
        txval: number;
        rt: number;
        iamt: number;
        csamt: number;
      }>;
    }>;
  }>;
  cdnr?: Array<{
    ctin: string;
    nt: Array<{
      ntty: 'C' | 'D';
      nt_num: string;
      nt_dt: string;
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      inv_typ: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  cdnra?: Array<{
    ctin: string;
    nt: Array<{
      ntty: 'C' | 'D';
      nt_num: string;
      nt_dt: string;
      ont_num: string;
      ont_dt: string;
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      inv_typ: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  cdnur?: Array<{
    typ: string;
    ntty: 'C' | 'D';
    nt_num: string;
    nt_dt: string;
    val: number;
    pos?: string;
    itms: Array<{
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        iamt: number;
        camt: number;
        samt: number;
        csamt: number;
      };
    }>;
  }>;
  cdnura?: Array<{
    typ: string;
    ntty: 'C' | 'D';
    nt_num: string;
    nt_dt: string;
    ont_num: string;
    ont_dt: string;
    val: number;
    pos?: string;
    itms: Array<{
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        iamt: number;
        camt: number;
        samt: number;
        csamt: number;
      };
    }>;
  }>;
  nil?: {
    inv: Array<{
      sply_ty: string;
      nil_amt: number;
      expt_amt: number;
      ngsup_amt: number;
    }>;
  };
  at?: Array<{
    pos: string;
    sply_ty: 'INTRA' | 'INTER';
    itms: Array<{
      rt: number;
      ad_amt: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
  }>;
  ata?: Array<{
    omon: string;
    pos: string;
    sply_ty: 'INTRA' | 'INTER';
    itms: Array<{
      rt: number;
      ad_amt: number;
      iamt?: number;
      camt?: number;
      samt?: number;
      csamt: number;
    }>;
  }>;
  txpd?: Array<{
    pos: string;
    sply_ty: 'INTRA' | 'INTER';
    itms: Array<{
      rt: number;
      ad_amt: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
  }>;
  txpda?: Array<{
    omon: string;
    pos: string;
    sply_ty: 'INTRA' | 'INTER';
    itms: Array<{
      rt: number;
      ad_amt: number;
      iamt?: number;
      camt?: number;
      samt?: number;
      csamt: number;
    }>;
  }>;
  hsn?: {
    hsn_b2b: Array<{
      num: number;
      hsn_sc: string;
      desc: string;
      uqc: string;
      qty: number;
      rt: number;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
    hsn_b2c: Array<{
      num: number;
      hsn_sc: string;
      desc: string;
      uqc: string;
      qty: number;
      rt: number;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
  };
}

export function buildGSTR1JSON(companyId: string, gstin: string, period: string): Gstr1JsonOutput {
  const invoices = listInvoicesByPeriod(companyId, period);
  const [year, month] = period.split('-');
  const fp = month + year;

  const json: Gstr1JsonOutput = {
    gstin,
    fp,
    gt: 0,
    cur_gt: 0,
  };

  /** Portal JSON: all use `b2b[]` with inv_typ R/DE/SEWP/SEWOP/CBW (tables 4A / 6B / 6C / deemed) */
  const b2bJsonTables = new Set<Gstr1Table>(['B2B', 'SEWP', 'SEWOP', 'DE']);
  const b2bInvs = invoices.filter((x) => b2bJsonTables.has(x.gstr1_table));
  if (b2bInvs.length) {
    const grouped: Record<string, { ctin: string; inv: NonNullable<Gstr1JsonOutput['b2b']>[0]['inv'] }> = {};
    b2bInvs.forEach((inv) => {
      const k = inv.buyer_gstin || '';
      if (!grouped[k]) grouped[k] = { ctin: k, inv: [] };
      grouped[k].inv.push({
        inum: inv.invoice_no,
        idt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        pos: inv.place_of_supply,
        rchrg: inv.reverse_charge ? 'Y' : 'N',
        inv_typ: getInvTyp(inv),
        etin: inv.ecom_gstin || undefined,
        itms: inv.items
          .filter((x) => x.supply_nature === 'TAXABLE')
          .map((item) => ({
            num: toItemNum(item.gst_rate),
            itm_det: {
              rt: item.gst_rate,
              txval: item.taxable_value,
              iamt: item.igst,
              camt: item.cgst,
              samt: item.sgst,
              csamt: item.cess || 0,
            },
          })),
      });
      json.gt += inv.total_taxable;
    });
    json.b2b = Object.values(grouped);
  }

  const b2baInvs = invoices.filter((x) => x.gstr1_table === 'B2BA');
  if (b2baInvs.length) {
    const grouped: Record<string, { ctin: string; inv: NonNullable<Gstr1JsonOutput['b2ba']>[0]['inv'] }> = {};
    b2baInvs.forEach((inv) => {
      const k = inv.buyer_gstin || '';
      if (!grouped[k]) grouped[k] = { ctin: k, inv: [] };
      grouped[k].inv.push({
        oinum: inv.original_invoice_no || '',
        oidt: formatDateDDMMYYYY(inv.original_invoice_date),
        inum: inv.invoice_no,
        idt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        pos: inv.place_of_supply,
        rchrg: inv.reverse_charge ? 'Y' : 'N',
        inv_typ: getInvTyp(inv),
        itms: inv.items
          .filter((x) => x.supply_nature === 'TAXABLE')
          .map((item) => ({
            num: toItemNum(item.gst_rate),
            itm_det: {
              rt: item.gst_rate,
              txval: item.taxable_value,
              iamt: item.igst,
              camt: item.cgst,
              samt: item.sgst,
              csamt: item.cess || 0,
            },
          })),
      });
      json.gt += inv.total_taxable;
    });
    json.b2ba = Object.values(grouped);
  }

  const b2clInvs = invoices.filter((x) => x.gstr1_table === 'B2CL');
  if (b2clInvs.length) {
    const grouped: Record<string, { pos: string; inv: NonNullable<Gstr1JsonOutput['b2cl']>[0]['inv'] }> = {};
    b2clInvs.forEach((inv) => {
      const k = inv.place_of_supply;
      if (!grouped[k]) grouped[k] = { pos: k, inv: [] };
      grouped[k].inv.push({
        inum: inv.invoice_no,
        idt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        etin: inv.ecom_gstin || undefined,
        itms: inv.items
          .filter((x) => x.supply_nature === 'TAXABLE')
          .map((item) => ({
            num: toItemNum(item.gst_rate),
            itm_det: {
              rt: item.gst_rate,
              txval: item.taxable_value,
              iamt: item.igst,
              csamt: item.cess || 0,
            },
          })),
      });
      json.gt += inv.total_taxable;
    });
    json.b2cl = Object.values(grouped);
  }

  const b2csInvs = invoices.filter((x) => x.gstr1_table === 'B2CS');
  if (b2csInvs.length) {
    const consolidated: Record<string, NonNullable<Gstr1JsonOutput['b2cs']>[0]> = {};
    b2csInvs.forEach((inv) => {
      inv.items
        .filter((x) => x.supply_nature === 'TAXABLE')
        .forEach((item) => {
          const splyTy = inv.supply_type === 'inter' ? 'INTER' : 'INTRA';
          const k = `${splyTy}_${inv.place_of_supply}_${item.gst_rate}`;
          if (!consolidated[k]) {
            consolidated[k] = {
              sply_ty: splyTy,
              pos: inv.place_of_supply,
              typ: inv.b2cs_typ || 'OE',
              diff_percent: typeof inv.diff_percent === 'number' ? inv.diff_percent : undefined,
              rt: item.gst_rate,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            };
          }
          consolidated[k].txval += item.taxable_value;
          consolidated[k].iamt += item.igst;
          consolidated[k].camt += item.cgst;
          consolidated[k].samt += item.sgst;
          consolidated[k].csamt += item.cess || 0;
        });
      json.gt += inv.total_taxable;
    });
    json.b2cs = Object.values(consolidated);
  }

  const b2csaInvs = invoices.filter((x) => x.gstr1_table === 'B2CSA');
  if (b2csaInvs.length) {
    json.b2csa = b2csaInvs.map((inv) => ({
      sply_ty: inv.supply_type === 'inter' ? 'INTER' : 'INTRA',
      pos: inv.place_of_supply,
      typ: inv.b2cs_typ || 'OE',
      omon: inv.original_period ? inv.original_period.split('-')[1] + inv.original_period.split('-')[0] : fp,
      itms: inv.items
        .filter((x) => x.supply_nature === 'TAXABLE')
        .map((item) => ({
          rt: item.gst_rate,
          txval: item.taxable_value,
          iamt: item.igst || undefined,
          camt: item.cgst || undefined,
          samt: item.sgst || undefined,
          csamt: item.cess || 0,
        })),
    }));
  }

  const expInvs = invoices.filter((x) => x.gstr1_table === 'EXP');
  if (expInvs.length) {
    const grouped: Record<string, { exp_typ: 'WPAY' | 'WOPAY'; inv: NonNullable<Gstr1JsonOutput['exp']>[0]['inv'] }> = {};
    expInvs.forEach((inv) => {
      const k = inv.export_type || 'WOPAY';
      if (!grouped[k]) grouped[k] = { exp_typ: k as 'WPAY' | 'WOPAY', inv: [] };
      grouped[k].inv.push({
        inum: inv.invoice_no,
        idt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        sbpcode: inv.port_code || undefined,
        sbnum: inv.shipping_bill_no || undefined,
        sbdt: inv.shipping_bill_date ? formatDateDDMMYYYY(inv.shipping_bill_date) : undefined,
        itms: inv.items.map((item) => ({
          txval: item.taxable_value,
          rt: item.gst_rate,
          iamt: item.igst,
          csamt: item.cess || 0,
        })),
      });
      json.gt += inv.total_taxable;
    });
    json.exp = Object.values(grouped);
  }

  const expaInvs = invoices.filter((x) => x.gstr1_table === 'EXPA');
  if (expaInvs.length) {
    const grouped: Record<string, { exp_typ: 'WPAY' | 'WOPAY'; inv: NonNullable<Gstr1JsonOutput['expa']>[0]['inv'] }> = {};
    expaInvs.forEach((inv) => {
      const k = inv.export_type || 'WOPAY';
      if (!grouped[k]) grouped[k] = { exp_typ: k as 'WPAY' | 'WOPAY', inv: [] };
      grouped[k].inv.push({
        oinum: inv.original_invoice_no || '',
        oidt: formatDateDDMMYYYY(inv.original_invoice_date),
        inum: inv.invoice_no,
        idt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        sbpcode: inv.port_code || undefined,
        sbnum: inv.shipping_bill_no || undefined,
        sbdt: inv.shipping_bill_date ? formatDateDDMMYYYY(inv.shipping_bill_date) : undefined,
        itms: inv.items.map((item) => ({
          txval: item.taxable_value,
          rt: item.gst_rate,
          iamt: item.igst,
          csamt: item.cess || 0,
        })),
      });
    });
    json.expa = Object.values(grouped);
  }

  const cdnrInvs = invoices.filter((x) => x.gstr1_table === 'CDNR');
  if (cdnrInvs.length) {
    const grouped: Record<string, { ctin: string; nt: NonNullable<Gstr1JsonOutput['cdnr']>[0]['nt'] }> = {};
    cdnrInvs.forEach((inv) => {
      const k = inv.buyer_gstin || '';
      if (!grouped[k]) grouped[k] = { ctin: k, nt: [] };
      grouped[k].nt.push({
        ntty: inv.note_type === 'D' ? 'D' : 'C',
        nt_num: inv.invoice_no,
        nt_dt: formatDateDDMMYYYY(inv.invoice_date),
        val: inv.total_amount,
        pos: inv.place_of_supply,
        rchrg: inv.reverse_charge ? 'Y' : 'N',
        inv_typ: getInvTyp(inv),
        itms: inv.items
          .filter((x) => x.supply_nature === 'TAXABLE')
          .map((item) => ({
            num: toItemNum(item.gst_rate),
            itm_det: {
              rt: item.gst_rate,
              txval: item.taxable_value,
              iamt: item.igst,
              camt: item.cgst,
              samt: item.sgst,
              csamt: item.cess || 0,
            },
          })),
      });
    });
    json.cdnr = Object.values(grouped);
  }

  const cdnraInvs = invoices.filter((x) => x.gstr1_table === 'CDNRA');
  if (cdnraInvs.length) {
    const grouped: Record<string, { ctin: string; nt: NonNullable<Gstr1JsonOutput['cdnra']>[0]['nt'] }> = {};
    cdnraInvs.forEach((inv) => {
      const k = inv.buyer_gstin || '';
      if (!grouped[k]) grouped[k] = { ctin: k, nt: [] };
      grouped[k].nt.push({
        ntty: inv.note_type === 'D' ? 'D' : 'C',
        nt_num: inv.invoice_no,
        nt_dt: formatDateDDMMYYYY(inv.invoice_date),
        ont_num: inv.original_invoice_no || '',
        ont_dt: formatDateDDMMYYYY(inv.original_invoice_date),
        val: inv.total_amount,
        pos: inv.place_of_supply,
        rchrg: inv.reverse_charge ? 'Y' : 'N',
        inv_typ: getInvTyp(inv),
        itms: inv.items
          .filter((x) => x.supply_nature === 'TAXABLE')
          .map((item) => ({
            num: toItemNum(item.gst_rate),
            itm_det: {
              rt: item.gst_rate,
              txval: item.taxable_value,
              iamt: item.igst,
              camt: item.cgst,
              samt: item.sgst,
              csamt: item.cess || 0,
            },
          })),
      });
    });
    json.cdnra = Object.values(grouped);
  }

  const cdnurInvs = invoices.filter((x) => x.gstr1_table === 'CDNUR');
  if (cdnurInvs.length) {
    json.cdnur = cdnurInvs.map((inv) => ({
      typ: inv.cdnur_type || 'B2CL',
      ntty: inv.note_type === 'D' ? 'D' : 'C',
      nt_num: inv.invoice_no,
      nt_dt: formatDateDDMMYYYY(inv.invoice_date),
      val: inv.total_amount,
      pos: inv.cdnur_type === 'EXPWP' || inv.cdnur_type === 'EXPWOP' ? undefined : inv.place_of_supply,
      itms: inv.items
        .filter((x) => x.supply_nature === 'TAXABLE')
        .map((item) => ({
          num: toItemNum(item.gst_rate),
          itm_det: {
            rt: item.gst_rate,
            txval: item.taxable_value,
            iamt: item.igst,
            camt: item.cgst,
            samt: item.sgst,
            csamt: item.cess || 0,
          },
        })),
    }));
  }

  const cdnuraInvs = invoices.filter((x) => x.gstr1_table === 'CDNURA');
  if (cdnuraInvs.length) {
    json.cdnura = cdnuraInvs.map((inv) => ({
      typ: inv.cdnur_type || 'B2CL',
      ntty: inv.note_type === 'D' ? 'D' : 'C',
      nt_num: inv.invoice_no,
      nt_dt: formatDateDDMMYYYY(inv.invoice_date),
      ont_num: inv.original_invoice_no || '',
      ont_dt: formatDateDDMMYYYY(inv.original_invoice_date),
      val: inv.total_amount,
      pos: inv.cdnur_type === 'EXPWP' || inv.cdnur_type === 'EXPWOP' ? undefined : inv.place_of_supply,
      itms: inv.items
        .filter((x) => x.supply_nature === 'TAXABLE')
        .map((item) => ({
          num: toItemNum(item.gst_rate),
          itm_det: {
            rt: item.gst_rate,
            txval: item.taxable_value,
            iamt: item.igst,
            camt: item.cgst,
            samt: item.sgst,
            csamt: item.cess || 0,
          },
        })),
    }));
  }

  const nilInvs = invoices.filter((x) => x.gstr1_table === 'NIL');
  if (nilInvs.length) {
    const nilData: Record<string, { sply_ty: string; nil_amt: number; expt_amt: number; ngsup_amt: number }> = {};
    nilInvs.forEach((inv) => {
      const intra = inv.supply_type === 'intra';
      const b2b = inv.buyer_type === 'REGISTERED';
      const key = `${intra ? 'INTR' : 'INTER'}${b2b ? 'B2B' : 'B2C'}`;
      if (!nilData[key]) nilData[key] = { sply_ty: key, nil_amt: 0, expt_amt: 0, ngsup_amt: 0 };
      nilData[key].nil_amt += inv.nil_rated_value || 0;
      nilData[key].expt_amt += inv.exempt_value || 0;
      nilData[key].ngsup_amt += inv.non_gst_value || 0;
    });
    json.nil = { inv: Object.values(nilData) };
  }

  const atInvs = invoices.filter((x) => x.gstr1_table === 'AT');
  if (atInvs.length) {
    const grouped: Record<string, { pos: string; itms: NonNullable<Gstr1JsonOutput['at']>[0]['itms'] }> = {};
    atInvs.forEach((inv) => {
      inv.items.forEach((item) => {
        const k = `${inv.place_of_supply}_${item.gst_rate}`;
        if (!grouped[inv.place_of_supply]) grouped[inv.place_of_supply] = { pos: inv.place_of_supply, itms: [] };
        grouped[inv.place_of_supply].itms.push({
          rt: item.gst_rate,
          ad_amt: inv.total_amount,
          iamt: item.igst,
          camt: item.cgst,
          samt: item.sgst,
          csamt: item.cess || 0,
        });
      });
    });
    json.at = Object.values(grouped).map((x) => ({
      ...x,
      sply_ty: x.itms.some((t: NonNullable<Gstr1JsonOutput['at']>[0]['itms'][0]) => t.iamt > 0) ? 'INTER' : 'INTRA',
    }));
  }

  const ataInvs = invoices.filter((x) => x.gstr1_table === 'ATA');
  if (ataInvs.length) {
    json.ata = ataInvs.map((inv) => ({
      omon: inv.original_period ? inv.original_period.split('-')[1] + inv.original_period.split('-')[0] : fp,
      pos: inv.place_of_supply,
      sply_ty: inv.supply_type === 'inter' ? 'INTER' : 'INTRA',
      itms: inv.items.map((item) => ({
        rt: item.gst_rate,
        ad_amt: inv.total_amount,
        iamt: item.igst || undefined,
        camt: item.cgst || undefined,
        samt: item.sgst || undefined,
        csamt: item.cess || 0,
      })),
    }));
  }

  const atadjInvs = invoices.filter((x) => x.gstr1_table === 'ATADJ');
  if (atadjInvs.length) {
    json.txpd = atadjInvs.map((inv) => ({
      pos: inv.place_of_supply,
      sply_ty: inv.supply_type === 'inter' ? 'INTER' : 'INTRA',
      itms: inv.items.map((item) => ({
        rt: item.gst_rate,
        ad_amt: inv.total_amount,
        iamt: item.igst,
        camt: item.cgst,
        samt: item.sgst,
        csamt: item.cess || 0,
      })),
    }));
  }

  const txpdaInvs = invoices.filter((x) => x.gstr1_table === 'TXPDA');
  if (txpdaInvs.length) {
    json.txpda = txpdaInvs.map((inv) => ({
      omon: inv.original_period ? inv.original_period.split('-')[1] + inv.original_period.split('-')[0] : fp,
      pos: inv.place_of_supply,
      sply_ty: inv.supply_type === 'inter' ? 'INTER' : 'INTRA',
      itms: inv.items.map((item) => ({
        rt: item.gst_rate,
        ad_amt: inv.total_amount,
        iamt: item.igst || undefined,
        camt: item.cgst || undefined,
        samt: item.sgst || undefined,
        csamt: item.cess || 0,
      })),
    }));
  }

  const hsnB2bMap: Record<string, NonNullable<Gstr1JsonOutput['hsn']>['hsn_b2b'][0]> = {};
  const hsnB2cMap: Record<string, NonNullable<Gstr1JsonOutput['hsn']>['hsn_b2c'][0]> = {};
  invoices.forEach((inv) => {
    if (inv.gstr1_table === 'NONE' || inv.gstr1_table === 'NIL') return;
    inv.items.forEach((item) => {
      if (!item.hsn) return;
      const k = `${item.hsn}_${item.gst_rate}`;
      const isB2c = inv.gstr1_table === 'B2CS' || inv.gstr1_table === 'B2CSA';
      const map = isB2c ? hsnB2cMap : hsnB2bMap;
      if (!map[k]) {
        map[k] = {
          num: Object.keys(map).length + 1,
          hsn_sc: item.hsn,
          desc: item.description,
          uqc: item.uqc || 'OTH',
          qty: 0,
          rt: item.gst_rate,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
      }
      map[k].qty += item.qty || 0;
      map[k].txval += item.taxable_value;
      map[k].iamt += item.igst;
      map[k].camt += item.cgst;
      map[k].samt += item.sgst;
      map[k].csamt += item.cess || 0;
    });
  });
  json.hsn = {
    hsn_b2b: Object.values(hsnB2bMap),
    hsn_b2c: Object.values(hsnB2cMap),
  };

  json.cur_gt = json.gt;
  return json;
}

/**
 * Auto-categorize: derives buyer_type, supply_type, b2c_type, POS,
 * invoice_type, and gstr1_table from the draft fields + seller state code.
 * Pure function — returns partial updates to merge into the draft.
 */
export function autoCategorize(
  draft: InvoiceV2Draft,
  sellerStateCode?: string
): Partial<InvoiceV2Draft> {
  const updates: Partial<InvoiceV2Draft> = {};

  // 1. Derive buyer_type from GSTIN / export flag
  const gstin = draft.buyer_gstin?.trim().toUpperCase();
  const hasValidGstin = gstin ? gstinIsValid(gstin) : false;

  if (draft.export_type && (draft.buyer_type === 'OVERSEAS' || draft.doc_type === 'TAX_INVOICE')) {
    // Export checkbox is on
    if (draft.buyer_type !== 'OVERSEAS') {
      updates.buyer_type = 'OVERSEAS';
      updates.supply_type = 'inter';
      updates.is_intra_state = false;
    }
  } else if (draft.buyer_type === 'SEZ' || draft.buyer_type === 'DEEMED_EXPORT' || draft.buyer_type === 'CBW') {
    // Advanced supply types — keep as-is, set invoice_type
    if (draft.buyer_type === 'SEZ') {
      updates.invoice_type = draft.export_type === 'WPAY' ? 'SEWP' : 'SEWOP';
    } else if (draft.buyer_type === 'DEEMED_EXPORT') {
      updates.invoice_type = 'DE';
    } else if (draft.buyer_type === 'CBW') {
      updates.invoice_type = 'CBW';
      updates.supply_type = 'inter';
      updates.is_intra_state = false;
      updates.reverse_charge = true;
    }
  } else if (hasValidGstin) {
    updates.buyer_type = 'REGISTERED';
    updates.invoice_type = 'R';
    // Extract state from GSTIN
    const stateCode = getStateCodeFromGSTIN(gstin!);
    const stateName = getStateFromGSTIN(gstin!);
    if (stateCode) {
      updates.buyer_state_code = stateCode;
      updates.buyer_state = stateName || '';
      if (!draft.place_of_supply) {
        updates.place_of_supply = stateCode;
      }
    }
  } else if (!gstin || gstin === '') {
    // No GSTIN → consumer (B2C), unless it's a special doc type
    if (draft.doc_type === 'TAX_INVOICE') {
      updates.buyer_type = 'CONSUMER';
      if (!draft.place_of_supply && sellerStateCode) {
        updates.place_of_supply = sellerStateCode;
        updates.buyer_state_code = sellerStateCode;
        updates.buyer_state = STATE_CODES[sellerStateCode] || '';
      }
    }
  }

  // 2. Determine supply_type from POS vs seller state
  const effectiveBuyerType = updates.buyer_type || draft.buyer_type;
  const effectivePOS = updates.place_of_supply || draft.place_of_supply;

  if (effectiveBuyerType === 'OVERSEAS') {
    updates.supply_type = 'inter';
    updates.is_intra_state = false;
    updates.place_of_supply = '96'; // Outside India
  } else if (effectiveBuyerType === 'CBW') {
    updates.supply_type = 'inter';
    updates.is_intra_state = false;
  } else if (sellerStateCode && effectivePOS) {
    const supplyType = determineSupplyType(sellerStateCode, undefined, effectivePOS);
    updates.supply_type = supplyType;
    updates.is_intra_state = supplyType === 'intra';
  }

  // 3. Auto-set b2c_type from amount + supply type (only for B2C tax invoices)
  const effectiveSupplyType = updates.supply_type || draft.supply_type;
  if (
    draft.doc_type === 'TAX_INVOICE' &&
    (effectiveBuyerType === 'CONSUMER' || effectiveBuyerType === 'UNREGISTERED')
  ) {
    const isInterState = effectiveSupplyType === 'inter';
    const totalAmount = draft.total_amount || 0;
    if (isInterState && totalAmount > 100000) {
      updates.b2c_type = 'B2CL';
    } else {
      updates.b2c_type = 'B2CS';
    }
  } else {
    updates.b2c_type = undefined;
  }

  // 4. Bill of Supply → all GST = 0, NIL table
  if (draft.doc_type === 'BILL_OF_SUPPLY') {
    updates.gstr1_table = 'NIL';
    updates.reverse_charge = false;
  }

  // 5. Credit/Debit note handling
  if (draft.doc_type === 'CREDIT_NOTE' || draft.doc_type === 'DEBIT_NOTE') {
    if (hasValidGstin) {
      updates.buyer_type = 'REGISTERED';
    }
    // cdnur_type for unregistered CN/DN
    if (!hasValidGstin && effectiveBuyerType !== 'OVERSEAS') {
      updates.cdnur_type = updates.cdnur_type || draft.cdnur_type || 'B2CL';
    }
  }

  // 6. Determine GSTR-1 table from merged state
  const merged: InvoiceV2Draft = { ...draft, ...updates };
  updates.gstr1_table = determineGSTR1Table(merged);

  return updates;
}

// ─── Return helpers ────────────────────────────────────────────────────────

export interface ReturnItemInput {
  itemIndex: number;
  returnQty: number;
}

/** Build a CREDIT_NOTE (sales return) or DEBIT_NOTE (purchase return) from a V2 invoice. */
export function createReturnFromInvoiceV2(
  original: InvoiceV2,
  returnItems: ReturnItemInput[],
  returnDate: string,
  reason: CdnReason,
  returnType: 'SALES' | 'PURCHASE'
): InvoiceV2Draft {
  const docType: DocType = returnType === 'SALES' ? 'CREDIT_NOTE' : 'DEBIT_NOTE';
  const noteType: 'C' | 'D' = returnType === 'SALES' ? 'C' : 'D';

  const items: LineItem[] = returnItems
    .filter((ri) => ri.returnQty > 0 && ri.itemIndex < original.items.length)
    .map((ri, idx) => {
      const orig = original.items[ri.itemIndex];
      const cappedQty = Math.min(ri.returnQty, orig.qty);
      const proportion = orig.qty > 0 ? cappedQty / orig.qty : 0;
      return {
        ...orig,
        sl_no: idx + 1,
        qty: cappedQty,
        discount: Math.round(orig.discount * proportion * 100) / 100,
        taxable_value: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        line_total: 0,
      };
    });

  return {
    ...createEmptyInvoiceV2Draft(docType),
    doc_type: docType,
    note_type: noteType,
    cdn_reason: reason,
    original_invoice_no: original.invoice_no,
    original_invoice_date: original.invoice_date,
    buyer_type: original.buyer_type,
    buyer_gstin: original.buyer_gstin,
    buyer_name: original.buyer_name,
    buyer_address: original.buyer_address,
    buyer_state: original.buyer_state,
    buyer_state_code: original.buyer_state_code,
    buyer_pincode: original.buyer_pincode,
    place_of_supply: original.place_of_supply,
    supply_type: original.supply_type,
    is_intra_state: original.is_intra_state,
    force_igst: original.force_igst || false,
    payment_mode: original.payment_mode,
    invoice_date: returnDate,
    period: formatDateYYYYMM(returnDate),
    items,
    status: 'SAVED',
  };
}

/** Build a DEBIT_NOTE from a legacy V1 purchase invoice. */
export function createReturnFromPurchaseInvoiceLegacy(
  original: PurchaseInvoice,
  returnTaxableAmount: number,
  returnDate: string,
  reason: CdnReason
): InvoiceV2Draft {
  const stateCode = original.vendor_gstin
    ? (getStateCodeFromGSTIN(original.vendor_gstin) || '')
    : '';
  const buyerType: BuyerType = original.vendor_gstin ? 'REGISTERED' : 'UNREGISTERED';
  const isIntra = original.supply_type === 'intra';

  const item: LineItem = {
    sl_no: 1,
    description: original.item_description || 'Purchase Return',
    hsn: original.item_hsn || '',
    is_service: false,
    uqc: 'OTH',
    qty: 1,
    rate: returnTaxableAmount,
    discount: 0,
    taxable_value: returnTaxableAmount,
    supply_nature: 'TAXABLE',
    gst_rate: original.gst_rate,
    cess_rate: 0,
    cess_specific_rate: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    line_total: 0,
  };

  return {
    ...createEmptyInvoiceV2Draft('DEBIT_NOTE'),
    doc_type: 'DEBIT_NOTE',
    note_type: 'D',
    cdn_reason: reason,
    original_invoice_no: original.invoice_no,
    original_invoice_date: original.invoice_date,
    buyer_type: buyerType,
    buyer_gstin: original.vendor_gstin,
    buyer_name: original.vendor_name,
    buyer_state: original.place_of_supply_state,
    buyer_state_code: stateCode,
    place_of_supply: stateCode,
    supply_type: original.supply_type,
    is_intra_state: isIntra,
    payment_mode: original.payment_mode,
    invoice_date: returnDate,
    period: formatDateYYYYMM(returnDate),
    items: [item],
    status: 'SAVED',
  };
}

export function downloadGSTR1JSON(companyId: string, gstin: string, period: string): void {
  const json = buildGSTR1JSON(companyId, gstin, period);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GSTR1_${gstin}_${json.fp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

