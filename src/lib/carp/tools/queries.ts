/**
 * CARP Tools — Account Queries (3 tools)
 */

import { listJournalEntries } from '@/lib/offlineDb';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const queriesDeclarations: ToolDeclaration[] = [
  {
    name: 'list_accounts',
    description: 'List all unique account names from journal entries with their groups and natures. Useful for discovering what accounts exist.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_account_balance',
    description: 'Get the closing balance of a specific account as of a date.',
    parameters: {
      type: 'object',
      properties: {
        account_name: { type: 'string', description: 'Account name to check' },
        as_of_date: { type: 'string', description: 'Balance as of this date (YYYY-MM-DD). Omit for all-time.' },
      },
      required: ['account_name'],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Get a quick financial summary: total revenue, expenses, profit/loss, assets, liabilities for a date range.',
    parameters: {
      type: 'object',
      properties: {
        from_date: { type: 'string' },
        to_date: { type: 'string' },
      },
      required: ['from_date', 'to_date'],
    },
  },
];

/* ── Executors ── */

export const queriesExecutors: Record<string, ToolExecutor> = {
  list_accounts(_args, companyId) {
    const entries = listJournalEntries(companyId);
    const accounts = new Map<string, { group: string; nature: string }>();
    for (const e of entries) {
      for (const l of e.lines) {
        if (!accounts.has(l.account_name)) {
          accounts.set(l.account_name, { group: l.account_group, nature: l.nature });
        }
      }
    }
    return {
      success: true,
      data: Array.from(accounts.entries()).map(([name, info]) => ({ name, ...info })),
      displayType: 'table',
    };
  },

  get_account_balance(args, companyId) {
    const entries = listJournalEntries(companyId, {
      toDate: args.as_of_date as string | undefined,
    });
    const accountName = args.account_name as string;
    let balance = 0;
    for (const e of entries) {
      for (const l of e.lines) {
        if (l.account_name === accountName) {
          balance += l.debit - l.credit;
        }
      }
    }
    return {
      success: true,
      data: { account: accountName, balance: Math.round(balance * 100) / 100, as_of: args.as_of_date || 'all time' },
      displayType: 'json',
    };
  },

  get_financial_summary(args, companyId) {
    const entries = listJournalEntries(companyId, {
      fromDate: args.from_date as string,
      toDate: args.to_date as string,
    });

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const e of entries) {
      for (const l of e.lines) {
        const nature = l.nature;
        if (nature === 'revenue') {
          totalRevenue += l.credit - l.debit;
        } else if (nature === 'expense') {
          totalExpenses += l.debit - l.credit;
        } else if (nature === 'asset') {
          totalAssets += l.debit - l.credit;
        } else if (nature === 'liability' || nature === 'capital') {
          totalLiabilities += l.credit - l.debit;
        }
      }
    }

    return {
      success: true,
      data: {
        period: `${args.from_date} to ${args.to_date}`,
        totalEntries: entries.length,
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        profitOrLoss: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      },
      displayType: 'json',
    };
  },
};
