import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';

export interface CashFlowSection {
  heading: string;
  items: { label: string; amount: number }[];
  total: number;
}

export interface CashFlowData {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  openingCash: number;
  closingCash: number;
  cashComponents?: { cashOnHand: number; bankBalances: number };
}

function sumGroups(bals: AccountBalance[], groups: string[]): number {
  return bals.filter(b => groups.includes(b.account_group)).reduce((s, b) => s + b.balance, 0);
}

/** Signed sum (Dr positive, Cr negative) for cash so overdraft is negative. */
function signedSumGroups(bals: AccountBalance[], groups: string[]): number {
  return bals
    .filter(b => groups.includes(b.account_group))
    .reduce((s, b) => s + (b.balance_type === 'Dr' ? b.balance : -b.balance), 0);
}

/** Net expense (Dr - Cr) for given sub-groups; use for non-cash add-backs. */
function sumExpenseGroups(bals: AccountBalance[], groups: string[]): number {
  return bals
    .filter(b => groups.includes(b.account_group))
    .reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
}

/** Net revenue (Cr - Dr) for given sub-groups. */
function sumIncomeGroups(bals: AccountBalance[], groups: string[]): number {
  return bals
    .filter(b => groups.includes(b.account_group))
    .reduce((s, b) => s + (b.total_credit - b.total_debit), 0);
}

export function computeCashFlow(
  entries: JournalEntry[],
  netProfit: number,
  previousEntries?: JournalEntry[]
): CashFlowData {
  const balances = computeAllBalances(entries);
  const prevBalances = previousEntries ? computeAllBalances(previousEntries) : [];

  function getBalance(groups: string[], bals: AccountBalance[]): number {
    return sumGroups(bals, groups);
  }

  function getChange(groups: string[]): number {
    return getBalance(groups, balances) - getBalance(groups, prevBalances);
  }

  const cashGroups = ['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents'];

  const interestExpense = sumExpenseGroups(balances, ['Finance Costs']);
  const interestReceivedInvesting = balances
    .filter(b => b.account_group === 'Other Income' && /interest/i.test(b.account_name))
    .reduce((s, b) => s + (b.total_credit - b.total_debit), 0);

  // Operating Activities (Indirect Method) — AS-3
  const depreciation = sumExpenseGroups(balances, ['Depreciation & Amortisation']);
  const taxExpense = sumExpenseGroups(balances, ['Tax Expense']);
  const lossOnSaleOfAssets = balances
    .filter(b => b.account_group === 'Other Expenses' && /loss.*sale|sale.*(fixed )?asset/i.test(b.account_name))
    .reduce((s, b) => s + (b.total_debit - b.total_credit), 0);
  const profitOnSaleOfAssets = balances
    .filter(b => b.account_group === 'Other Income' && /sale|profit.*asset|asset.*profit/i.test(b.account_name))
    .reduce((s, b) => s + (b.total_credit - b.total_debit), 0);
  const netNonCashGainLoss = lossOnSaleOfAssets - profitOnSaleOfAssets; // add back loss, deduct gain
  const changeInLtProvisions = getChange(['Long-term Provisions']);
  const changeInDebtors = -getChange(['Trade Receivables']);
  const changeInCreditors = getChange(['Trade Payables']);
  const changeInStock = -getChange(['Inventories']);
  const changeInPrepaid = -getChange(['Short-term Loans & Advances']);
  const changeInOutstanding = getChange(['Other Current Liabilities', 'Statutory Liabilities']);

  const operatingItems = [
    { label: 'Net Profit before Tax', amount: netProfit },
    { label: 'Add: Depreciation & Amortisation', amount: depreciation },
    { label: 'Add: Interest expense (reclassified to financing)', amount: interestExpense },
    { label: 'Less: Interest received (reclassified to investing)', amount: -interestReceivedInvesting },
    { label: 'Add: Loss / (Less: Profit) on sale of assets', amount: netNonCashGainLoss },
    { label: 'Add: Increase in Long-term Provisions', amount: changeInLtProvisions > 0 ? changeInLtProvisions : 0 },
    { label: 'Less: Tax paid (approx. from provision movement)', amount: -taxExpense },
    { label: 'Decrease/(Increase) in Trade Receivables', amount: changeInDebtors },
    { label: 'Increase/(Decrease) in Trade Payables', amount: changeInCreditors },
    { label: 'Decrease/(Increase) in Inventories', amount: changeInStock },
    { label: 'Decrease/(Increase) in Loans & Advances', amount: changeInPrepaid },
    { label: 'Increase/(Decrease) in Current Liabilities', amount: changeInOutstanding },
  ];
  const operatingTotal = operatingItems.reduce((s, i) => s + i.amount, 0);

  // Investing Activities — AS-3: interest received
  const faGroups = ['Tangible Fixed Assets', 'Intangible Assets', 'Capital Work in Progress'];
  const invGroups = ['Non-current Investments', 'Current Investments'];
  const fixedAssetChange = -getChange(faGroups);
  const investmentChange = -getChange(invGroups);
  const investingItems = [
    { label: 'Purchase/(Sale) of Fixed Assets', amount: fixedAssetChange },
    { label: 'Purchase/(Sale) of Investments', amount: investmentChange },
    { label: 'Interest received', amount: interestReceivedInvesting },
  ];
  const investingTotal = investingItems.reduce((s, i) => s + i.amount, 0);

  // Financing Activities — AS-3: interest paid, dividends paid
  const borrowingChange = getChange(['Long-term Borrowings', 'Short-term Borrowings']);
  const capitalChange = getChange(['Share Capital']);
  const interestPaid = -interestExpense; // outflow (expense already added back in operating)
  const dividendDeclaredGroups = balances.filter(
    b => /interim dividend|final dividend|dividend declared/i.test(b.account_name)
  );
  const dividendsPaidOutflow = dividendDeclaredGroups.reduce(
    (s, b) => s + (b.total_debit - b.total_credit),
    0
  );
  const financingItems = [
    { label: 'Proceeds/(Repayment) of Borrowings', amount: borrowingChange },
    { label: 'Capital Introduced/(Withdrawn)', amount: capitalChange },
    { label: 'Interest paid', amount: interestPaid },
    { label: 'Dividends paid', amount: -Math.abs(dividendsPaidOutflow) },
  ];
  const financingTotal = financingItems.reduce((s, i) => s + i.amount, 0);

  const netChange = operatingTotal + investingTotal + financingTotal;
  const openingCash = signedSumGroups(prevBalances, cashGroups);
  const closingCash = signedSumGroups(balances, cashGroups);

  // Split cash components (signed: overdraft = negative) — closing position
  const cashOnHand = balances
    .filter(b => b.account_group === 'Cash & Cash Equivalents')
    .reduce((s, b) => s + (b.balance_type === 'Dr' ? b.balance : -b.balance), 0);
  const bankBal = balances
    .filter(b => b.account_group === 'Bank Balances' || b.account_group === 'Cash Equivalents')
    .reduce((s, b) => s + (b.balance_type === 'Dr' ? b.balance : -b.balance), 0);

  return {
    operating: { heading: 'Cash Flow from Operating Activities', items: operatingItems, total: operatingTotal },
    investing: { heading: 'Cash Flow from Investing Activities', items: investingItems, total: investingTotal },
    financing: { heading: 'Cash Flow from Financing Activities', items: financingItems, total: financingTotal },
    netChange, openingCash, closingCash,
    cashComponents: { cashOnHand, bankBalances: bankBal },
  };
}
