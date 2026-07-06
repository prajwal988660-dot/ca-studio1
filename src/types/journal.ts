export interface InventorySubLine {
  inventory_name: string;
  hsn_sac: string;          // HSN code for goods, SAC code for services
  unit: string;
  qty: number;
  rate: number;
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
}

export interface JournalLine {
  account_name: string;
  account_group: string;
  nature: 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';
  debit: number;
  credit: number;
  inventory_sub_lines?: InventorySubLine[];
  // TDS fields (on payment/purchase lines)
  tds_section?: string;     // e.g. '194C', '194J', '192'
  tds_rate?: number;        // e.g. 2, 10, 30
  // TCS fields (on receipt/sales lines)
  tcs_section?: string;     // e.g. '206C(1)', '206C(1H)'
  tcs_rate?: number;        // e.g. 0.1, 1
}

export type VoucherType = 'PMT' | 'RCT' | 'CNT' | 'JRN' | 'SLS' | 'PUR' | 'DN' | 'CN' | 'PAY';

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_code: string;
  entry_date: string;
  voucher_type: VoucherType;
  voucher_number: string | null;
  lines: JournalLine[];
  narration: string;
  book_period: string;
  is_opening: boolean;
  is_closing: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewJournalEntry {
  company_id: string;
  entry_code: string;
  entry_date: string;
  voucher_type: VoucherType;
  voucher_number?: string;
  lines: JournalLine[];
  narration: string;
  book_period: string;
  is_opening?: boolean;
  is_closing?: boolean;
}
