import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';

export interface BalanceSheetItem {
  name: string;
  amount: number;
  group: string;
}

export interface BalanceSheetData {
  liabilities: BalanceSheetItem[];
  assets: BalanceSheetItem[];
  totalLiabilities: number;
  totalAssets: number;
  balanced: boolean;
}

const LIABILITY_SUBGROUPS = [
  'Share Capital', 'Reserves & Surplus', 'Money received against share warrants',
  'Long-term Borrowings', 'Deferred Tax Liability', 'Other Long-term Liabilities', 'Long-term Provisions',
  'Short-term Borrowings', 'Trade Payables', 'Other Current Liabilities',
  'Statutory Liabilities', 'Short-term Provisions',
  'GST — Output Tax', 'GST — RCM', 'GST — Advances',
];

const ASSET_SUBGROUPS = [
  'Deferred Tax Asset', 'Tangible Fixed Assets', 'Accumulated Depreciation',
  'Capital Work in Progress', 'Intangible Assets', 'Accumulated Amortisation',
  'Non-current Investments', 'Long-term Loans & Advances', 'Other Non-current Assets',
  'Current Investments', 'Inventories', 'Trade Receivables',
  'Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents',
  'Short-term Loans & Advances', 'Other Current Assets',
  'GST — Input Tax Credit', 'GST — Refund', 'GST — Reconciliation', 'GST — Legacy',
  'Suspense & Clearing',
];

export function computeBalanceSheet(
  entries: JournalEntry[],
  netProfit: number,
  _format: 'traditional' | 'schedule_iii'
): BalanceSheetData {
  const balances = computeAllBalances(entries);

  const liabilities: BalanceSheetItem[] = [];
  const assets: BalanceSheetItem[] = [];

  for (const b of balances) {
    if (['revenue', 'expense'].includes(b.nature)) continue;

    if (b.nature === 'liability' || b.nature === 'capital' || LIABILITY_SUBGROUPS.includes(b.account_group)) {
      liabilities.push({ name: b.account_name, amount: b.balance, group: b.account_group });
    } else if (b.nature === 'asset' || ASSET_SUBGROUPS.includes(b.account_group)) {
      assets.push({ name: b.account_name, amount: b.balance, group: b.account_group });
    }
  }

  if (netProfit !== 0) {
    liabilities.push({
      name: netProfit > 0 ? 'Net Profit for the Year' : 'Net Loss for the Year',
      amount: netProfit,
      group: 'Reserves & Surplus',
    });
  }

  const totalLiabilities = liabilities.reduce((sum, i) => sum + i.amount, 0);
  const totalAssets = assets.reduce((sum, i) => sum + i.amount, 0);

  return {
    liabilities, assets, totalLiabilities, totalAssets,
    balanced: Math.abs(totalLiabilities - totalAssets) < 0.01,
  };
}

// ── Schedule III Balance Sheet ──────────────────────────────────────

export interface ScheduleIIISection {
  heading: string;
  subheadings: {
    label: string;
    noteRef?: string;
    currentYear: number;
    previousYear: number;
  }[];
  total: number;
}

function sumGroup(balances: AccountBalance[], groups: string | string[]): number {
  const list = typeof groups === 'string' ? [groups] : groups;
  return balances
    .filter(b => list.includes(b.account_group))
    .reduce((s, b) => {
      const sign = b.balance_type === 'Cr' ? 1 : -1;
      return s + (b.nature === 'asset' ? b.balance : sign * b.balance);
    }, 0);
}

/** Sum balances by group with correct sign: Dr positive for assets, Cr positive for liability/capital (per Schedule III). */
function sumGroupAsset(balances: AccountBalance[], groups: string | string[]): number {
  const list = typeof groups === 'string' ? [groups] : groups;
  return balances
    .filter(b => list.includes(b.account_group))
    .reduce((s, b) => {
      const sign = b.nature === 'asset'
        ? (b.balance_type === 'Dr' ? 1 : -1)
        : (b.balance_type === 'Cr' ? 1 : -1);
      return s + sign * b.balance;
    }, 0);
}

