export type PaymentMode = 'UPI' | 'NEFT' | 'IMPS' | 'RTGS' | 'ATM' | 'POS' | 'CHQ' | 'CASH' | 'OTHER';

export interface BankTransaction {
  id: string;
  company_id: string;
  import_batch: string;
  date: string;                   // YYYY-MM-DD
  narration_raw: string;          // Original bank narration
  narration_clean: string;        // Editable narration for JE
  payee: string;                  // Extracted payee name
  payment_mode: PaymentMode;
  debit: number;                  // Withdrawal (payment)
  credit: number;                 // Deposit (receipt)
  balance: number;                // Running balance (if available)
  ref_no: string;                 // UTR/Ref from narration
  journalized_id: string | null;  // JE id once transferred
  journalized_at: string | null;  // ISO timestamp
}

export interface PayeeGroup {
  payee: string;
  transactions: BankTransaction[];
  totalDebit: number;
  totalCredit: number;
  count: number;
}

export interface ImportBatch {
  id: string;
  company_id: string;
  bank_account: string;           // Account name (e.g., "HDFC Bank A/c")
  file_name: string;
  imported_at: string;
  row_count: number;
}
