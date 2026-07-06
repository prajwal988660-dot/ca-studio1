/**
 * Bulk Workspace — Core Service (Phase B)
 *
 * ALL operations (manual UI + AI tools) call these functions.
 * Money is rounded to 2 decimal places; never use float arithmetic on totals.
 *
 * When suspense transactions are allocated to a ledger, real double-entry
 * journal entries are created in offlineDb so they appear in the Journal,
 * Cash Book, Ledger, Trial Balance, P&L, and Balance Sheet.
 */

import type {
  SuspenseSearchResult,
  MoveToLedgerResult,
  LedgerBalanceResult,
  CandidateKeyword,
  BulkProgress,
  AllocatedBy,
  LedgerEntrySource,
  LedgerSide,
  BulkLedgerAccount,
  BulkLedgerEntry,
  SuspenseTransaction,
} from './types';
import {
  getSuspenseTransactions,
  updateSuspenseRows,
  getLedgerAccounts,
  getLedgerAccount,
  upsertLedgerAccount,
  getLedgerEntries,
  bulkInsertLedgerEntries,
  insertLedgerEntry,
  appendAuditLog,
} from './bulkDb';
import { createJournalEntry, listBookPeriods, listJournalEntries, registerCustomAccount } from '@/lib/offlineDb';
import { generateUniqueShortEntryCode } from '@/lib/utils/entryCodeGenerator';
import { emitJournalDataChanged } from '@/lib/journalSync';
import type { JournalLine } from '@/types/journal';

// ── Utility ───────────────────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Double-entry journal helper ───────────────────────────────────────────────

/**
 * Map bulk ledger accountType to journal nature.
 * Bulk uses: 'asset' | 'liability' | 'capital' | 'revenue' | 'expense'
 */
function toJournalNature(accountType: string): JournalLine['nature'] {
  const map: Record<string, JournalLine['nature']> = {
    asset: 'asset',
    liability: 'liability',
    capital: 'capital',
    revenue: 'revenue',
    expense: 'expense',
  };
  return map[accountType.toLowerCase()] ?? 'expense';
}

/**
 * Create real double-entry journal entries in offlineDb for allocated transactions.
 *
 * For each suspense row:
 *   PAYMENT (money out) → DR allocated ledger, CR Bank Account
 *   RECEIPT (money in)  → DR Bank Account, CR allocated ledger
 */
function createJournalEntriesForAllocation(
  companyId: string,
  transactions: SuspenseTransaction[],
  ledgerAccount: BulkLedgerAccount,
  bankAccountName: string,
): void {
  if (transactions.length === 0) return;

  const periods = listBookPeriods(companyId);
  const bookPeriod = periods.length > 0
    ? periods[periods.length - 1].period_label
    : 'FY 2024-25';

  const allocNature = toJournalNature(ledgerAccount.accountType);

  // Pre-load existing entry codes ONCE (avoid re-reading localStorage per transaction)
  const existingCodes = new Set(
    listJournalEntries(companyId).map((e) => e.entry_code),
  );

  for (const txn of transactions) {
    const amount = round2(txn.amount);
    if (amount === 0) continue;

    const entryCode = generateUniqueShortEntryCode(existingCodes);
    existingCodes.add(entryCode);

    const entryDate = txn.txnDate ?? new Date().toISOString().split('T')[0];
    const isPayment = txn.direction === 'PAYMENT';
    const voucherType = isPayment ? 'PMT' : 'RCT';

    const narration = (txn.narration || '').trim() || `Bank txn ${entryDate}`;

    const lines: JournalLine[] = isPayment
      ? [
          // Payment: DR allocated ledger, CR bank
          { account_name: ledgerAccount.name, account_group: ledgerAccount.group, nature: allocNature, debit: amount, credit: 0 },
          { account_name: bankAccountName, account_group: 'Bank Accounts', nature: 'asset' as const, debit: 0, credit: amount },
        ]
      : [
          // Receipt: DR bank, CR allocated ledger
          { account_name: bankAccountName, account_group: 'Bank Accounts', nature: 'asset' as const, debit: amount, credit: 0 },
          { account_name: ledgerAccount.name, account_group: ledgerAccount.group, nature: allocNature, debit: 0, credit: amount },
        ];

    try {
      createJournalEntry({
        company_id: companyId,
        entry_code: entryCode,
        entry_date: entryDate,
        voucher_type: voucherType,
        lines,
        narration,
        book_period: bookPeriod,
      });
    } catch (err) {
      console.error('Failed to create journal entry during allocation:', err);
    }
  }

  emitJournalDataChanged(companyId);
}

