import { computeTrialBalance } from '@/lib/accounting/trialBalance';
import { MASTER_COA, type MasterAccount } from '@/lib/masterCOA';

export interface BalanceSheetSection {
  name: string;
  accounts: {
    account_name: string;
    balance: number;
    balance_type: 'Dr' | 'Cr';
  }[];
  total: number;
}

export interface BalanceSheetResult {
  equity: BalanceSheetSection;
  nonCurrentLiabilities: BalanceSheetSection;
  currentLiabilities: BalanceSheetSection;
  nonCurrentAssets: BalanceSheetSection;
  currentAssets: BalanceSheetSection;
  totalAssets: number;
  totalEquityAndLiabilities: number;
  balanced: boolean;
}

function groupForAccount(account: MasterAccount): 'equity' | 'nonCurrentLiabilities' | 'currentLiabilities' | 'nonCurrentAssets' | 'currentAssets' {
  if (account.subGroup === 'Share Capital' || account.subGroup === 'Reserves & Surplus') {
    return 'equity';
  }
  if (account.primaryGroup === 'Capital & Liabilities') {
    if (
      account.subGroup === 'Long-term Borrowings' ||
      account.subGroup === 'Deferred Tax Liability' ||
      account.subGroup === 'Other Long-term Liabilities' ||
      account.subGroup === 'Long-term Provisions'
    ) {
      return 'nonCurrentLiabilities';
    }
    return 'currentLiabilities';
  }
  if (account.primaryGroup === 'Assets') {
    if (
      account.subGroup === 'Tangible Fixed Assets' ||
      account.subGroup === 'Accumulated Depreciation' ||
      account.subGroup === 'Capital Work in Progress' ||
      account.subGroup === 'Intangible Assets' ||
      account.subGroup === 'Accumulated Amortisation' ||
      account.subGroup === 'Non-current Investments' ||
      account.subGroup === 'Long-term Loans & Advances' ||
      account.subGroup === 'Other Non-current Assets'
    ) {
      return 'nonCurrentAssets';
    }
    return 'currentAssets';
  }
  return 'currentAssets';
}

export function computeBalanceSheet(companyId: string, asOfDate: string): BalanceSheetResult {
  const tb = computeTrialBalance(companyId, undefined, asOfDate);

  const sectionMap: Record<keyof Omit<BalanceSheetResult, 'totalAssets' | 'totalEquityAndLiabilities' | 'balanced'>, BalanceSheetSection> =
    {
      equity: { name: 'Equity', accounts: [], total: 0 },
      nonCurrentLiabilities: { name: 'Non-current Liabilities', accounts: [], total: 0 },
      currentLiabilities: { name: 'Current Liabilities', accounts: [], total: 0 },
      nonCurrentAssets: { name: 'Non-current Assets', accounts: [], total: 0 },
      currentAssets: { name: 'Current Assets', accounts: [], total: 0 },
    };

  const coaByName = new Map<string, MasterAccount>();
  for (const acc of MASTER_COA) {
    coaByName.set(acc.name, acc);
  }

  for (const row of tb.rows) {
    const coa = coaByName.get(row.account_name);
    if (!coa) continue;
    const groupKey = groupForAccount(coa);
    const section = sectionMap[groupKey];
    section.accounts.push({
      account_name: row.account_name,
      balance: row.balance,
      balance_type: row.balance_type,
    });
    const signed = row.balance_type === 'Dr' ? row.balance : -row.balance;
    section.total += signed;
  }

  const totalAssets = sectionMap.nonCurrentAssets.total + sectionMap.currentAssets.total;
  const totalEquityAndLiabilities =
    sectionMap.equity.total + sectionMap.nonCurrentLiabilities.total + sectionMap.currentLiabilities.total;

  const TOLERANCE = 0.005;
  const balanced = Math.abs(totalAssets - totalEquityAndLiabilities) <= TOLERANCE;

  return {
    equity: sectionMap.equity,
    nonCurrentLiabilities: sectionMap.nonCurrentLiabilities,
    currentLiabilities: sectionMap.currentLiabilities,
    nonCurrentAssets: sectionMap.nonCurrentAssets,
    currentAssets: sectionMap.currentAssets,
    totalAssets,
    totalEquityAndLiabilities,
    balanced,
  };
}

