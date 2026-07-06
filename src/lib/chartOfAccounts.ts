/**
 * Per-company account name lookup for the journal entry dropdown.
 *
 * Priority order:
 *   1. Journal-used accounts for this company (company-specific, shown first)
 *   2. COA default accounts (pre-seeded, shown for all companies including new ones)
 *
 * This means even a brand-new company sees a populated dropdown.
 */

import { listJournalEntries, getCustomAccounts } from '@/lib/offlineDb';
import { getAllDefaultAccounts, classifyDefaultAccount } from '@/lib/coa';

export function normalizeAccountName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function keyOf(name: string): string {
  return normalizeAccountName(name).toLowerCase();
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Names from journal entries + custom account registry for this company. */
function getJournalAccountNames(companyId: string): string[] {
  if (!isBrowser() || !companyId) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  // 1. Journal-line accounts
  for (const entry of listJournalEntries(companyId)) {
    for (const line of entry.lines) {
      const normalized = normalizeAccountName(line.account_name || '');
      const k = normalized.toLowerCase();
      if (!normalized || seen.has(k)) continue;
      seen.add(k);
      names.push(normalized);
    }
  }
  // 2. Explicitly registered accounts (persists after JE deletion)
  for (const acc of getCustomAccounts(companyId)) {
    const normalized = normalizeAccountName(acc.name || '');
    const k = normalized.toLowerCase();
    if (!normalized || seen.has(k)) continue;
    seen.add(k);
    names.push(normalized);
  }
  return names;
}

/**
 * If an account already exists for this company (in journal entries),
 * return the canonical existing name; otherwise null.
 */
export function findExistingAccountName(companyId: string, name: string): string | null {
  const k = keyOf(name);
  if (!k) return null;
  for (const used of getJournalAccountNames(companyId)) {
    if (keyOf(used) === k) return used;
  }
  return null;
}

/**
 * Search accounts for the dropdown.
 *
 * @returns
 *   basic    — company-used accounts (journal-scanned) that match query
 *   extended — COA default accounts that match query (or top defaults if no query)
 *   isNew    — true when the query is non-empty and not found anywhere
 */
export function searchAccounts(
  companyId: string,
  query: string,
): { basic: string[]; extended: string[]; isNew: boolean } {
  const journalNames = getJournalAccountNames(companyId);
  const defaults = getAllDefaultAccounts();
  const q = query.trim().toLowerCase();

  if (!q) {
    // No query: show company-used accounts + helpful COA defaults for new companies
    const journalSet = new Set(journalNames.map(keyOf));
    const defaultsNotUsed = defaults
      .filter((d) => !journalSet.has(d.name.toLowerCase()))
      .slice(0, 40)
      .map((d) => d.name);

    return {
      basic: [...journalNames].sort((a, b) => a.localeCompare(b)),
      extended: defaultsNotUsed,
      isNew: false,
    };
  }

  // With query: search both journal-used and COA defaults
  const seen = new Set<string>();
  const basicResults: string[] = [];

  for (const name of journalNames) {
    const lc = name.toLowerCase();
    if (lc.includes(q) && !seen.has(lc)) {
      seen.add(lc);
      basicResults.push(name);
    }
  }

  const extendedResults: string[] = [];
  for (const { name } of defaults) {
    const lc = name.toLowerCase();
    if (lc.includes(q) && !seen.has(lc)) {
      seen.add(lc);
      extendedResults.push(name);
    }
  }

  const rank = (s: string) => {
    const lc = s.toLowerCase();
    if (lc === q) return 0;
    if (lc.startsWith(q)) return 1;
    return 2;
  };
  basicResults.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  extendedResults.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const isNew = basicResults.length === 0 && extendedResults.length === 0;

  return { basic: basicResults, extended: extendedResults, isNew };
}

/** Flat sorted list of all account names (company-used + COA defaults). Used for export. */
export function getAccountNames(companyId: string): string[] {
  const names = new Map<string, string>();
  for (const { name } of getAllDefaultAccounts()) {
    if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  if (isBrowser() && companyId) {
    for (const entry of listJournalEntries(companyId)) {
      for (const line of entry.lines) {
        const t = (line.account_name || '').trim();
        if (t && !names.has(t.toLowerCase())) names.set(t.toLowerCase(), t);
      }
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Get classification for a known account name.
 * Returns meta if the account is in COA defaults; null otherwise.
 */
export function getMasterAccount(name: string) {
  const group = classifyDefaultAccount(name);
  if (!group) return null;
  return {
    primaryGroup: group.primaryGroup,
    subGroup: group.scheduleIII,
    nature: group.nature,
  };
}

/** @deprecated kept for backward compatibility */
export function isKnownAccount(_name: string): boolean {
  return false;
}
