type Classification = {
  subGroup: string;
  nature: string;
};

const KEYWORD_RULES: Array<{ keyword: string; subGroup: string; nature: string }> = [
  { keyword: 'debtor', subGroup: 'Trade Receivables', nature: 'asset' },
  { keyword: 'creditor', subGroup: 'Trade Payables', nature: 'liability' },
  { keyword: 'gst', subGroup: 'Duties & Taxes', nature: 'liability' },
  { keyword: 'tds', subGroup: 'Duties & Taxes', nature: 'liability' },
  { keyword: 'tcs', subGroup: 'Duties & Taxes', nature: 'liability' },
  { keyword: 'cash', subGroup: 'Cash & Bank Balances', nature: 'asset' },
  { keyword: 'bank', subGroup: 'Cash & Bank Balances', nature: 'asset' },
  { keyword: 'salary', subGroup: 'Employee Benefits Expense', nature: 'expense' },
  { keyword: 'rent', subGroup: 'Rent', nature: 'expense' },
];

export function keywordClassify(name: string): Classification | null {
  const lower = name.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (lower.includes(rule.keyword)) {
      return { subGroup: rule.subGroup, nature: rule.nature };
    }
  }
  return null;
}

