/**
 * One-time cleanup: remove legacy localStorage keys and demo seed data.
 * Replaces auto-seeding from seedVarataxCompany (was polluting real companies).
 */

import {
  deleteCompany,
  listCompanies,
  listJournalEntries,
  deleteJournalEntry,
  OFFLINE_DB_STORAGE_KEY,
} from '@/lib/offlineDb';
import {
  deleteInvoiceV2,
  deletePurchaseInvoice,
  deleteSalesInvoice,
  listInvoicesV2,
  listPurchaseInvoices,
  listSalesInvoices,
} from '@/lib/accounting/gstInvoices';

const PURGE_FLAG_KEY = 'ca_legacy_data_purged_v2';
const DEMO_COMPANY_NAME = 'Varatax Private Limited';
const SEED_TAG = '[VARATAX_SEED_V2]';

const LEGACY_STORAGE_KEYS: readonly string[] = [
  'ca_offline_db',
  'ca_offline_db_v1',
  'ca_journal_entries',
  'ca_companies',
];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clearDemoInvoices(companyId: string): void {
  for (const row of listSalesInvoices(companyId)) {
    if ((row as { narration?: string }).narration?.includes(SEED_TAG)) {
      deleteSalesInvoice(row.id);
    }
  }
  for (const row of listPurchaseInvoices(companyId)) {
    if ((row as { narration?: string }).narration?.includes(SEED_TAG)) {
      deletePurchaseInvoice(row.id);
    }
  }
  for (const row of listInvoicesV2(companyId)) {
    if ((row.notes || '').includes(SEED_TAG)) {
      deleteInvoiceV2(row.id);
    }
  }
}

function removeSeedTaggedJournalRows(companyId: string): void {
  for (const entry of listJournalEntries(companyId)) {
    if ((entry.narration || '').includes(SEED_TAG)) {
      deleteJournalEntry(entry.id);
    }
  }
}

function removeVarataxDemoCompany(): void {
  const demo = listCompanies().find(
    (c) => c.name.trim().toLowerCase() === DEMO_COMPANY_NAME.toLowerCase(),
  );
  if (!demo) return;

  removeSeedTaggedJournalRows(demo.id);
  clearDemoInvoices(demo.id);

  const remaining = listJournalEntries(demo.id);
  const onlyDemoBulk =
    remaining.length >= 400 &&
    remaining.every((e) => (e.narration || '').includes(SEED_TAG) || !e.narration?.trim());

  if (remaining.length === 0 || onlyDemoBulk) {
    for (const entry of remaining) {
      deleteJournalEntry(entry.id);
    }
    clearDemoInvoices(demo.id);
    deleteCompany(demo.id);
  }
}

/**
 * Run once per browser profile. Safe for real companies (e.g. Sharath Kumar S Pvt Ltd).
 */
export function purgeLegacyAppDataOnce(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(PURGE_FLAG_KEY) === '1') return;

  for (const key of LEGACY_STORAGE_KEYS) {
    if (key === OFFLINE_DB_STORAGE_KEY) continue;
    window.localStorage.removeItem(key);
  }

  removeVarataxDemoCompany();

  for (const company of listCompanies()) {
    removeSeedTaggedJournalRows(company.id);
  }

  window.localStorage.setItem(PURGE_FLAG_KEY, '1');
}
