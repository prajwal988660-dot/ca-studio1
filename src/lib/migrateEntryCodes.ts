/**
 * One-time migration: replace old journal entry_code values (e.g. JE-0001, JE-M4K2X9P)
 * with 4-char case-sensitive alphanumeric codes. Tracks migrated companies so we only run once.
 */

import { listJournalEntries, updateJournalEntry } from '@/lib/offlineDb';
import { generateUniqueShortEntryCode } from '@/lib/utils/entryCodeGenerator';

const MIGRATION_KEY = 'ca_entry_code_migrated_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getMigratedCompanies(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(MIGRATION_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setMigratedCompany(companyId: string): void {
  if (!isBrowser()) return;
  const list = getMigratedCompanies();
  if (list.includes(companyId)) return;
  list.push(companyId);
  window.localStorage.setItem(MIGRATION_KEY, JSON.stringify(list));
}

function needsMigration(entryCode: string): boolean {
  return entryCode.length !== 4 || !/^[a-zA-Z0-9]{4}$/.test(entryCode);
}

/**
 * For the given company, replace any old-format entry_codes with new 4-char codes.
 * Idempotent per company (runs once per company, then skips).
 */
export function runEntryCodeMigrationIfNeeded(companyId: string): void {
  if (!isBrowser() || !companyId) return;
  if (getMigratedCompanies().includes(companyId)) return;

  const entries = listJournalEntries(companyId);
  const existing = new Set(
    entries.filter((e) => !needsMigration(e.entry_code)).map((e) => e.entry_code)
  );

  for (const entry of entries) {
    if (!needsMigration(entry.entry_code)) continue;
    const newCode = generateUniqueShortEntryCode(existing);
    existing.add(newCode);
    updateJournalEntry(entry.id, { entry_code: newCode });
  }

  setMigratedCompany(companyId);
}
