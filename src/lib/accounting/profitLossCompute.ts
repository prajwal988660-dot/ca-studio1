import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';
import { PNL_EXPENSE_SUBGROUPS, PNL_INCOME_SUBGROUPS } from '@/lib/masterCOA';

// ── Traditional T-format (sole proprietor / partnership) ────────────

export interface ProfitLossData {
  debitItems: { name: string; amount: number }[];
  creditItems: { name: string; amount: number }[];
  netProfit: number;
  debitTotal: number;
  creditTotal: number;
}

export function computeProfitLoss(
  entries: JournalEntry[],
  grossProfit: number
): ProfitLossData {
  const balances = computeAllBalances(entries);

  const debitItems: { name: string; amount: number }[] = [];
  const creditItems: { name: string; amount: number }[] = [];

  if (grossProfit > 0) {
    creditItems.push({ name: 'Gross Profit b/d', amount: grossProfit });
  } else if (grossProfit < 0) {
    debitItems.push({ name: 'Gross Loss b/d', amount: Math.abs(grossProfit) });
  }

  for (const b of balances) {
    if (PNL_EXPENSE_SUBGROUPS.includes(b.account_group)) {
      const amount = b.balance_type === 'Cr' ? -b.balance : b.balance;
      debitItems.push({ name: b.account_name, amount });
    } else if (PNL_INCOME_SUBGROUPS.includes(b.account_group)) {
      const amount = b.balance_type === 'Dr' ? -b.balance : b.balance;
      creditItems.push({ name: b.account_name, amount });
    }
  }

  const debitTotal = debitItems.reduce((sum, i) => sum + i.amount, 0);
  const creditTotal = creditItems.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = creditTotal - debitTotal;

  if (netProfit > 0) {
    debitItems.push({ name: 'Net Profit', amount: netProfit });
  } else if (netProfit < 0) {
    creditItems.push({ name: 'Net Loss', amount: Math.abs(netProfit) });
  }

  return { debitItems, creditItems, netProfit, debitTotal, creditTotal };
}

// ── Schedule III P&L (Pvt Ltd / Public Ltd) ─────────────────────────

export interface LedgerBreakdown {
  name: string;
  amount: number;
}

export interface ScheduleIIIPLData {
  revenueFromOperations: number;
  revenueFromOperationsBreakdown: LedgerBreakdown[];
  otherIncome: number;
  otherIncomeBreakdown: LedgerBreakdown[];
  totalRevenue: number;

  costOfMaterials: number;
  costOfMaterialsBreakdown: LedgerBreakdown[];
  purchasesOfStockInTrade: number;
  purchasesOfStockInTradeBreakdown: LedgerBreakdown[];
  changesInInventories: number;
  changesInInventoriesBreakdown: LedgerBreakdown[];
  employeeBenefits: number;
  employeeBenefitsBreakdown: LedgerBreakdown[];
  financeCosts: number;
  financeCostsBreakdown: LedgerBreakdown[];
  depreciationAmortisation: number;
  depreciationAmortisationBreakdown: LedgerBreakdown[];
  otherExpenses: number;
  otherExpensesBreakdown: LedgerBreakdown[];
  totalExpenses: number;

  profitBeforeExceptionalAndTax: number;
  exceptionalItems: number;
  exceptionalItemsBreakdown: LedgerBreakdown[];
  profitBeforeTax: number;
  taxExpense: number;
  taxExpenseBreakdown: LedgerBreakdown[];
  currentTaxExpense: number;
  deferredTaxExpense: number;
  otherTaxExpense: number;
  profitAfterTax: number;

  oci: number;
  ociBreakdown: LedgerBreakdown[];
  totalComprehensiveIncome: number;
}

function sumSubGroup(
  balances: AccountBalance[],
  subGroups: string | string[]
): { total: number; breakdown: LedgerBreakdown[] } {
  const groups = typeof subGroups === 'string' ? [subGroups] : subGroups;
  const breakdown: LedgerBreakdown[] = [];
  let total = 0;

  for (const b of balances) {
    if (!groups.includes(b.account_group)) continue;
    const isExpense = b.nature === 'expense';
    const amount = isExpense
      ? (b.balance_type === 'Cr' ? -b.balance : b.balance)
      : (b.balance_type === 'Dr' ? -b.balance : b.balance);
    breakdown.push({ name: b.account_name, amount });
    total += amount;
  }

  return { total, breakdown };
}