/**
 * Resolve the bank account name for a company from the bulk ledger accounts.
 * Falls back to 'Bank Account' if no explicit bank account exists.
 */
function resolveBankAccountName(companyId: string): string {
  const accounts = getLedgerAccounts(companyId);
  const bank = accounts.find(
    (a) => a.group === 'Bank Accounts' || a.name.toLowerCase().includes('bank account'),
  );
  return bank?.name ?? 'Bank Account';
}

// ── Search suspense ───────────────────────────────────────────────────────────

/**
 * Case-insensitive keyword search on narrations.
 * Returns ONLY aggregates + capped sample — never the full row set.
 */
export function searchSuspense(
  companyId: string,
  fy: string,
  keyword: string,
  sampleLimit = 5,
): SuspenseSearchResult {
  const all = getSuspenseTransactions(companyId, fy).filter(
    (t) => t.status === 'UNALLOCATED',
  );
  const kw = keyword.toLowerCase();
  const matches = all.filter((t) => t.narration.toLowerCase().includes(kw));

  const directionBreakdown = { RECEIPT: 0, PAYMENT: 0 };
  let totalAmount = 0;
  const narrationsSeen = new Set<string>();
  const sampleNarrations: string[] = [];

  for (const t of matches) {
    totalAmount = round2(totalAmount + t.amount);
    directionBreakdown[t.direction] = round2(
      directionBreakdown[t.direction] + t.amount,
    );
    if (sampleNarrations.length < sampleLimit && !narrationsSeen.has(t.narration)) {
      narrationsSeen.add(t.narration);
      sampleNarrations.push(t.narration);
    }
  }

  return {
    keyword,
    count: matches.length,
    totalAmount,
    directionBreakdown,
    sampleNarrations,
  };
}

// ── Move to ledger ────────────────────────────────────────────────────────────

/**
 * The core operation — bulk-moves all UNALLOCATED suspense rows matching
 * `keyword` (or specific `suspenseIds`) into a ledger.
 *
 * PAYMENT → classified ledger gets DR (bank side was CR on import)
 * RECEIPT → classified ledger gets CR (bank side was DR on import)
 */
