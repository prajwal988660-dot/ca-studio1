/**
 * CARP Tools — Journal Entry CRUD (6 tools)
 */

import {
  listJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  type JournalEntryFilters,
} from '@/lib/offlineDb';
import type { JournalEntry } from '@/types/journal';
import { JOURNAL_LINE_ARRAY_SCHEMA } from '@/lib/carp/geminiSchema';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

function generateEntryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ── Declarations ── */

export const journalDeclarations: ToolDeclaration[] = [
  {
    name: 'create_journal_entry',
    description: 'Create a new journal entry with debit and credit lines. Ensures the entry is balanced (total debits = total credits). Use standard Indian accounting terminology.',
    parameters: {
      type: 'object',
      properties: {
        entry_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        voucher_type: { type: 'string', enum: ['JRN', 'SLS', 'PUR', 'RCT', 'PMT', 'CNT'], description: 'Voucher type code' },
        lines: JOURNAL_LINE_ARRAY_SCHEMA,
        narration: { type: 'string', description: 'Description/narration for the entry' },
      },
      required: ['entry_date', 'voucher_type', 'lines', 'narration'],
    },
  },
  {
    name: 'list_journal_entries',
    description: 'List journal entries for the current company, optionally filtered by date range, voucher type, or entry code.',
    parameters: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
        voucher_type: { type: 'string', description: 'Filter by voucher type (JRN, SLS, PUR, etc.)' },
        entry_code: { type: 'string', description: 'Search by entry code' },
      },
    },
  },
  {
    name: 'update_journal_entry',
    description: 'Update an existing journal entry by its ID. Can update date, narration, lines, or voucher type.',
    parameters: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'ID of the journal entry to update' },
        updates: {
          type: 'object',
          properties: {
            entry_date: { type: 'string' },
            voucher_type: { type: 'string' },
            narration: { type: 'string' },
            lines: JOURNAL_LINE_ARRAY_SCHEMA,
          },
        },
      },
      required: ['entry_id', 'updates'],
    },
  },
  {
    name: 'delete_journal_entry',
    description: 'Delete a journal entry by its ID. This is irreversible.',
    parameters: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'ID of the journal entry to delete' },
      },
      required: ['entry_id'],
    },
  },
  {
    name: 'search_entries',
    description: 'Full-text search journal entries by narration or account name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text (matches narration or account names)' },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'bulk_create_entries',
    description: 'Create multiple journal entries at once. Each entry must be balanced. Returns all created entries.',
    parameters: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entry_date: { type: 'string' },
              voucher_type: { type: 'string' },
              narration: { type: 'string' },
              lines: JOURNAL_LINE_ARRAY_SCHEMA,
            },
            required: ['entry_date', 'voucher_type', 'lines', 'narration'],
          },
          description: 'Array of journal entry objects',
        },
      },
      required: ['entries'],
    },
  },
  {
    name: 'bulk_delete_entries',
    description: 'Delete multiple journal entries at once by their IDs. ALWAYS use this instead of delete_journal_entry when deleting more than one entry. Much faster — single call removes all.',
    parameters: {
      type: 'object',
      properties: {
        entry_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of journal entry IDs to delete',
        },
      },
      required: ['entry_ids'],
    },
  },
  {
    name: 'bulk_update_entries',
    description: 'Update multiple journal entries at once. ALWAYS use this instead of update_journal_entry when updating more than one entry.',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entry_id: { type: 'string', description: 'ID of the entry to update' },
              entry_date: { type: 'string' },
              voucher_type: { type: 'string' },
              narration: { type: 'string' },
              lines: JOURNAL_LINE_ARRAY_SCHEMA,
            },
            required: ['entry_id'],
          },
          description: 'Array of update objects, each with entry_id and fields to change',
        },
      },
      required: ['updates'],
    },
  },
];

/* ── Executors ── */

