/**
 * Bulk Private Limited — localStorage storage layer.
 *
 * Separate key from the main offlineDb to avoid polluting the journal schema.
 * All tables are scoped per company (companyId key).
 */

import type {
  BulkLedgerAccount,
  SuspenseTransaction,
  BulkLedgerEntry,
  BulkAuditLog,
} from './types';

const STORAGE_KEY = 'bulk_data_v1';

// ── Schema ────────────────────────────────────────────────────────────────────

interface CompanyBulkData {
  ledger_accounts: BulkLedgerAccount[];
  suspense_transactions: SuspenseTransaction[];
  ledger_entries: BulkLedgerEntry[];
  audit_log: BulkAuditLog[];
}

type BulkStorage = Record<string, CompanyBulkData>; // keyed by companyId

// ── Internal helpers ──────────────────────────────────────────────────────────

function load(): BulkStorage {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BulkStorage) : {};
  } catch {
    return {};
  }
}

function save(storage: BulkStorage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function getCompanyData(companyId: string): CompanyBulkData {
  const storage = load();
  return (
    storage[companyId] ?? {
      ledger_accounts: [],
      suspense_transactions: [],
      ledger_entries: [],
      audit_log: [],
    }
  );
}

function saveCompanyData(companyId: string, data: CompanyBulkData): void {
  const storage = load();
  storage[companyId] = data;
  save(storage);
}

// ── Ledger Accounts ───────────────────────────────────────────────────────────

export function getLedgerAccounts(companyId: string): BulkLedgerAccount[] {
  return getCompanyData(companyId).ledger_accounts;
}

export function getLedgerAccount(
  companyId: string,
  ledgerAccountId: string,
): BulkLedgerAccount | null {
  return (
    getCompanyData(companyId).ledger_accounts.find(
      (a) => a.id === ledgerAccountId,
    ) ?? null
  );
}

export function upsertLedgerAccount(
  companyId: string,
  account: {
    id?: string;
    name: string;
    group: string;
    accountType: string;
    createdBy: BulkLedgerAccount['createdBy'];
  },
): BulkLedgerAccount {
  const data = getCompanyData(companyId);
  const existing = data.ledger_accounts.find(
    (a) => a.name.toLowerCase() === account.name.toLowerCase(),
  );
  if (existing) return existing;

  const newAccount: BulkLedgerAccount = {
    id: account.id ?? crypto.randomUUID(),
    companyId,
    name: account.name,
    group: account.group,
    accountType: account.accountType,
    createdBy: account.createdBy,
    createdAt: new Date().toISOString(),
  };
  data.ledger_accounts.push(newAccount);
  saveCompanyData(companyId, data);
  return newAccount;
}

// ── Suspense Transactions ─────────────────────────────────────────────────────

export function getSuspenseTransactions(
  companyId: string,
  fy?: string,
): SuspenseTransaction[] {
  const all = getCompanyData(companyId).suspense_transactions;
  return fy ? all.filter((t) => t.fy === fy) : all;
}

export function bulkInsertSuspense(
  companyId: string,
  rows: SuspenseTransaction[],
): void {
  const data = getCompanyData(companyId);
  data.suspense_transactions.push(...rows);
  saveCompanyData(companyId, data);
}

export function updateSuspenseRows(
  companyId: string,
  ids: string[],
  updates: Partial<SuspenseTransaction>,
): void {
  const data = getCompanyData(companyId);
  const idSet = new Set(ids);
  data.suspense_transactions = data.suspense_transactions.map((t) =>
    idSet.has(t.id) ? { ...t, ...updates } : t,
  );
  saveCompanyData(companyId, data);
}

export function deleteSuspenseRows(
  companyId: string,
  ids: string[]
): void {
  const data = getCompanyData(companyId);
  const idSet = new Set(ids);
  data.suspense_transactions = data.suspense_transactions.filter((t) => !idSet.has(t.id));
  saveCompanyData(companyId, data);
}

// ── Ledger Entries ────────────────────────────────────────────────────────────

export function getLedgerEntries(
  companyId: string,
  fy?: string,
  ledgerAccountId?: string,
): BulkLedgerEntry[] {
  let all = getCompanyData(companyId).ledger_entries;
  if (fy) all = all.filter((e) => e.fy === fy);
  if (ledgerAccountId) all = all.filter((e) => e.ledgerAccountId === ledgerAccountId);
  return all;
}

export function bulkInsertLedgerEntries(
  companyId: string,
  entries: BulkLedgerEntry[],
): void {
  const data = getCompanyData(companyId);
  data.ledger_entries.push(...entries);
  saveCompanyData(companyId, data);
}

export function insertLedgerEntry(
  companyId: string,
  entry: BulkLedgerEntry,
): void {
  const data = getCompanyData(companyId);
  data.ledger_entries.push(entry);
  saveCompanyData(companyId, data);
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export function appendAuditLog(
  companyId: string,
  log: Omit<BulkAuditLog, 'id' | 'companyId' | 'createdAt'>,
): void {
  const data = getCompanyData(companyId);
  data.audit_log.push({
    id: crypto.randomUUID(),
    companyId,
    actor: log.actor,
    action: log.action,
    detail: log.detail,
    createdAt: new Date().toISOString(),
  });
  saveCompanyData(companyId, data);
}

export function getAuditLog(companyId: string): BulkAuditLog[] {
  return getCompanyData(companyId).audit_log;
}

// ── Clear all bulk data for a company (for reset/test) ───────────────────────

export function clearBulkData(companyId: string): void {
  const storage = load();
  delete storage[companyId];
  save(storage);
}