export function moveToLedger(
  companyId: string,
  fy: string,
  keyword: string,
  ledgerAccountId: string,
  actor: AllocatedBy,
): MoveToLedgerResult {
  const account = getLedgerAccount(companyId, ledgerAccountId);
  if (!account) {
    throw new Error(`Ledger account not found: ${ledgerAccountId}`);
  }

  const all = getSuspenseTransactions(companyId, fy);
  const kw = keyword.toLowerCase();
  const toMove = all.filter(
    (t) =>
      t.status === 'UNALLOCATED' &&
      t.narration.toLowerCase().includes(kw),
  );

  if (toMove.length === 0) {
    return { movedCount: 0, remainingCount: all.filter((t) => t.status === 'UNALLOCATED').length, ledgerName: account.name };
  }

  const now = new Date().toISOString();

  // Build ledger entries: one per row
  const entries: BulkLedgerEntry[] = toMove.map((t) => ({
    id: crypto.randomUUID(),
    companyId,
    fy,
    ledgerAccountId,
    txnDate: t.txnDate,
    narration: t.narration,
    referenceNo: t.referenceNo,
    amount: t.amount,
    // PAYMENT = money going out → classified ledger is DR (expense/asset)
    // RECEIPT = money coming in → classified ledger is CR (liability/income)
    side: (t.direction === 'PAYMENT' ? 'DR' : 'CR') as LedgerSide,
    source: 'BULK_CSV',
    suspenseId: t.id,
    batchId: t.batchId,
    allocatedBy: actor,
    allocationKeyword: keyword,
    createdAt: now,
  }));

  bulkInsertLedgerEntries(companyId, entries);

  // Mark suspense rows ALLOCATED
  updateSuspenseRows(
    companyId,
    toMove.map((t) => t.id),
    {
      status: 'ALLOCATED',
      allocatedLedgerId: ledgerAccountId,
      allocatedBy: actor,
      allocationKeyword: keyword,
      allocatedAt: now,
    },
  );

  // Create real double-entry journal entries in the main books
  const bankName = resolveBankAccountName(companyId);
  createJournalEntriesForAllocation(companyId, toMove, account, bankName);

  // Audit
  appendAuditLog(companyId, {
    actor,
    action: 'move_to_ledger',
    detail: {
      keyword,
      ledgerAccountId,
      ledgerName: account.name,
      movedCount: toMove.length,
      fy,
    },
  });

  const remaining = getSuspenseTransactions(companyId, fy).filter(
    (t) => t.status === 'UNALLOCATED',
  ).length;

  return { movedCount: toMove.length, remainingCount: remaining, ledgerName: account.name };
}

/**
 * Move specific suspense IDs (for manual row selection).
 */
export function moveIdsToLedger(
  companyId: string,
  fy: string,
  suspenseIds: string[],
  ledgerAccountId: string,
  actor: AllocatedBy,
): MoveToLedgerResult {
  const account = getLedgerAccount(companyId, ledgerAccountId);
  if (!account) throw new Error(`Ledger account not found: ${ledgerAccountId}`);

  const idSet = new Set(suspenseIds);
  const all = getSuspenseTransactions(companyId, fy);
  const toMove = all.filter(
    (t) => idSet.has(t.id) && t.status === 'UNALLOCATED',
  );

  if (toMove.length === 0) {
    return { movedCount: 0, remainingCount: all.filter((t) => t.status === 'UNALLOCATED').length, ledgerName: account.name };
  }

  const now = new Date().toISOString();
  const entries: BulkLedgerEntry[] = toMove.map((t) => ({
    id: crypto.randomUUID(),
    companyId,
    fy,
    ledgerAccountId,
    txnDate: t.txnDate,
    narration: t.narration,
    referenceNo: t.referenceNo,
    amount: t.amount,
    side: (t.direction === 'PAYMENT' ? 'DR' : 'CR') as LedgerSide,
    source: 'BULK_CSV',
    suspenseId: t.id,
    batchId: t.batchId,
    allocatedBy: actor,
    allocationKeyword: null,
    createdAt: now,
  }));

  bulkInsertLedgerEntries(companyId, entries);
  updateSuspenseRows(companyId, toMove.map((t) => t.id), {
    status: 'ALLOCATED',
    allocatedLedgerId: ledgerAccountId,
    allocatedBy: actor,
    allocatedAt: now,
  });

  // Create real double-entry journal entries in the main books
  const bankName = resolveBankAccountName(companyId);
  createJournalEntriesForAllocation(companyId, toMove, account, bankName);

  appendAuditLog(companyId, {
    actor,
    action: 'move_ids_to_ledger',
    detail: { suspenseIds, ledgerAccountId, ledgerName: account.name, movedCount: toMove.length, fy },
  });

  const remaining = getSuspenseTransactions(companyId, fy).filter(
    (t) => t.status === 'UNALLOCATED',
  ).length;
  return { movedCount: toMove.length, remainingCount: remaining, ledgerName: account.name };
}

