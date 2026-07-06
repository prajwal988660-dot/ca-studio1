import { listJournalEntries } from '@/lib/offlineDb';

export interface EmployeeMaster {
  code: string;
  name: string;
  pan?: string;
  pfNumber?: string;
  esiNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}

export interface PayRunComponentTotals {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  employerPf: number;
  employerEsi: number;
  otherExpenses?: number;
}

export interface StatutoryDeductionsTotals {
  employeePf: number;
  employeeEsi: number;
  tds: number;
  professionalTax: number;
  otherDeductions?: number;
}

export interface PayRunSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalGrossEarnings: number;
  totalNetPay: number;
  components: PayRunComponentTotals;
  deductions: StatutoryDeductionsTotals;
}

export interface PayslipLine {
  component: string;
  amount: number;
}

export interface Payslip {
  employee: EmployeeMaster;
  periodStart: string;
  periodEnd: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: PayslipLine[];
  deductionsBreakdown: PayslipLine[];
}

export interface NewJournalLineInput {
  account_name: string;
  account_group: string;
  nature: 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';
  debit: number;
  credit: number;
}

export interface NewJournalEntryInput {
  company_id: string;
  entry_date: string;
  voucher_type: string;
  voucher_number?: string | null;
  narration: string;
  book_period: string;
  lines: NewJournalLineInput[];
}

export interface PayrollPostingConfig {
  salaryExpenseAccount: string;
  salaryExpenseGroup: string;
  employerContributionAccount: string;
  employerContributionGroup: string;
  tdsPayableAccount: string;
  tdsPayableGroup: string;
  pfPayableAccount: string;
  pfPayableGroup: string;
  esiPayableAccount: string;
  esiPayableGroup: string;
  professionalTaxPayableAccount: string;
  professionalTaxPayableGroup: string;
  netSalaryPayableAccount: string;
  netSalaryPayableGroup: string;
}

export function buildPayrollPostingEntry(
  companyId: string,
  payRun: PayRunSummary,
  config: PayrollPostingConfig
): NewJournalEntryInput {
  const {
    components,
    deductions,
    periodEnd,
    periodStart,
    totalNetPay,
    totalGrossEarnings,
  } = payRun;

  const salaryExpenseTotal =
    components.basic +
    components.hra +
    components.allowances +
    components.bonus +
    (components.otherExpenses ?? 0);

  const employerContributionTotal =
    components.employerPf + components.employerEsi;

  const tdsTotal = deductions.tds;
  const pfTotal = deductions.employeePf + components.employerPf;
  const esiTotal = deductions.employeeEsi + components.employerEsi;
  const ptTotal = deductions.professionalTax;

  const lines: NewJournalLineInput[] = [];

  if (salaryExpenseTotal > 0) {
    lines.push({
      account_name: config.salaryExpenseAccount,
      account_group: config.salaryExpenseGroup,
      nature: 'expense',
      debit: salaryExpenseTotal,
      credit: 0,
    });
  }

  if (employerContributionTotal > 0) {
    lines.push({
      account_name: config.employerContributionAccount,
      account_group: config.employerContributionGroup,
      nature: 'expense',
      debit: employerContributionTotal,
      credit: 0,
    });
  }

  if (tdsTotal > 0) {
    lines.push({
      account_name: config.tdsPayableAccount,
      account_group: config.tdsPayableGroup,
      nature: 'liability',
      debit: 0,
      credit: tdsTotal,
    });
  }

  if (pfTotal > 0) {
    lines.push({
      account_name: config.pfPayableAccount,
      account_group: config.pfPayableGroup,
      nature: 'liability',
      debit: 0,
      credit: pfTotal,
    });
  }

  if (esiTotal > 0) {
    lines.push({
      account_name: config.esiPayableAccount,
      account_group: config.esiPayableGroup,
      nature: 'liability',
      debit: 0,
      credit: esiTotal,
    });
  }

  if (ptTotal > 0) {
    lines.push({
      account_name: config.professionalTaxPayableAccount,
      account_group: config.professionalTaxPayableGroup,
      nature: 'liability',
      debit: 0,
      credit: ptTotal,
    });
  }

  if (totalNetPay > 0) {
    lines.push({
      account_name: config.netSalaryPayableAccount,
      account_group: config.netSalaryPayableGroup,
      nature: 'liability',
      debit: 0,
      credit: totalNetPay,
    });
  }

  return {
    company_id: companyId,
    entry_date: periodEnd,
    voucher_type: 'SAL',
    voucher_number: null,
    narration: `Payroll for period ${periodStart} to ${periodEnd}`,
    book_period: periodEnd.slice(0, 7),
    lines,
  };
}

export interface PayrollSummaryResult {
  periodStart: string;
  periodEnd: string;
  totalGrossEarnings: number;
  totalNetPay: number;
}

export function computePayrollSummaryFromJournals(
  companyId: string,
  salaryExpenseAccount: string,
  netSalaryPayableAccount: string,
  fromDate?: string,
  toDate?: string
): PayrollSummaryResult {
  const entries = listJournalEntries(companyId, {
    fromDate,
    toDate,
    voucherType: 'SAL',
  });

  let totalGrossEarnings = 0;
  let totalNetPay = 0;
  let periodStart = fromDate ?? '';
  let periodEnd = toDate ?? '';

  for (const entry of entries) {
    if (!periodStart || entry.entry_date < periodStart) periodStart = entry.entry_date;
    if (!periodEnd || entry.entry_date > periodEnd) periodEnd = entry.entry_date;
    for (const line of entry.lines as any[]) {
      if (line.account_name === salaryExpenseAccount) {
        totalGrossEarnings += line.debit || 0;
      } else if (line.account_name === netSalaryPayableAccount) {
        totalNetPay += line.credit || 0;
      }
    }
  }

  return {
    periodStart,
    periodEnd,
    totalGrossEarnings,
    totalNetPay,
  };
}

