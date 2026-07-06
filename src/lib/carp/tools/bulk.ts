/**
 * CARP Bulk Tools (Phase F)
 *
 * Exposes Phase B core service functions to the Gemini AI agent.
 * The AI operates ONLY on aggregates — it never receives individual rows.
 *
 * HARD CONSTRAINTS enforced in code (not just prompt):
 * - search_suspense returns at most 5 sample narrations
 * - extract_candidate_keywords returns at most 50 keywords
 * - move_to_ledger is a bulk SQL-equivalent operation (zero per-row AI)
 * - No raw transaction arrays ever returned to the AI
 */

import type { ToolDeclaration, ToolExecutor } from './types';
import {
  searchSuspense,
  moveToLedger,
  createLedger,
  addOtherSide,
  getLedgerBalance,
  extractCandidateKeywords,
  getProgress,
  listLedgerAccounts,
} from '@/lib/bulk/bulkLedger';
import type { AllocatedBy, LedgerEntrySource, LedgerSide } from '@/lib/bulk/types';

export const bulkDeclarations: ToolDeclaration[] = [
  {
    name: 'bulk_extract_keywords',
    description:
      'Scan the bank statement and return recurring keywords ranked by impact (count × amount). ' +
      'Call this FIRST to understand which words dominate the statement. ' +
      'Returns at most 50 keywords — never individual rows.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'Company ID' },
        fy: { type: 'string', description: 'Financial year, e.g. "2024-25"' },
        top_n: {
          type: 'number',
          description: 'How many keywords to return (default 20, max 50)',
        },
      },
      required: ['company_id', 'fy'],
    },
  },
  {
    name: 'bulk_search_suspense',
    description:
      'Get count, total amount, and up to 5 sample narrations for a keyword in the unallocated suspense. ' +
      'Use this to understand what a keyword represents before asking the CA. ' +
      'NEVER returns full row sets — only aggregates + samples.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        fy: { type: 'string' },
        keyword: { type: 'string', description: 'Keyword to search for (e.g. "RAMESH", "SALARY")' },
      },
      required: ['company_id', 'fy', 'keyword'],
    },
  },
  {
    name: 'bulk_move_to_ledger',
    description:
      'After the CA confirms the reason for a keyword, bulk-move ALL matching unallocated rows to the specified ledger. ' +
      'The database does the heavy lifting — this is a single bulk operation. ' +
      'Do NOT call this without CA confirmation of the reason.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        fy: { type: 'string' },
        keyword: {
          type: 'string',
          description: 'Keyword that identifies the rows to move',
        },
        ledger_account_id: {
          type: 'string',
          description: 'ID of the target ledger account',
        },
      },
      required: ['company_id', 'fy', 'keyword', 'ledger_account_id'],
    },
  },
  {
    name: 'bulk_create_ledger',
    description:
      'Create a ledger account inline if it does not already exist. ' +
      'group must be one of the Chart of Accounts groups: e.g. "Sundry Creditors", "Sundry Debtors", ' +
      '"Indirect Expenses", "Direct Expenses", "Fixed Assets", "Other Income", etc.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        name: { type: 'string', description: 'Ledger name, e.g. "Ramesh Traders"' },
        group: { type: 'string', description: 'COA group, e.g. "Sundry Creditors"' },
        account_type: {
          type: 'string',
          description: '"asset" | "liability" | "capital" | "revenue" | "expense"',
        },
      },
      required: ['company_id', 'name', 'group', 'account_type'],
    },
  },
  {
    name: 'bulk_add_other_side',
    description:
      'Post the GST portal / cash book other-side amount to a party ledger. ' +
      'Use this after the CA provides purchases/sales data to complete the party balance. ' +
      'source: "GST_OTHER_SIDE" for GST portal data, "CASH" for cash book entries.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        fy: { type: 'string' },
        ledger_account_id: { type: 'string' },
        amount: { type: 'number' },
        side: { type: 'string', description: '"DR" or "CR"' },
        source: {
          type: 'string',
          description: '"GST_OTHER_SIDE" | "CASH" | "ADJUSTMENT"',
        },
        narration: { type: 'string', description: 'Brief description, e.g. "Purchases per GST portal FY 2024-25"' },
      },
      required: ['company_id', 'fy', 'ledger_account_id', 'amount', 'side', 'source', 'narration'],
    },
  },
  {
    name: 'bulk_get_progress',
    description:
      'Get the suspense clearing progress: total rows, allocated, remaining, and next keywords by impact. ' +
      'Call this after each batch of moves to report progress and decide what to work on next.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        fy: { type: 'string' },
      },
      required: ['company_id', 'fy'],
    },
  },
  {
    name: 'bulk_get_ledger_balance',
    description:
      'Get the current DR/CR balance for a specific ledger account. ' +
      'Use this to report the outstanding creditor/debtor balance after adding other-side entries.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        fy: { type: 'string' },
        ledger_account_id: { type: 'string' },
      },
      required: ['company_id', 'fy', 'ledger_account_id'],
    },
  },
  {
    name: 'bulk_list_ledgers',
    description: 'List all ledger accounts created for this company. Useful for finding ledger IDs.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
      },
      required: ['company_id'],
    },
  },
];