// ── Create ledger ─────────────────────────────────────────────────────────────

/**
 * Create a ledger account in the COA if it doesn't already exist.
 */
export function createLedger(
  companyId: string,
  name: string,
  group: string,
  accountType: string,
  actor: AllocatedBy,
): { ledgerAccount: BulkLedgerAccount; created: boolean } {
  const existing = getLedgerAccounts(companyId).find(
    (a) => a.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    return { ledgerAccount: existing, created: false };
  }

  const ledgerAccount = upsertLedgerAccount(companyId, {
    name,
    group,
    accountType,
    createdBy: actor,
  });

  // Sync to offlineDb so the account appears in the AccountComboBox (manual JE dialog)
  registerCustomAccount(companyId, name, group, accountType);

  appendAuditLog(companyId, {
    actor,
    action: 'create_ledger',
    detail: { name, group, accountType },
  });

  return { ledgerAccount, created: true };
}

// ── Add other side ────────────────────────────────────────────────────────────

/**
 * Feed the missing side for a party ledger.
 * e.g. purchases from GST portal posted to the CR side of a creditor.
 */
export function addOtherSide(
  companyId: string,
  fy: string,
  ledgerAccountId: string,
  amount: number,
  side: LedgerSide,
  source: LedgerEntrySource,
  narration: string,
  actor: AllocatedBy,
): LedgerBalanceResult {
  const account = getLedgerAccount(companyId, ledgerAccountId);
  if (!account) throw new Error(`Ledger account not found: ${ledgerAccountId}`);

  const entry: BulkLedgerEntry = {
    id: crypto.randomUUID(),
    companyId,
    fy,
    ledgerAccountId,
    txnDate: new Date().toISOString().split('T')[0],
    narration,
    referenceNo: '',
    amount: round2(amount),
    side,
    source,
    suspenseId: null,
    batchId: null,
    allocatedBy: actor,
    allocationKeyword: null,
    createdAt: new Date().toISOString(),
  };

  insertLedgerEntry(companyId, entry);

  appendAuditLog(companyId, {
    actor,
    action: 'add_other_side',
    detail: { ledgerAccountId, ledgerName: account.name, amount, side, source, fy },
  });

  return getLedgerBalance(companyId, fy, ledgerAccountId);
}

// ── Get ledger balance ────────────────────────────────────────────────────────

/**
 * Compute net balance for a ledger account: SUM(DR) - SUM(CR).
 */
export function getLedgerBalance(
  companyId: string,
  fy: string,
  ledgerAccountId: string,
): LedgerBalanceResult {
  const account = getLedgerAccount(companyId, ledgerAccountId);
  if (!account) throw new Error(`Ledger account not found: ${ledgerAccountId}`);

  const entries = getLedgerEntries(companyId, fy, ledgerAccountId);
  let drTotal = 0;
  let crTotal = 0;

  for (const e of entries) {
    if (e.side === 'DR') drTotal = round2(drTotal + e.amount);
    else crTotal = round2(crTotal + e.amount);
  }

  const rawBalance = round2(drTotal - crTotal);
  const side: LedgerSide = rawBalance >= 0 ? 'DR' : 'CR';
  const balance = Math.abs(rawBalance);

  return { ledgerAccountId, ledgerName: account.name, drTotal, crTotal, balance, side };
}

// ── Extract candidate keywords ────────────────────────────────────────────────

/**
 * Scan ALL unallocated suspense narrations, tokenise, count frequency and sum
 * amount per token. Returns top_n ranked by (count DESC, totalAmount DESC).
 *
 * Noise tokens filtered: common NEFT/RTGS/UPI prefixes, short tokens, numbers.
 */