export function computeScheduleIIIPL(entries: JournalEntry[]): ScheduleIIIPLData {
  const balances = computeAllBalances(entries);

  const revenue = sumSubGroup(balances, 'Revenue from Operations');
  const otherInc = sumSubGroup(balances, 'Other Income');
  const totalRevenue = revenue.total + otherInc.total;

  const costMat = sumSubGroup(balances, 'Cost of Materials Consumed');
  const purSIT = sumSubGroup(balances, 'Purchases of Stock-in-Trade');
  const chgInv = sumSubGroup(balances, 'Changes in Inventories');
  const empBen = sumSubGroup(balances, 'Employee Benefits Expense');
  const finCost = sumSubGroup(balances, 'Finance Costs');
  const depAmort = sumSubGroup(balances, 'Depreciation & Amortisation');
  const otherExp = sumSubGroup(balances, [
    'Direct Expenses',
    'Other Expenses — Administration',
    'Other Expenses — Selling',
    'Other Expenses — Write-offs',
    'Other Expenses',
  ]);
  const exceptionalItems = sumSubGroup(balances, 'Exceptional Items');
  const taxExp = sumSubGroup(balances, 'Tax Expense');
  const gstItc = sumSubGroup(balances, 'GST — ITC');
  const ociResult = sumSubGroup(balances, 'Other Comprehensive Income');

  const totalExpenses =
    costMat.total + purSIT.total + chgInv.total +
    empBen.total + finCost.total + depAmort.total +
    otherExp.total + gstItc.total;

  const profitBeforeExceptionalAndTax = totalRevenue - totalExpenses;
  const profitBeforeTax = profitBeforeExceptionalAndTax - exceptionalItems.total;
  const profitAfterTax = profitBeforeTax - taxExp.total;

  const currentTaxExp = taxExp.breakdown
    .filter(l => /current|income tax|mat|short|excess|prior year|others/i.test(l.name))
    .reduce((s, l) => s + l.amount, 0);
  const deferredTaxExp = taxExp.breakdown
    .filter(l => /deferred/i.test(l.name))
    .reduce((s, l) => s + l.amount, 0);
  const otherTaxExp = taxExp.total - currentTaxExp - deferredTaxExp;

  return {
    revenueFromOperations: revenue.total,
    revenueFromOperationsBreakdown: revenue.breakdown,
    otherIncome: otherInc.total,
    otherIncomeBreakdown: otherInc.breakdown,
    totalRevenue,

    costOfMaterials: costMat.total,
    costOfMaterialsBreakdown: costMat.breakdown,
    purchasesOfStockInTrade: purSIT.total,
    purchasesOfStockInTradeBreakdown: purSIT.breakdown,
    changesInInventories: chgInv.total,
    changesInInventoriesBreakdown: chgInv.breakdown,
    employeeBenefits: empBen.total,
    employeeBenefitsBreakdown: empBen.breakdown,
    financeCosts: finCost.total,
    financeCostsBreakdown: finCost.breakdown,
    depreciationAmortisation: depAmort.total,
    depreciationAmortisationBreakdown: depAmort.breakdown,
    otherExpenses: otherExp.total,
    otherExpensesBreakdown: [...otherExp.breakdown, ...gstItc.breakdown],
    totalExpenses,

    profitBeforeExceptionalAndTax,
    exceptionalItems: exceptionalItems.total,
    exceptionalItemsBreakdown: exceptionalItems.breakdown,
    profitBeforeTax,
    taxExpense: taxExp.total,
    taxExpenseBreakdown: taxExp.breakdown,
    currentTaxExpense: currentTaxExp,
    deferredTaxExpense: deferredTaxExp,
    otherTaxExpense: otherTaxExp,
    profitAfterTax,

    oci: ociResult.total,
    ociBreakdown: ociResult.breakdown,
    totalComprehensiveIncome: profitAfterTax + ociResult.total,
  };
}
