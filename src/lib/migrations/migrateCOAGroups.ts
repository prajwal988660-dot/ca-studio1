/**
 * One-time migration: reclassify every journal line with account_group 'Auto'
 * (or other legacy group strings) using the VAARTA Master COA.
 *
 * Runs on app load, per company. Guard key prevents re-runs.
 */

import { classifyAccount } from '@/lib/masterCOA';
import { keywordClassify } from '@/lib/ai/keywordClassifier';

const MIGRATE_KEY_PREFIX = 'ca_coa_migrate_v2_';
const TRADE_PAYABLES_FIX_KEY_PREFIX = 'ca_coa_trade_payables_fix_';

const LEGACY_GROUPS = new Set([
  'Auto',
  'Purchases',
  'Sales',
  'Purchase Returns',
  'Sales Returns',
  'Stock-in-Trade',
  'Opening Stock',
  'Closing Stock',
  'Direct Expenses',
  'Indirect Expenses',
  'Office Expenses',
  'Fixed Assets',
  'Investments',
  'Sundry Debtors',
  'Sundry Creditors',
  'Duties & Taxes',
  'Cash & Bank',
  'Capital Account',
  'Loans',
  'Current Assets',
  'Current Liabilities',
  'Depreciation',
]);

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function runCOAMigration(companyId: string): void {
  if (!isBrowser() || !companyId) return;

  const STORAGE_KEY = 'ca_offline_db_v2';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let db: { journal_entries?: Array<{
    id: string;
    company_id: string;
    lines: Array<{ account_name: string; account_group: string; nature: string; [k: string]: unknown }>;
    [k: string]: unknown;
  }> };
  try {
    db = JSON.parse(raw);
  } catch {
    return;
  }
  if (!db.journal_entries || !Array.isArray(db.journal_entries)) return;

  const key = MIGRATE_KEY_PREFIX + companyId;
  if (!window.localStorage.getItem(key)) {
    let changed = false;
    for (const entry of db.journal_entries) {
      if (entry.company_id !== companyId || !entry.lines?.length) continue;
      for (const line of entry.lines) {
        if (!LEGACY_GROUPS.has(line.account_group)) continue;
        const cls = classifyAccount(line.account_name);
        if (cls) {
          line.account_group = cls.subGroup;
          line.nature = cls.nature;
          changed = true;
        } else {
          const kw = keywordClassify(line.account_name);
          if (kw) {
            line.account_group = kw.subGroup;
            line.nature = kw.nature;
            changed = true;
          }
        }
      }
    }
    if (changed) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.localStorage.setItem(key, new Date().toISOString());
  }

  // Reclassify Trade Payables / Sundry Creditors from Other Current Liabilities (runs once per company)
  const fixKey = TRADE_PAYABLES_FIX_KEY_PREFIX + companyId;
  if (window.localStorage.getItem(fixKey)) return;

  let fixChanged = false;
  for (const entry of db.journal_entries) {
    if (entry.company_id !== companyId || !entry.lines?.length) continue;
    for (const line of entry.lines) {
      if (line.account_group !== 'Other Current Liabilities') continue;
      const cls = classifyAccount(line.account_name);
      if (cls?.subGroup === 'Trade Payables') {
        line.account_group = 'Trade Payables';
        line.nature = cls.nature;
        fixChanged = true;
      }
    }
  }
  if (fixChanged) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.localStorage.setItem(fixKey, new Date().toISOString());
}