export function extractCandidateKeywords(
  companyId: string,
  fy: string,
  topN = 50,
): CandidateKeyword[] {
  const all = getSuspenseTransactions(companyId, fy).filter(
    (t) => t.status === 'UNALLOCATED',
  );

  // Seed noise list: tokens we know are not meaningful keywords
  const NOISE = new Set([
    'neft', 'rtgs', 'upi', 'imps', 'nach', 'ecs', 'cheque', 'chq',
    'ref', 'no', 'dt', 'to', 'by', 'from', 'for', 'the', 'and', 'or',
    'a', 'an', 'in', 'of', 'on', 'at', 'via', 'per', 'ltd', 'pvt',
    'bank', 'transfer', 'credit', 'debit', 'payment', 'receipt', 'charges',
  ]);

  const freq: Map<string, { count: number; totalAmount: number }> = new Map();

  for (const t of all) {
    // Tokenise: lower, strip special chars, split on whitespace + delimiters
    const tokens = t.narration
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((tok) => tok.length >= 3 && !NOISE.has(tok) && !/^\d+$/.test(tok));

    // Deduplicate tokens per narration row (avoid inflating count)
    const unique = [...new Set(tokens)];
    for (const tok of unique) {
      const existing = freq.get(tok) ?? { count: 0, totalAmount: 0 };
      freq.set(tok, {
        count: existing.count + 1,
        totalAmount: round2(existing.totalAmount + t.amount),
      });
    }
  }

  return [...freq.entries()]
    .map(([keyword, { count, totalAmount }]) => ({ keyword, count, totalAmount }))
    .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
    .slice(0, topN);
}

// ── Progress ──────────────────────────────────────────────────────────────────

export function getProgress(companyId: string, fy: string): BulkProgress {
  const all = getSuspenseTransactions(companyId, fy);
  const totalRows = all.length;
  const allocated = all.filter((t) => t.status === 'ALLOCATED').length;
  const remaining = all.filter((t) => t.status === 'UNALLOCATED').length;
  const completionPct =
    totalRows === 0 ? 0 : Math.round((allocated / totalRows) * 100);

  const nextKeywords = extractCandidateKeywords(companyId, fy, 5);

  return { totalRows, allocated, remaining, completionPct, nextKeywords };
}

// ── Residual ──────────────────────────────────────────────────────────────────

export function getResidual(
  companyId: string,
  fy: string,
  limit = 50,
): import('./types').SuspenseTransaction[] {
  return getSuspenseTransactions(companyId, fy)
    .filter((t) => t.status === 'UNALLOCATED')
    .slice(0, limit);
}

// ── Flag rows ─────────────────────────────────────────────────────────────────

export function flagSuspenseRows(
  companyId: string,
  suspenseIds: string[],
): void {
  updateSuspenseRows(companyId, suspenseIds, { status: 'FLAGGED' });
  appendAuditLog(companyId, {
    actor: 'MANUAL',
    action: 'flag_rows',
    detail: { suspenseIds, count: suspenseIds.length },
  });
}

// ── Unallocate rows ───────────────────────────────────────────────────────────

/**
 * Reset ALLOCATED rows back to UNALLOCATED.
 * Note: This does not delete the corresponding JEs — they remain in the books
 * until manually removed. Call this from the workspace UI when user wants to re-classify.
 */
export function unallocateRows(companyId: string, ids: string[]): void {
  updateSuspenseRows(companyId, ids, {
    status: 'UNALLOCATED',
    allocatedLedgerId: null,
    allocatedBy: null,
    allocationKeyword: null,
    allocatedAt: null,
  });
  appendAuditLog(companyId, {
    actor: 'MANUAL',
    action: 'unallocate_rows',
    detail: { ids, count: ids.length },
  });
  emitJournalDataChanged(companyId);
}

// ── Get all ledger accounts ───────────────────────────────────────────────────

export function listLedgerAccounts(companyId: string): BulkLedgerAccount[] {
  return getLedgerAccounts(companyId);
}