function getCurrentBookPeriod(): string {
  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${fyYear}-${String(fyYear + 1).slice(2)}`;
}

function mapLines(rawLines: Array<Record<string, unknown>>): JournalEntry['lines'] {
  return rawLines.map((l) => ({
    account_name: l.account_name as string,
    account_group: l.account_group as string,
    nature: (l.account_nature || l.nature || 'asset') as 'asset' | 'liability' | 'capital' | 'revenue' | 'expense',
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
  }));
}

export const journalExecutors: Record<string, ToolExecutor> = {
  create_journal_entry(args, companyId) {
    const entry = createJournalEntry({
      company_id: companyId,
      entry_code: generateEntryCode(),
      entry_date: args.entry_date as string,
      voucher_type: args.voucher_type as string,
      lines: mapLines(args.lines as Array<Record<string, unknown>>),
      narration: args.narration as string,
      book_period: getCurrentBookPeriod(),
    });
    return { success: true, data: entry, displayType: 'journal_entry' };
  },

  list_journal_entries(args, companyId) {
    const filters: JournalEntryFilters = {};
    if (args.from_date) filters.fromDate = args.from_date as string;
    if (args.to_date) filters.toDate = args.to_date as string;
    if (args.voucher_type) filters.voucherType = args.voucher_type as string;
    if (args.entry_code) filters.entryCode = args.entry_code as string;
    const entries = listJournalEntries(companyId, filters);
    return { success: true, data: { count: entries.length, entries: entries.slice(0, 50) }, displayType: 'table' };
  },

  update_journal_entry(args) {
    const updated = updateJournalEntry(args.entry_id as string, args.updates as Partial<JournalEntry>);
    if (!updated) return { success: false, error: 'Journal entry not found' };
    return { success: true, data: updated, displayType: 'journal_entry' };
  },

  delete_journal_entry(args) {
    deleteJournalEntry(args.entry_id as string);
    return { success: true, data: { deleted: args.entry_id }, displayType: 'confirmation' };
  },

  search_entries(args, companyId) {
    const allEntries = listJournalEntries(companyId, {
      fromDate: args.from_date as string | undefined,
      toDate: args.to_date as string | undefined,
    });
    const query = (args.query as string).toLowerCase();
    const results = allEntries.filter(
      (e) =>
        e.narration?.toLowerCase().includes(query) ||
        e.lines.some((l) => l.account_name.toLowerCase().includes(query)),
    );
    return { success: true, data: { count: results.length, entries: results.slice(0, 30) }, displayType: 'table' };
  },

  bulk_create_entries(args, companyId) {
    const bulkEntries = args.entries as Array<Record<string, unknown>>;
    const created: unknown[] = [];
    const bookPeriod = getCurrentBookPeriod();
    for (const e of bulkEntries) {
      const entry = createJournalEntry({
        company_id: companyId,
        entry_code: generateEntryCode(),
        entry_date: e.entry_date as string,
        voucher_type: e.voucher_type as string,
        lines: mapLines(e.lines as Array<Record<string, unknown>>),
        narration: e.narration as string,
        book_period: bookPeriod,
      });
      created.push(entry);
    }
    return { success: true, data: { created: created.length, entries: created }, displayType: 'table' };
  },

  bulk_delete_entries(args) {
    const ids = args.entry_ids as string[];
    ids.forEach((id) => deleteJournalEntry(id));
    return { success: true, data: { deleted: ids.length, entry_ids: ids }, displayType: 'confirmation' };
  },

  bulk_update_entries(args) {
    const updates = args.updates as Array<Record<string, unknown>>;
    const results: unknown[] = [];
    for (const u of updates) {
      const { entry_id, ...fields } = u;
      const updated = updateJournalEntry(entry_id as string, fields as Partial<JournalEntry>);
      if (updated) results.push(updated);
    }
    return { success: true, data: { updated: results.length, entries: results }, displayType: 'table' };
  },
};
