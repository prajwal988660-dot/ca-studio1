import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';

export interface FundsFlowData {
  sources: { label: string; amount: number }[];
  applications: { label: string; amount: number }[];
  totalSources: number;
  totalApplications: number;
  workingCapitalChanges: {
    item: string;
    currentYear: number;
    previousYear: number;
    increase: number;
    decrease: number;
  }[];
  netWorkingCapitalChange: number;
}

function groupBal(bals: AccountBalance[], groups: string[]): number {
  return bals.filter(b => groups.includes(b.account_group)).reduce((s, b) => s + b.balance, 0);
}

export function computeFundsFlow(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
  netProfit: number
): FundsFlowData {
  const currentBal = computeAllBalances(currentEntries);
  const prevBal = computeAllBalances(previousEntries);

  const g = (groups: string[]) => groupBal(currentBal, groups);
  const gp = (groups: string[]) => groupBal(prevBal, groups);

  const sources: { label: string; amount: number }[] = [];
  const applications: { label: string; amount: number }[] = [];

  if (netProfit > 0) {
    sources.push({ label: 'Net Profit from Operations', amount: netProfit });
  } else {
    applications.push({ label: 'Net Loss from Operations', amount: Math.abs(netProfit) });
  }

  const depreciation = g(['Depreciation & Amortisation']);
  if (depreciation > 0) sources.push({ label: 'Add: Depreciation & Amortisation', amount: depreciation });

  const ltBorrowChange = g(['Long-term Borrowings']) - gp(['Long-term Borrowings']);
  if (ltBorrowChange > 0) sources.push({ label: 'Long-term Borrowings Raised', amount: ltBorrowChange });
  else if (ltBorrowChange < 0) applications.push({ label: 'Long-term Borrowings Repaid', amount: -ltBorrowChange });

  const capitalChange = g(['Share Capital', 'Reserves & Surplus']) - gp(['Share Capital', 'Reserves & Surplus']);
  if (capitalChange > 0) sources.push({ label: 'Capital Introduced / Shares Issued', amount: capitalChange });
  else if (capitalChange < 0) applications.push({ label: 'Capital Withdrawn / Dividends', amount: -capitalChange });

  const faGroups = ['Tangible Fixed Assets', 'Intangible Assets', 'Capital Work in Progress'];
  const faChange = g(faGroups) - gp(faGroups) + depreciation;
  if (faChange > 0) applications.push({ label: 'Purchase of Fixed Assets', amount: faChange });
  else if (faChange < 0) sources.push({ label: 'Sale of Fixed Assets', amount: -faChange });

  const invGroups = ['Non-current Investments', 'Current Investments'];
  const invChange = g(invGroups) - gp(invGroups);
  if (invChange > 0) applications.push({ label: 'Purchase of Investments', amount: invChange });
  else if (invChange < 0) sources.push({ label: 'Sale of Investments', amount: -invChange });

  const totalSources = sources.reduce((s, i) => s + i.amount, 0);
  const totalApplications = applications.reduce((s, i) => s + i.amount, 0);

  // Working Capital changes
  const currentAssetGroups = [
    'Trade Receivables', 'Inventories',
    'Short-term Loans & Advances', 'Other Current Assets',
    'GST — Input Tax Credit',
  ];
  const currentLiabGroups = [
    'Trade Payables', 'Other Current Liabilities',
    'Statutory Liabilities', 'Short-term Provisions', 'Short-term Borrowings',
  ];

  const workingCapitalChanges: FundsFlowData['workingCapitalChanges'] = [];

  for (const group of [...currentAssetGroups, ...currentLiabGroups]) {
    const curr = groupBal(currentBal, [group]);
    const prev = groupBal(prevBal, [group]);
    const diff = curr - prev;
    if (Math.abs(diff) < 0.01) continue;

    const isCA = currentAssetGroups.includes(group);
    workingCapitalChanges.push({
      item: group,
      currentYear: curr,
      previousYear: prev,
      increase: isCA ? (diff > 0 ? diff : 0) : (diff < 0 ? -diff : 0),
      decrease: isCA ? (diff < 0 ? -diff : 0) : (diff > 0 ? diff : 0),
    });
  }

  return {
    sources, applications, totalSources, totalApplications,
    workingCapitalChanges,
    netWorkingCapitalChange: totalSources - totalApplications,
  };
}
