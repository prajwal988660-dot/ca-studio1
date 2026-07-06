import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import {
  computeTDSRegister,
  type TDSRegisterRow,
} from '@/lib/accounting/tdsCompute';

export interface TdsRegisterFilters {
  fromDate?: string;
  toDate?: string;
}

function loadEntries(
  companyId: string,
  filters?: TdsRegisterFilters
): JournalEntry[] {
  return listJournalEntries(companyId, {
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
  });
}

export function computeCompanyTDSRegister(
  companyId: string,
  filters?: TdsRegisterFilters
): TDSRegisterRow[] {
  const entries = loadEntries(companyId, filters);
  return computeTDSRegister(entries);
}

export function computePendingTDSDeposits(
  companyId: string,
  filters?: TdsRegisterFilters
): TDSRegisterRow[] {
  const all = computeCompanyTDSRegister(companyId, filters);
  return all.filter((row) => row.status !== 'deposited');
}

