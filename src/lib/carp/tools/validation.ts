/**
 * CARP Tools — Validation & Depreciation (2 tools)
 */

import { listJournalEntries } from '@/lib/offlineDb';
import { validateJournalEntry } from '@/lib/accounting/validation';
import { computeDepreciation } from '@/lib/accounting/depreciationCompute';
import type { JournalEntry } from '@/types/journal';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const validationDeclarations: ToolDeclaration[] = [
  {
    name: 'validate_entries',
    description: 'Validate journal entries for correctness: balanced totals, valid dates, proper account groups, duplicate detection. Checks a batch of entries or all entries in a date range.',
    parameters: {
      type: 'object',
      properties: {
        entry_ids: { type: 'array', items: { type: 'string' }, description: 'Specific entry IDs to validate' },
        from_date: { type: 'string', description: 'Or validate all entries in this range' },
        to_date: { type: 'string' },
      },
    },
  },
  {
    name: 'get_depreciation_schedule',
    description: 'Compute depreciation schedule for fixed assets. Supports SLM (Straight Line) and WDV (Written Down Value) methods.',
    parameters: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['SLM', 'WDV'], description: 'Depreciation method' },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
        use_it_act_rates: { type: 'boolean', description: 'Use Income Tax Act rates instead of Companies Act rates' },
      },
      required: ['method'],
    },
  },
];

/* ── Executors ── */

export const validationExecutors: Record<string, ToolExecutor> = {
  validate_entries(args, companyId) {
    let entries: JournalEntry[];

    if (args.entry_ids) {
      const allEntries = listJournalEntries(companyId);
      const ids = new Set(args.entry_ids as string[]);
      entries = allEntries.filter((e) => ids.has(e.id));
    } else {
      entries = listJournalEntries(companyId, {
        fromDate: args.from_date as string | undefined,
        toDate: args.to_date as string | undefined,
      });
    }

    const results = entries.map((entry) => {
      const validation = validateJournalEntry(entry);
      return {
        entry_id: entry.id,
        entry_code: entry.entry_code,
        entry_date: entry.entry_date,
        valid: validation.ok,
        errors: validation.ok ? [] : validation.errors,
      };
    });

    const invalid = results.filter((r) => !r.valid);
    return {
      success: true,
      data: {
        total_checked: results.length,
        valid: results.length - invalid.length,
        invalid: invalid.length,
        issues: invalid,
      },
      displayType: 'json',
    };
  },

  get_depreciation_schedule(args, companyId) {
    const entries = listJournalEntries(companyId, {
      fromDate: args.from_date as string | undefined,
      toDate: args.to_date as string | undefined,
    });

    const method = (args.method as 'SLM' | 'WDV') || 'WDV';
    const schedule = computeDepreciation(entries, method, {}, {
      useItActRates: args.use_it_act_rates as boolean | undefined,
    });

    return { success: true, data: schedule, displayType: 'table' };
  },
};