export function computeScheduleIIIBalanceSheet(
  entries: JournalEntry[],
  netProfit: number,
  previousYearEntries?: JournalEntry[]
): {
  equityAndLiabilities: ScheduleIIISection[];
  assets: ScheduleIIISection[];
  totalEquityLiabilities: number;
  totalAssets: number;
} {
  const bal = computeAllBalances(entries);
  const prev = previousYearEntries ? computeAllBalances(previousYearEntries) : [];

  const g = (groups: string | string[]) => sumGroupAsset(bal, groups);
  const gp = (groups: string | string[]) => sumGroupAsset(prev, groups);

  const shareCapital = g('Share Capital');
  const reserves = g('Reserves & Surplus') + netProfit;
  const moneyAgainstWarrants = g('Money received against share warrants');

  const ltBorrowings = g('Long-term Borrowings');
  const deferredTaxL = g('Deferred Tax Liability');
  const otherLTL = g('Other Long-term Liabilities');
  const ltProvisions = g('Long-term Provisions');

  const stBorrowings = g('Short-term Borrowings');
  const tradePayables = g('Trade Payables');
  const otherCL = g(['Other Current Liabilities', 'Statutory Liabilities', 'GST — Output Tax', 'GST — RCM', 'GST — Advances']);
  const stProvisions = g('Short-term Provisions');

  // Accumulated Depreciation/Amortisation are contra-assets (Cr balance).
  // sumGroupAsset returns NEGATIVE for asset-nature accounts with Cr balance,
  // so we ADD (not subtract) to get the correct net book value.
  const tangibleFA = g('Tangible Fixed Assets') + g('Accumulated Depreciation');
  const intangibleFA = g('Intangible Assets') + g('Accumulated Amortisation');
  const cwip = g('Capital Work in Progress');
  const deferredTaxA = g('Deferred Tax Asset');
  const ncInvestments = g('Non-current Investments');
  const ltLoans = g('Long-term Loans & Advances');
  const otherNCA = g('Other Non-current Assets');

  const inventories = g('Inventories');
  const tradeReceivables = g('Trade Receivables');
  const cashEquiv = g(['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents']);
  const stLoans = g('Short-term Loans & Advances');
  const otherCA = g(['Other Current Assets', 'GST — Input Tax Credit', 'GST — Refund', 'GST — Reconciliation', 'GST — Legacy']);
  const cInvestments = g('Current Investments');

  const equityAndLiabilities: ScheduleIIISection[] = [
    {
      heading: "Shareholders' Funds",
      subheadings: [
        { label: 'Share Capital', noteRef: '1', currentYear: shareCapital, previousYear: gp('Share Capital') },
        { label: 'Reserves and Surplus', noteRef: '2', currentYear: reserves, previousYear: gp('Reserves & Surplus') },
        { label: 'Money received against share warrants', noteRef: '2a', currentYear: moneyAgainstWarrants, previousYear: gp('Money received against share warrants') },
      ],
      total: shareCapital + reserves + moneyAgainstWarrants,
    },
    {
      heading: 'Non-Current Liabilities',
      subheadings: [
        { label: 'Long-term Borrowings', noteRef: '3', currentYear: ltBorrowings, previousYear: gp('Long-term Borrowings') },
        { label: 'Deferred Tax Liabilities (Net)', noteRef: '3a', currentYear: deferredTaxL, previousYear: gp('Deferred Tax Liability') },
        { label: 'Other Long-term Liabilities', noteRef: '3b', currentYear: otherLTL, previousYear: gp('Other Long-term Liabilities') },
        { label: 'Long-term Provisions', noteRef: '4', currentYear: ltProvisions, previousYear: gp('Long-term Provisions') },
      ],
      total: ltBorrowings + deferredTaxL + otherLTL + ltProvisions,
    },
    {
      heading: 'Current Liabilities',
      subheadings: [
        { label: 'Short-term Borrowings', noteRef: '5', currentYear: stBorrowings, previousYear: gp('Short-term Borrowings') },
        { label: 'Trade Payables', noteRef: '6', currentYear: tradePayables, previousYear: gp('Trade Payables') },
        { label: 'Other Current Liabilities', noteRef: '7', currentYear: otherCL, previousYear: gp(['Other Current Liabilities', 'Statutory Liabilities', 'GST — Output Tax', 'GST — RCM', 'GST — Advances']) },
        { label: 'Short-term Provisions', noteRef: '8', currentYear: stProvisions, previousYear: gp('Short-term Provisions') },
      ],
      total: stBorrowings + tradePayables + otherCL + stProvisions,
    },
  ];

  const assetsSections: ScheduleIIISection[] = [
    {
      heading: 'Non-Current Assets',
      subheadings: [
        { label: 'Tangible Assets', noteRef: '9', currentYear: tangibleFA, previousYear: gp('Tangible Fixed Assets') + gp('Accumulated Depreciation') },
        { label: 'Intangible Assets', noteRef: '10', currentYear: intangibleFA, previousYear: gp('Intangible Assets') + gp('Accumulated Amortisation') },
        { label: 'Capital Work in Progress', noteRef: '9a', currentYear: cwip, previousYear: gp('Capital Work in Progress') },
        { label: 'Deferred Tax Assets (Net)', noteRef: '9b', currentYear: deferredTaxA, previousYear: gp('Deferred Tax Asset') },
        { label: 'Non-current Investments', noteRef: '11', currentYear: ncInvestments, previousYear: gp('Non-current Investments') },
        { label: 'Long-term Loans and Advances', noteRef: '12', currentYear: ltLoans, previousYear: gp('Long-term Loans & Advances') },
        { label: 'Other Non-current Assets', noteRef: '11a', currentYear: otherNCA, previousYear: gp('Other Non-current Assets') },
      ],
      total: tangibleFA + intangibleFA + cwip + deferredTaxA + ncInvestments + ltLoans + otherNCA,
    },
    {
      heading: 'Current Assets',
      subheadings: [
        { label: 'Current Investments', noteRef: '11b', currentYear: cInvestments, previousYear: gp('Current Investments') },
        { label: 'Inventories', noteRef: '13', currentYear: inventories, previousYear: gp('Inventories') },
        { label: 'Trade Receivables', noteRef: '14', currentYear: tradeReceivables, previousYear: gp('Trade Receivables') },
        { label: 'Cash and Cash Equivalents', noteRef: '15', currentYear: cashEquiv, previousYear: gp(['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents']) },
        { label: 'Short-term Loans and Advances', noteRef: '16', currentYear: stLoans, previousYear: gp('Short-term Loans & Advances') },
        { label: 'Other Current Assets', noteRef: '16a', currentYear: otherCA, previousYear: gp(['Other Current Assets', 'GST — Input Tax Credit', 'GST — Refund', 'GST — Reconciliation', 'GST — Legacy']) },
      ],
      total: cInvestments + inventories + tradeReceivables + cashEquiv + stLoans + otherCA,
    },
  ];

  const totalEquityLiabilities = equityAndLiabilities.reduce((s, sec) => s + sec.total, 0);
  const totalAssets = assetsSections.reduce((s, sec) => s + sec.total, 0);

  return { equityAndLiabilities, assets: assetsSections, totalEquityLiabilities, totalAssets };
}
