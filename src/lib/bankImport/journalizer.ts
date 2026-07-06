/**
 * Convert selected bank transactions into journal entries.
 * Creates one 2-line JE per transaction: bank account + contra account.
 *
 * Each transaction becomes its own individual journal entry so they
 * appear separately in Journal, Ledger, Trial Balance, P&L, BS, etc.
 */

import type { BankTransaction } from './types';
import type { VoucherType } from '@/types/journal';
import { createJournalEntry, listJournalEntries } from '@/lib/offlineDb';
import { generateUniqueShortEntryCode } from '@/lib/utils/entryCodeGenerator';
import { emitJournalDataChanged } from '@/lib/journalSync';
import { markJournalized } from './bankImportDb';

export interface JournalizeOptions {
  transactions: BankTransaction[];
  companyId: string;
  bankAccountName: string;
  bankAccountMeta: { primaryGroup: string; subGroup: string; nature: string };
  contraAccountName: string;
  contraAccountMeta: { primaryGroup: string; subGroup: string; nature: string };
  voucherType: VoucherType;
  bookPeriod: string;
}

export interface JournalizeResult {
  created: number;
  errors: string[];
}

const CHUNK_SIZE = 20;

function sleep0(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function journalizeTransactions(
  opts: JournalizeOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<JournalizeResult> {
  const { transactions, companyId, bankAccountName, bankAccountMeta, contraAccountName, contraAccountMeta, voucherType, bookPeriod } = opts;

  let created = 0;
  const errors: string[] = [];

  // Pre-load existing entry codes ONCE (avoid re-reading localStorage per transaction)
  const existingCodes = new Set(
    listJournalEntries(companyId).map((e) => e.entry_code),
  );

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    try {
      const isPayment = txn.debit > 0;
      const amount = isPayment ? txn.debit : txn.credit;

      // Skip zero-amount transactions
      if (amount === 0) {
        errors.push(`Row ${txn.date} "${txn.narration_raw.slice(0, 30)}": Zero amount, skipped.`);
        continue;
      }

      // Generate unique code without re-reading all entries each time
      const entryCode = generateUniqueShortEntryCode(existingCodes);
      existingCodes.add(entryCode);

      // Determine voucher type based on direction if auto
      const vt: VoucherType = voucherType !== 'JRN'
        ? voucherType
        : (isPayment ? 'PMT' : 'RCT');

      const lines = isPayment
        ? [
            // Payment: contra DR, bank CR
            { account_name: contraAccountName, account_group: contraAccountMeta.subGroup, nature: contraAccountMeta.nature as 'asset' | 'liability' | 'capital' | 'revenue' | 'expense', debit: amount, credit: 0 },
            { account_name: bankAccountName, account_group: bankAccountMeta.subGroup, nature: bankAccountMeta.nature as 'asset' | 'liability' | 'capital' | 'revenue' | 'expense', debit: 0, credit: amount },
          ]
        : [
            // Receipt: bank DR, contra CR
            { account_name: bankAccountName, account_group: bankAccountMeta.subGroup, nature: bankAccountMeta.nature as 'asset' | 'liability' | 'capital' | 'revenue' | 'expense', debit: amount, credit: 0 },
            { account_name: contraAccountName, account_group: contraAccountMeta.subGroup, nature: contraAccountMeta.nature as 'asset' | 'liability' | 'capital' | 'revenue' | 'expense', debit: 0, credit: amount },
          ];

      const narration = (txn.narration_clean || txn.narration_raw || '').trim() || `Bank txn ${txn.date}`;

      const entry = createJournalEntry({
        company_id: companyId,
        entry_code: entryCode,
        entry_date: txn.date,
        voucher_type: vt,
        lines,
        narration,
        book_period: bookPeriod,
      });

      markJournalized([txn.id], entry.id);
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${txn.date} "${txn.narration_raw.slice(0, 30)}": ${msg}`);
    }

    // Yield to UI every chunk
    if ((i + 1) % CHUNK_SIZE === 0) {
      onProgress?.(i + 1, transactions.length);
      await sleep0();
    }
  }

  onProgress?.(transactions.length, transactions.length);

  // Single sync event at end — triggers refresh in Journal, Ledger, etc.
  emitJournalDataChanged(companyId);

  return { created, errors };
}
