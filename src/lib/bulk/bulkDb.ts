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
import {
  mirrorUpsert,
  mirrorDelete,
  mirrorDeleteByCompany,
} from '@/lib/sync/cloudSync';

const STORAGE_KEY = 'bulk_data_v1';

// ── Cloud mirror row mappers ────────────────────────────────────────────────
// Map the camelCase store shapes to the snake_case Supabase columns defined in
// supabase/migrations/0005_bulk.sql. Pure + best-effort; the mirror helpers are
// fire-and-forget (never awaited, never throw, no-op offline/logged-out).

function accountRow(a: BulkLedgerAccount): Record<string, unknown> {
  return {
    id: a.id,
    company_id: a.companyId,
    name: a.name,
    account_group: a.group,
    account_type: a.accountType,
    created_by: a.createdBy,
    created_at: a.createdAt,
  };
}

function suspenseRow(t: SuspenseTransaction): Record<string, unknown> {
  return {
    id: t.id,
    company_id: t.companyId,
    fy: t.fy,
    batch_id: t.batchId,
    txn_date: t.txnDate,
    narration: t.narration,
    reference_no: t.referenceNo,
    amount: t.amount,
    direction: t.direction,
    status: t.status,
    allocated_ledger_id: t.allocatedLedgerId,
    allocated_by: t.allocatedBy,
    allocation_keyword: t.allocationKeyword,
    allocated_at: t.allocatedAt,
    original_row_number: t.originalRowNumber,
    created_at: t.createdAt,
  };
}

function ledgerEntryRow(e: BulkLedgerEntry): Record<string, unknown> {
  return {
    id: e.id,
    company_id: e.companyId,
    fy: e.fy,
    ledger_account_id: e.ledgerAccountId,
    txn_date: e.txnDate,
    narration: e.narration,
    reference_no: e.referenceNo,
    amount: e.amount,
    side: e.side,
    source: e.source,
    suspense_id: e.suspenseId,
    batch_id: e.batchId,
    allocated_by: e.allocatedBy,
    allocation_keyword: e.allocationKeyword,
    created_at: e.createdAt,
  };
}

function auditRow(l: BulkAuditLog): Record<string, unknown> {
  return {
    id: l.id,
    company_id: l.companyId,
    actor: l.actor,
    action: l.action,
    detail: l.detail,
    created_at: l.createdAt,
  };
}

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
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op offline).
  mirrorUpsert('bulk_ledger_accounts', accountRow(newAccount));
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
  // Fire-and-forget cloud mirror of the inserted rows.
  mirrorUpsert('bulk_suspense_transactions', rows.map(suspenseRow));
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
  // Fire-and-forget cloud mirror of the updated rows.
  const updatedRows = data.suspense_transactions.filter((t) => idSet.has(t.id));
  mirrorUpsert('bulk_suspense_transactions', updatedRows.map(suspenseRow));
}

export function deleteSuspenseRows(
  companyId: string,
  ids: string[]
): void {
  const data = getCompanyData(companyId);
  const idSet = new Set(ids);
  data.suspense_transactions = data.suspense_transactions.filter((t) => !idSet.has(t.id));
  saveCompanyData(companyId, data);
  // Fire-and-forget cloud mirror of the deletions (best-effort).
  if (ids.length) mirrorDelete('bulk_suspense_transactions', ids);
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
  // Fire-and-forget cloud mirror of the inserted entries.
  mirrorUpsert('bulk_ledger_entries', entries.map(ledgerEntryRow));
}

export function insertLedgerEntry(
  companyId: string,
  entry: BulkLedgerEntry,
): void {
  const data = getCompanyData(companyId);
  data.ledger_entries.push(entry);
  saveCompanyData(companyId, data);
  // Fire-and-forget cloud mirror of the inserted entry.
  mirrorUpsert('bulk_ledger_entries', ledgerEntryRow(entry));
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export function appendAuditLog(
  companyId: string,
  log: Omit<BulkAuditLog, 'id' | 'companyId' | 'createdAt'>,
): void {
  const data = getCompanyData(companyId);
  const entry: BulkAuditLog = {
    id: crypto.randomUUID(),
    companyId,
    actor: log.actor,
    action: log.action,
    detail: log.detail,
    createdAt: new Date().toISOString(),
  };
  data.audit_log.push(entry);
  saveCompanyData(companyId, data);
  // Fire-and-forget cloud mirror of the appended audit entry.
  mirrorUpsert('bulk_audit_log', auditRow(entry));
}

export function getAuditLog(companyId: string): BulkAuditLog[] {
  return getCompanyData(companyId).audit_log;
}

// ── Clear all bulk data for a company (for reset/test) ───────────────────────

export function clearBulkData(companyId: string): void {
  const storage = load();
  delete storage[companyId];
  save(storage);
  // Fire-and-forget cloud mirror of the per-company wipe across all 4 tables.
  mirrorDeleteByCompany('bulk_ledger_accounts', companyId);
  mirrorDeleteByCompany('bulk_suspense_transactions', companyId);
  mirrorDeleteByCompany('bulk_ledger_entries', companyId);
  mirrorDeleteByCompany('bulk_audit_log', companyId);
}
