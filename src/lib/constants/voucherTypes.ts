export const VOUCHER_TYPES = {
  PMT: { code: 'PMT', label: 'Payment', description: 'Payment made' },
  RCT: { code: 'RCT', label: 'Receipt', description: 'Payment received' },
  CNT: { code: 'CNT', label: 'Contra', description: 'Cash-Bank transfer' },
  JRN: { code: 'JRN', label: 'Journal', description: 'General journal entry' },
  SLS: { code: 'SLS', label: 'Sales', description: 'Sales invoice' },
  PUR: { code: 'PUR', label: 'Purchase', description: 'Purchase voucher' },
  DN: { code: 'DN', label: 'Debit Note', description: 'Purchase returns' },
  CN: { code: 'CN', label: 'Credit Note', description: 'Sales returns' },
  PAY: { code: 'PAY', label: 'Payroll', description: 'Salary/wages' },
} as const;

export type VoucherTypeCode = keyof typeof VOUCHER_TYPES;
export const VOUCHER_TYPE_LIST = Object.values(VOUCHER_TYPES);
