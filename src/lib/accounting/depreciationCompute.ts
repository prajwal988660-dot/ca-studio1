import type { JournalEntry } from './computeEngine';
import { computeAllBalances } from './computeEngine';

export interface DepreciationRow {
  assetName: string;
  openingValue: number;
  additions: number;
  disposals: number;
  grossValue: number;
  rate: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  wdv: number;
  method: 'SLM' | 'WDV';
}

const FIXED_ASSET_SUBGROUPS = ['Tangible Fixed Assets', 'Intangible Assets'];
const ACCUM_DEP_SUBGROUPS = ['Accumulated Depreciation', 'Accumulated Amortisation'];

/** Companies Act 2013 Schedule II SLM rates (residual 5%). */
const SCHEDULE_II_SLM: Record<string, number> = {
  'Building': 3.17, 'Plant & Machinery': 6.33, 'Furniture & Fixtures': 6.33,
  'Motor Vehicles': 9.5, 'Vehicles': 9.5, 'Computers': 16.21, 'Software': 16.21, 'Intangible Assets': 10,
};
const SCHEDULE_II_WDV: Record<string, number> = {
  'Building': 10, 'Plant & Machinery': 15, 'Furniture & Fixtures': 10,
  'Motor Vehicles': 15, 'Vehicles': 15, 'Computers': 40, 'Software': 40, 'Intangible Assets': 25,
};
export const IT_ACT_WDV_RATES: Record<string, number> = {
  'Building': 10, 'Plant & Machinery': 15, 'Furniture': 10, 'Vehicles': 15, 'Computers': 40, 'Software': 60,
};
const RESIDUAL_VALUE_FRACTION = 0.05;
const HALF_YEAR_DAYS = 180;

export function computeDepreciation(
  entries: JournalEntry[],
  method: 'SLM' | 'WDV',
  rates: Record<string, number> = {},
  options?: { residualValueFraction?: number; daysUsedInYear?: number; useItActRates?: boolean }
): DepreciationRow[] {
  const balances = computeAllBalances(entries);
  const rows: DepreciationRow[] = [];
  const residualFraction = options?.residualValueFraction ?? RESIDUAL_VALUE_FRACTION;
  const daysUsed = options?.daysUsedInYear;
  const halfYearRule = daysUsed != null && daysUsed < HALF_YEAR_DAYS;

  const defaultRates = method === 'SLM' ? { ...SCHEDULE_II_SLM } : (options?.useItActRates ? { ...IT_ACT_WDV_RATES } : { ...SCHEDULE_II_WDV });

  const assetAccounts = balances.filter(b => FIXED_ASSET_SUBGROUPS.includes(b.account_group));

  for (const asset of assetAccounts) {
    let matchedRate = rates[asset.account_name];
    if (!matchedRate) {
      const lower = asset.account_name.toLowerCase();
      for (const [key, val] of Object.entries(defaultRates)) {
        if (lower.includes(key.toLowerCase())) { matchedRate = val; break; }
      }
    }
    const rate = matchedRate ?? (method === 'SLM' ? 10 : 15);

    const grossValue = asset.total_debit;
    const disposals = asset.total_credit;
    const netValue = grossValue - disposals;
    const depreciableBase = method === 'SLM' ? netValue * (1 - residualFraction) : netValue;
    let depAmount = method === 'SLM'
      ? (depreciableBase * rate) / 100
      : (netValue * rate) / 100;
    if (halfYearRule) depAmount = depAmount / 2;

    const accDepAccount = balances.find(b =>
      ACCUM_DEP_SUBGROUPS.includes(b.account_group) &&
      b.account_name.toLowerCase().includes(asset.account_name.toLowerCase().split(' ')[0].replace(/[—–-]/g, '').toLowerCase())
    );
    const accDep = accDepAccount ? accDepAccount.balance : 0;

    rows.push({
      assetName: asset.account_name,
      openingValue: netValue,
      additions: 0, disposals, grossValue: netValue, rate,
      depreciationAmount: Math.round(depAmount * 100) / 100,
      accumulatedDepreciation: accDep + depAmount,
      wdv: netValue - accDep - depAmount,
      method,
    });
  }

  return rows;
}
