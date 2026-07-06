/**
 * localStorage CRUD for bank import data.
 * Storage key: ca_bank_import_v1
 */

import type { BankTransaction, ImportBatch } from './types';
import { mirrorUpsert, mirrorDelete } from '@/lib/sync/cloudSync';

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
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op when offline).
  mirrorUpsert('bank_import_batches', batch);
  mirrorUpsert('bank_transactions', transactions);
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
  const updated: BankTransaction[] = [];
  for (const txn of store.transactions) {
    if (idSet.has(txn.id)) {
      txn.journalized_id = journalEntryId;
      txn.journalized_at = now;
      updated.push(txn);
    }
  }
  save(store);
  // Fire-and-forget cloud mirror of the affected transactions.
  mirrorUpsert('bank_transactions', updated);
}

export function updateNarration(txnId: string, narration: string): void {
  const store = load();
  const txn = store.transactions.find((t) => t.id === txnId);
  if (txn) {
    txn.narration_clean = narration;
    save(store);
    // Fire-and-forget cloud mirror of the edited transaction.
    mirrorUpsert('bank_transactions', txn);
  }
}

export function deleteBatch(batchId: string): void {
  const store = load();
  const removedTxnIds = store.transactions
    .filter((t) => t.import_batch === batchId)
    .map((t) => t.id);
  store.batches = store.batches.filter((b) => b.id !== batchId);
  store.transactions = store.transactions.filter((t) => t.import_batch !== batchId);
  save(store);
  // Fire-and-forget cloud mirror of the deletions (best-effort).
  mirrorDelete('bank_import_batches', batchId);
  if (removedTxnIds.length) mirrorDelete('bank_transactions', removedTxnIds);
}

export function deleteTransactions(txnIds: string[], companyId: string): void {
  const idSet = new Set(txnIds);
  const store = load();
  const companyBatchIdsBefore = store.batches
    .filter((b) => b.company_id === companyId)
    .map((b) => b.id);
  store.transactions = store.transactions.filter((t) => !idSet.has(t.id));
  // Remove batches that now have zero transactions for this company
  const activeBatchIds = new Set(
    store.transactions.filter((t) => t.company_id === companyId).map((t) => t.import_batch),
  );
  const removedBatchIds = companyBatchIdsBefore.filter((id) => !activeBatchIds.has(id));
  store.batches = store.batches.filter(
    (b) => b.company_id !== companyId || activeBatchIds.has(b.id),
  );
  save(store);
  // Fire-and-forget cloud mirror of the deletions (best-effort).
  if (txnIds.length) mirrorDelete('bank_transactions', txnIds);
  if (removedBatchIds.length) mirrorDelete('bank_import_batches', removedBatchIds);
}
