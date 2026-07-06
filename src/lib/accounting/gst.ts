import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import {
  computeGSTR1,
  computeGSTR3B,
  computeITCRegister,
  computeHSNSummary,
  computeGSTReconciliation,
  type GSTR1Summary,
  type GSTR3BSummary,
  type ITCRegisterRow,
  type HSNSummaryRow,
  type GSTReconciliationRow,
} from '@/lib/accounting/gstCompute';

export interface GstPeriod {
  fromDate: string;
  toDate: string;
}

function loadEntriesForPeriod(
  companyId: string,
  period: GstPeriod
): JournalEntry[] {
  return listJournalEntries(companyId, {
    fromDate: period.fromDate,
    toDate: period.toDate,
  });
}

export function computeCompanyGSTR1(
  companyId: string,
  period: GstPeriod
): GSTR1Summary {
  const entries = loadEntriesForPeriod(companyId, period);
  return computeGSTR1(entries);
}

export function computeGSTR3BForCompany(
  companyId: string,
  period: GstPeriod
): GSTR3BSummary {
  const entries = loadEntriesForPeriod(companyId, period);
  return computeGSTR3B(entries);
}

export function computeCompanyITCRegister(
  companyId: string,
  period: GstPeriod
): ITCRegisterRow[] {
  const entries = loadEntriesForPeriod(companyId, period);
  return computeITCRegister(entries);
}

export function computeCompanyHSNSummary(
  companyId: string,
  period: GstPeriod
): HSNSummaryRow[] {
  const entries = loadEntriesForPeriod(companyId, period);
  return computeHSNSummary(entries);
}

export function computeCompanyGSTReconciliation(
  companyId: string,
  period: GstPeriod,
  gstr2BData?: { invoiceNumber: string; taxableValue: number; taxAmount: number }[]
): GSTReconciliationRow[] {
  const entries = loadEntriesForPeriod(companyId, period);
  return computeGSTReconciliation(entries, gstr2BData);
}

