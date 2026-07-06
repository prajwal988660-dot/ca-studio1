/**
 * localStorage CRUD for bank import data.
 * Storage key: ca_bank_import_v1
 */

import type { BankTransaction, ImportBatch } from './types';

const STORAGE_KEY = 'ca_bank_import_v1';

interface BankImportStore {
  batches: ImportBatch[];
  transactions: BankTransaction[];
}

function load(): BankImportStore {
  if (typeof window === 'undefined') return { batches: [], transactions: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { batches: [], transactions: [] };
    const parsed = JSON.parse(raw) as BankImportStore;
    return {
      batches: parsed.batches ?? [],
      transactions: parsed.transactions ?? [],
    };
  } catch {
    return { batches: [], transactions: [] };
  }
}

function save(store: BankImportStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveBatch(batch: ImportBatch, transactions: BankTransaction[]): void {
  const store = load();
  store.batches.push(batch);
  store.transactions.push(...transactions);
  save(store);
}

export function listBatches(companyId: string): ImportBatch[] {
  return load().batches
    .filter((b) => b.company_id === companyId)
    .sort((a, b) => b.imported_at.localeCompare(a.imported_at));
}

export function getTransactions(companyId: string, batchId?: string): BankTransaction[] {
  let all = load().transactions.filter((t) => t.company_id === companyId);
  if (batchId) all = all.filter((t) => t.import_batch === batchId);
  return all;
}

/** Returns only un-journalized transactions (pending allocation). */
export function getPendingTransactions(companyId: string): BankTransaction[] {
  return load().transactions.filter(
    (t) => t.company_id === companyId && !t.journalized_id,
  );
}

export function markJournalized(txnIds: string[], journalEntryId: string): void {
  const store = load();
  const now = new Date().toISOString();
  const idSet = new Set(txnIds);
  for (const txn of store.transactions) {
    if (idSet.has(txn.id)) {
      txn.journalized_id = journalEntryId;
      txn.journalized_at = now;
    }
  }
  save(store);
}

export function updateNarration(txnId: string, narration: string): void {
  const store = load();
  const txn = store.transactions.find((t) => t.id === txnId);
  if (txn) {
    txn.narration_clean = narration;
    save(store);
  }
}

export function deleteBatch(batchId: string): void {
  const store = load();
  store.batches = store.batches.filter((b) => b.id !== batchId);
  store.transactions = store.transactions.filter((t) => t.import_batch !== batchId);
  save(store);
}

export function deleteTransactions(txnIds: string[], companyId: string): void {
  const idSet = new Set(txnIds);
  const store = load();
  store.transactions = store.transactions.filter((t) => !idSet.has(t.id));
  // Remove batches that now have zero transactions for this company
  const activeBatchIds = new Set(
    store.transactions.filter((t) => t.company_id === companyId).map((t) => t.import_batch),
  );
  store.batches = store.batches.filter(
    (b) => b.company_id !== companyId || activeBatchIds.has(b.id),
  );
  save(store);
}
