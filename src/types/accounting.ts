export interface AccountBalance {
  account_name: string;
  account_group: string;
  nature: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  balance_type: 'Dr' | 'Cr';
}

export interface LedgerRow {
  date: string;
  entry_code: string;
  particulars: string;
  voucher_type: string;
  debit: number;
  credit: number;
  running_balance: number;
  balance_type: 'Dr' | 'Cr';
}

export interface TrialBalanceRow {
  sno: number;
  account_name: string;
  account_group: string;
  debit_balance: number | null;
  credit_balance: number | null;
}

export interface TradingAccountData {
  debitItems: { name: string; amount: number }[];
  creditItems: { name: string; amount: number }[];
  grossProfit: number;
  debitTotal: number;
  creditTotal: number;
  openingStockTotal: number;
  closingStockTotal: number;
}

export interface ProfitLossData {
  debitItems: { name: string; amount: number }[];
  creditItems: { name: string; amount: number }[];
  netProfit: number;
  debitTotal: number;
  creditTotal: number;
}

export interface BalanceSheetData {
  liabilities: { name: string; amount: number; indent?: number; isBold?: boolean }[];
  assets: { name: string; amount: number; indent?: number; isBold?: boolean }[];
  totalLiabilities: number;
  totalAssets: number;
  balances: boolean;
}

export interface CashBookRow {
  date: string;
  particulars: string;
  voucherNo: string;
  lf: string;
  cashAmount: number;
  bankAmount?: number;
  discountAllowed?: number;
  discountReceived?: number;
  isContra?: boolean;
}

export interface AgeingBucket {
  current: number;
  days_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_180: number;
  days_over_180: number;
  total: number;
}

export interface ScheduleIIIItem {
  label: string;
  noteNo?: string;
  currentYear: number | null;
  previousYear: number | null;
  isBold?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface ScheduleIIISection {
  heading: string;
  indent: number;
  items: ScheduleIIIItem[];
}
