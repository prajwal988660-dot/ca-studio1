import type { Company, BookPeriod } from '@/types/company';
import type { JournalEntry, VoucherType } from '@/types/journal';
import { validateJournalEntry } from '@/lib/accounting/validation';
import { emitJournalDataChanged } from '@/lib/journalSync';

/** Per-company entity-specific data (classification, IFC, registers, filings, etc.) */
export interface EntityDataRecord {
  id: string;
  company_id: string;
  /** Entity module key, e.g. 'pvt_ltd' */
  module: string;
  /** Data section within the module */
  section: string;
  /** The actual data payload */
  data: unknown;
  created_at: string;
  updated_at: string;
}

/** Explicitly registered accounts (persists after all JEs are deleted). */
export interface CustomAccount {
  id: string;
  company_id: string;
  name: string;
  account_group: string;
  nature: string;
  created_at: string;
}

type DbSchema = {
  companies: Company[];
  journal_entries: JournalEntry[];
  book_periods: BookPeriod[];
  entity_data: EntityDataRecord[];
  custom_accounts: CustomAccount[];
};

// v2: bump key so all previous local data is ignored (fresh DB)
export const OFFLINE_DB_STORAGE_KEY = 'ca_offline_db_v2';
const STORAGE_KEY = OFFLINE_DB_STORAGE_KEY;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emptyDb(): DbSchema {
  return { companies: [], journal_entries: [], book_periods: [], entity_data: [], custom_accounts: [] };
}

function loadDb(): DbSchema {
  if (!isBrowser()) return emptyDb();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const empty = emptyDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }

  try {
    const parsed = JSON.parse(raw) as DbSchema;
    return {
      companies: parsed.companies ?? [],
      journal_entries: parsed.journal_entries ?? [],
      book_periods: parsed.book_periods ?? [],
      entity_data: parsed.entity_data ?? [],
      custom_accounts: parsed.custom_accounts ?? [],
    };
  } catch {
    const empty = emptyDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
}

function saveDb(db: DbSchema) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

// ---- Companies ----