export const bulkExecutors: Record<string, ToolExecutor> = {
  bulk_extract_keywords(args) {
    const companyId = args.company_id as string;
    const fy = args.fy as string;
    const topN = Math.min(Number(args.top_n ?? 20), 50);
    const keywords = extractCandidateKeywords(companyId, fy, topN);
    return {
      success: true,
      data: {
        keywords,
        instructions:
          'Take the top keyword. Call bulk_search_suspense to see count+total+samples. ' +
          'Present it to the CA, ask the reason. On confirmation, call bulk_move_to_ledger. ' +
          'Repeat for each keyword.',
      },
    };
  },

  bulk_search_suspense(args) {
    const result = searchSuspense(
      args.company_id as string,
      args.fy as string,
      args.keyword as string,
      5, // hard cap — enforced in code, not just prompt
    );
    return { success: true, data: result };
  },

  bulk_move_to_ledger(args, companyId) {
    // Use args.company_id if present (AI call), else fall back to context companyId
    const cId = (args.company_id as string) || companyId;
    try {
      const result = moveToLedger(
        cId,
        args.fy as string,
        args.keyword as string,
        args.ledger_account_id as string,
        'AI',
      );
      return { success: true, data: result };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Move failed' };
    }
  },

  bulk_create_ledger(args, companyId) {
    const cId = (args.company_id as string) || companyId;
    const { ledgerAccount, created } = createLedger(
      cId,
      args.name as string,
      args.group as string,
      args.account_type as string,
      'AI',
    );
    return {
      success: true,
      data: {
        ledger_account_id: ledgerAccount.id,
        name: ledgerAccount.name,
        created,
        instructions: created
          ? `Ledger "${ledgerAccount.name}" created (ID: ${ledgerAccount.id}). Now call bulk_move_to_ledger with this ID.`
          : `Ledger "${ledgerAccount.name}" already exists (ID: ${ledgerAccount.id}).`,
      },
    };
  },

  bulk_add_other_side(args, companyId) {
    const cId = (args.company_id as string) || companyId;
    try {
      const result = addOtherSide(
        cId,
        args.fy as string,
        args.ledger_account_id as string,
        Number(args.amount),
        args.side as LedgerSide,
        args.source as LedgerEntrySource,
        args.narration as string,
        'AI',
      );
      return { success: true, data: result };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Add other side failed' };
    }
  },

  bulk_get_progress(args, companyId) {
    const cId = (args.company_id as string) || companyId;
    const progress = getProgress(cId, args.fy as string);
    return {
      success: true,
      data: {
        ...progress,
        summary:
          progress.completionPct === 100
            ? 'All rows cleared! Trial balance is ready to generate.'
            : `${progress.allocated} of ${progress.totalRows} rows cleared (${progress.completionPct}%). ${progress.remaining} remaining.`,
      },
    };
  },

  bulk_get_ledger_balance(args, companyId) {
    const cId = (args.company_id as string) || companyId;
    try {
      const result = getLedgerBalance(cId, args.fy as string, args.ledger_account_id as string);
      return { success: true, data: result };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Balance fetch failed' };
    }
  },

  bulk_list_ledgers(args, companyId) {
    const cId = (args.company_id as string) || companyId;
    const accounts = listLedgerAccounts(cId);
    return {
      success: true,
      data: {
        ledgers: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          group: a.group,
          accountType: a.accountType,
        })),
        count: accounts.length,
      },
    };
  },
};
