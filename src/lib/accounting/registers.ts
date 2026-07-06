import { listJournalEntries, type JournalEntryFilters } from '@/lib/offlineDb';

export interface RegisterRow {
  date: string;
  entryCode: string;
  voucherType: string;
  party: string | null;
  amount: number;
  narration: string;
}

function buildRegister(
  companyId: string,
  filters: JournalEntryFilters,
  accountGroupPred: (group: string) => boolean
): RegisterRow[] {
  const entries = listJournalEntries(companyId, filters);
  const rows: RegisterRow[] = [];

  for (const e of entries) {
    let total = 0;
    let party: string | null = null;
    for (const l of e.lines) {
      if (accountGroupPred(l.account_group)) {
        total += l.debit || l.credit || 0;
      } else if (!party && (l.account_group === 'Trade Receivables' || l.account_group === 'Trade Payables')) {
        party = l.account_name;
      }
    }
    if (total !== 0) {
      rows.push({
        date: e.entry_date,
        entryCode: e.entry_code,
        voucherType: e.voucher_type,
        party,
        amount: total,
        narration: e.narration,
      });
    }
  }

  return rows;
}

export function computePurchaseRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate, voucherType: 'PUR' },
    (group) => group === 'Cost of Materials Consumed' || group === 'Purchases of Stock-in-Trade'
  );
}

export function computeSalesRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate, voucherType: 'SLS' },
    (group) => group === 'Revenue from Operations'
  );
}

export function computePurchaseReturnsRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate, voucherType: 'DN' },
    (group) => group === 'Cost of Materials Consumed'
  );
}

export function computeSalesReturnsRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate, voucherType: 'CN' },
    (group) => group === 'Revenue from Operations'
  );
}

export function computeBillsReceivableRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate },
    (group) => group === 'Trade Receivables'
  );
}

export function computeBillsPayableRegister(companyId: string, fromDate?: string, toDate?: string): RegisterRow[] {
  return buildRegister(
    companyId,
    { fromDate, toDate },
    (group) => group === 'Trade Payables'
  );
}