export function listCompanies(): Company[] {
  const db = loadDb();
  // Newest first, similar to Supabase order(created_at desc)
  return [...db.companies].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

export function getCompany(id: string): Company | null {
  const db = loadDb();
  return db.companies.find((c) => c.id === id) ?? null;
}

export function deleteCompany(id: string): void {
  const db = loadDb();
  db.companies = db.companies.filter((c) => c.id !== id);
  db.journal_entries = db.journal_entries.filter((e) => e.company_id !== id);
  db.book_periods = db.book_periods.filter((p) => p.company_id !== id);
  db.entity_data = db.entity_data.filter((d) => d.company_id !== id);
  db.custom_accounts = db.custom_accounts.filter((a) => a.company_id !== id);
  saveDb(db);
}

export interface NewCompanyInput {
  name: string;
  entity_type: Company['entity_type'];
  entity_details: Company['entity_details'];
  business_nature: Company['business_nature'];
  inventory_enabled: boolean;
  inventory_config: Company['inventory_config'];
  gst_status: Company['gst_status'];
  gst_details: Company['gst_details'];
  tds_applicable: boolean;
  tcs_applicable: boolean;
  accounting_method: Company['accounting_method'];
  financial_year_start: Company['financial_year_start'];
}

export function createCompany(input: NewCompanyInput): Company {
  const db = loadDb();
  const nowIso = new Date().toISOString();

  const company: Company = {
    id: generateId(),
    user_id: 'offline-user',
    status: 'active',
    tax_audit_applicable: false,
    accounting_standard: 'indian_gaap',
    created_at: nowIso,
    updated_at: nowIso,
    ...input,
  };

  db.companies.push(company);
  saveDb(db);
  return company;
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
  const db = loadDb();
  const idx = db.companies.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const nowIso = new Date().toISOString();
  const updated: Company = {
    ...db.companies[idx],
    ...updates,
    updated_at: nowIso,
  };

  db.companies[idx] = updated;
  saveDb(db);
  return updated;
}

// ---- Book periods ----

export function createInitialBookPeriod(companyId: string): BookPeriod {
  const db = loadDb();
  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const period: BookPeriod = {
    id: generateId(),
    company_id: companyId,
    period_start: `${fyYear}-04-01`,
    period_end: `${fyYear + 1}-03-31`,
    period_label: `FY ${fyYear}-${(fyYear + 1).toString().slice(2)}`,
    status: 'open',
    created_at: new Date().toISOString(),
  };

  db.book_periods.push(period);
  saveDb(db);
  return period;
}

export function listBookPeriods(companyId: string): BookPeriod[] {
  const db = loadDb();
  return db.book_periods
    .filter((p) => p.company_id === companyId)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

// ---- Journal entries ----

export interface JournalEntryFilters {
  fromDate?: string;
  toDate?: string;
  voucherType?: string;
  entryCode?: string;
}

export interface NewJournalEntryInput {
  company_id: string;
  entry_code: string;
  entry_date: string;
  voucher_type: string;
  voucher_number?: string | null;
  lines: JournalEntry['lines'];
  narration: string;
  book_period: string;
  is_opening?: boolean;
  is_closing?: boolean;
}

export function listJournalEntries(companyId: string, filters?: JournalEntryFilters): JournalEntry[] {
  const db = loadDb();
  let entries = db.journal_entries.filter((e) => e.company_id === companyId);

  if (filters?.fromDate) {
    entries = entries.filter((e) => e.entry_date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    entries = entries.filter((e) => e.entry_date <= filters.toDate!);
  }
  if (filters?.voucherType) {
    entries = entries.filter((e) => e.voucher_type === filters.voucherType);
  }
  if (filters?.entryCode) {
    const code = filters.entryCode.trim();
    if (code) entries = entries.filter((e) => e.entry_code.includes(code));
  }

  return entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}

export function countJournalEntries(companyId: string): number {
  const db = loadDb();
  return db.journal_entries.filter((e) => e.company_id === companyId).length;
}

/** Lightweight: returns min/max entry_date for a company without loading full entries. */
export function getJournalDateRange(companyId: string): { from: string; to: string } | null {
  const db = loadDb();
  let from: string | null = null;
  let to: string | null = null;
  for (const e of db.journal_entries) {
    if (e.company_id !== companyId) continue;
    if (from == null || e.entry_date < from) from = e.entry_date;
    if (to == null || e.entry_date > to) to = e.entry_date;
  }
  if (from == null || to == null) return null;
  return { from, to };
}

export function createJournalEntry(input: NewJournalEntryInput): JournalEntry {
  const db = loadDb();
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    id: generateId(),
    created_at: now,
    updated_at: now,
    is_opening: false,
    is_closing: false,
    voucher_number: input.voucher_number ?? null,
    ...input,
    voucher_type: (input.voucher_type || 'JRN') as VoucherType,
  };

  const validation = validateJournalEntry(entry);
  if (!validation.ok) {
    const error = new Error('Journal entry validation failed');
    (error as any).details = validation.errors;
    throw error;
  }

  db.journal_entries.push(entry);
  saveDb(db);
  emitJournalDataChanged(input.company_id);
  return entry;
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | null {
  const db = loadDb();
  const idx = db.journal_entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const existing = db.journal_entries[idx];

  // entry_code is immutable once created
  const next: JournalEntry = {
    ...existing,
    ...updates,
    entry_code: existing.entry_code,
    updated_at: new Date().toISOString(),
  };

  const validation = validateJournalEntry(next);
  if (!validation.ok) {
    const error = new Error('Journal entry validation failed');
    (error as any).details = validation.errors;
    throw error;
  }

  db.journal_entries[idx] = next;
  saveDb(db);
  emitJournalDataChanged(existing.company_id);
  return next;
}

export function deleteJournalEntry(id: string): void {
  const db = loadDb();
  const victim = db.journal_entries.find((e) => e.id === id);
  if (!victim) return;
  db.journal_entries = db.journal_entries.filter((e) => e.id !== id);
  saveDb(db);
  emitJournalDataChanged(victim.company_id);
}

export function deleteAllJournalEntries(companyId: string): number {
  const db = loadDb();
  const before = db.journal_entries.length;
  db.journal_entries = db.journal_entries.filter((e) => e.company_id !== companyId);
  saveDb(db);
  emitJournalDataChanged(companyId);
  return before - db.journal_entries.length;
}

// ---- Custom Accounts (user-created accounts that persist after JE deletion) ----

export function getCustomAccounts(companyId: string): CustomAccount[] {
  const db = loadDb();
  return (db.custom_accounts ?? []).filter((a) => a.company_id === companyId);
}

/** Register an account so it persists even if all its JEs are deleted. Idempotent. */
export function registerCustomAccount(
  companyId: string,
  name: string,
  accountGroup: string,
  nature: string,
): void {
  const db = loadDb();
  if (!db.custom_accounts) db.custom_accounts = [];
  const key = name.trim().replace(/\s+/g, ' ').toLowerCase();
  const existing = db.custom_accounts.find(
    (a) => a.company_id === companyId && a.name.trim().replace(/\s+/g, ' ').toLowerCase() === key
  );
  if (existing) {
    // Update group/nature if provided
    if (accountGroup) { existing.account_group = accountGroup; existing.nature = nature; }
  } else {
    db.custom_accounts.push({
      id: generateId(),
      company_id: companyId,
      name: name.trim().replace(/\s+/g, ' '),
      account_group: accountGroup,
      nature,
      created_at: new Date().toISOString(),
    });
  }
  saveDb(db);
}

/** Delete a custom account from the registry by id. */
export function deleteCustomAccount(companyId: string, id: string): void {
  const db = loadDb();
  if (!db.custom_accounts) return;
  db.custom_accounts = db.custom_accounts.filter((a) => !(a.company_id === companyId && a.id === id));
  saveDb(db);
}

/** Rename a custom account in the registry (does NOT rename in JE lines). */
export function renameCustomAccount(companyId: string, id: string, newName: string): void {
  const db = loadDb();
  if (!db.custom_accounts) return;
  const acc = db.custom_accounts.find((a) => a.company_id === companyId && a.id === id);
  if (acc) { acc.name = newName.trim().replace(/\s+/g, ' '); saveDb(db); }
}

/** Update an account's group/nature across all its journal lines + registry. */
export function updateAccountGroupInAllEntries(
  companyId: string,
  accountName: string,
  newGroup: string,
  newNature: string,
): void {
  const db = loadDb();
  let changed = false;
  for (const entry of db.journal_entries) {
    if (entry.company_id !== companyId) continue;
    for (const line of entry.lines) {
      if (line.account_name === accountName) {
        (line as any).account_group = newGroup;
        (line as any).nature = newNature;
        changed = true;
      }
    }
  }
  // Update registry entry too
  if (!db.custom_accounts) db.custom_accounts = [];
  const key = accountName.trim().replace(/\s+/g, ' ').toLowerCase();
  const reg = db.custom_accounts.find(
    (a) => a.company_id === companyId && a.name.trim().replace(/\s+/g, ' ').toLowerCase() === key
  );
  if (reg) { reg.account_group = newGroup; reg.nature = newNature; changed = true; }
  else {
    // Register it now so group persists
    db.custom_accounts.push({
      id: generateId(), company_id: companyId, name: accountName,
      account_group: newGroup, nature: newNature, created_at: new Date().toISOString(),
    });
    changed = true;
  }
  if (changed) { saveDb(db); emitJournalDataChanged(companyId); }
}

// ---- Entity Data (per-company entity-specific modules) ----

export function getEntityData(companyId: string, module: string, section: string): EntityDataRecord | null {
  const db = loadDb();
  return db.entity_data.find(
    (d) => d.company_id === companyId && d.module === module && d.section === section,
  ) ?? null;
}

export function listEntityData(companyId: string, module: string): EntityDataRecord[] {
  const db = loadDb();
  return db.entity_data.filter(
    (d) => d.company_id === companyId && d.module === module,
  );
}

export function upsertEntityData(
  companyId: string,
  module: string,
  section: string,
  data: unknown,
): EntityDataRecord {
  const db = loadDb();
  const now = new Date().toISOString();
  const idx = db.entity_data.findIndex(
    (d) => d.company_id === companyId && d.module === module && d.section === section,
  );

  if (idx >= 0) {
    db.entity_data[idx] = { ...db.entity_data[idx], data, updated_at: now };
    saveDb(db);
    return db.entity_data[idx];
  }

  const record: EntityDataRecord = {
    id: generateId(),
    company_id: companyId,
    module,
    section,
    data,
    created_at: now,
    updated_at: now,
  };
  db.entity_data.push(record);
  saveDb(db);
  return record;
}

export function deleteEntityData(companyId: string, module: string, section?: string): void {
  const db = loadDb();
  db.entity_data = db.entity_data.filter((d) => {
    if (d.company_id !== companyId || d.module !== module) return true;
    if (section && d.section !== section) return true;
    return false;
  });
  saveDb(db);
}
