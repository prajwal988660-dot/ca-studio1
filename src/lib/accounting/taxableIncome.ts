import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';

export type TaxAdjustmentType = 'addback' | 'deduction';

export interface TaxAdjustment {
  id: string;
  label: string;
  type: TaxAdjustmentType;
  amount: number;
}

export interface TaxableIncomeResult {
  year: number;
  fromDate: string;
  toDate: string;
  profitBeforeTax: number;
  adjustments: TaxAdjustment[];
  taxableIncome: number;
}

function financialYearRange(year: number): { fromDate: string; toDate: string } {
  const fromDate = `${year}-04-01`;
  const toDate = `${year + 1}-03-31`;
  return { fromDate, toDate };
}

function loadEntriesForYear(
  companyId: string,
  year: number
): { entries: JournalEntry[]; fromDate: string; toDate: string } {
  const { fromDate, toDate } = financialYearRange(year);
  const entries = listJournalEntries(companyId, {
    fromDate,
    toDate,
  });
  return { entries, fromDate, toDate };
}

export function computeTaxableIncome(
  companyId: string,
  year: number,
  adjustments: TaxAdjustment[] = []
): TaxableIncomeResult {
  const { entries, fromDate, toDate } = loadEntriesForYear(companyId, year);

  const pl = computeProfitLoss(entries, 0);
  const profitBeforeTax = pl.netProfit;

  let taxable = profitBeforeTax;
  for (const adj of adjustments) {
    if (adj.type === 'addback') {
      taxable += adj.amount;
    } else {
      taxable -= adj.amount;
    }
  }

  return {
    year,
    fromDate,
    toDate,
    profitBeforeTax,
    adjustments,
    taxableIncome: taxable,
  };
}

