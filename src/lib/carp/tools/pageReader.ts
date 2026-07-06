/**
 * CARP Tools — Universal Page Reader (1 tool)
 *
 * Reads data from any of the 67+ pages in the app by computing
 * the relevant data for that page. This gives the AI "eyes" on
 * everything the user can see.
 */

import { listJournalEntries, getCompany, getEntityData, listEntityData, countJournalEntries, getJournalDateRange } from '@/lib/offlineDb';
import { computeTrialBalance } from '@/lib/accounting/trialBalanceCompute';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeBalanceSheet } from '@/lib/accounting/balanceSheetCompute';
import { computePurchaseRegister, computeSalesRegister } from '@/lib/accounting/registers';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const pageReaderDeclarations: ToolDeclaration[] = [
  {
    name: 'read_page_data',
    description: 'Read data from any page in the software. Specify the page name and optional date range. Returns the data the user would see on that page. Pages: journal, trial-balance, profit-loss, balance-sheet, trading-account, cash-book, ledger, debtors, creditors, purchase-register, sales-register, expense-register, gst, tds-register, income-tax, fixed-assets, depreciation, settings, compliance, audit, registers, cash-flow, funds-flow, ratios, dashboard, etc.',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          description: 'Page name (e.g. "journal", "trial-balance", "profit-loss", "balance-sheet", "gst", "settings", "compliance", "dashboard")',
        },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
        account_name: { type: 'string', description: 'For ledger page: which account' },
      },
      required: ['page'],
    },
  },
];

/* ── Executors ── */

export const pageReaderExecutors: Record<string, ToolExecutor> = {
  read_page_data(args, companyId) {
    const page = (args.page as string).toLowerCase().replace(/\s+/g, '-');
    const fromDate = args.from_date as string | undefined;
    const toDate = args.to_date as string | undefined;

    switch (page) {
      case 'dashboard': {
        const company = getCompany(companyId);
        const count = countJournalEntries(companyId);
        const dateRange = getJournalDateRange(companyId);
        return {
          success: true,
          data: {
            company: company ? { name: company.name, entity_type: company.entity_type, gst_status: company.gst_status } : null,
            totalEntries: count,
            dateRange,
          },
          displayType: 'json',
        };
      }

      case 'journal': {
        const entries = listJournalEntries(companyId, { fromDate, toDate });
        return { success: true, data: { count: entries.length, entries: entries.slice(0, 50) }, displayType: 'table' };
      }

      case 'trial-balance': {
        const entries = listJournalEntries(companyId, { fromDate, toDate });
        if (!entries.length) return { success: true, data: { message: 'No entries' }, displayType: 'text' };
        return { success: true, data: computeTrialBalance(entries), displayType: 'table' };
      }

      case 'trading-account': {
        const entries = listJournalEntries(companyId, { fromDate, toDate });
        if (!entries.length) return { success: true, data: { message: 'No entries' }, displayType: 'text' };
        return { success: true, data: computeTradingAccount(entries), displayType: 'json' };
      }

      case 'profit-loss': {
        const entries = listJournalEntries(companyId, { fromDate, toDate });
        if (!entries.length) return { success: true, data: { message: 'No entries' }, displayType: 'text' };
        const ta = computeTradingAccount(entries);
        return { success: true, data: computeProfitLoss(entries, ta.grossProfit), displayType: 'json' };
      }

      case 'balance-sheet': {
        const entries = listJournalEntries(companyId, { fromDate, toDate });
        if (!entries.length) return { success: true, data: { message: 'No entries' }, displayType: 'text' };
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        return { success: true, data: computeBalanceSheet(entries, pl.netProfit, 'traditional'), displayType: 'json' };
      }

      case 'purchase-register': {
        const data = computePurchaseRegister(companyId, fromDate, toDate);
        return { success: true, data, displayType: 'table' };
      }

      case 'sales-register': {
        const data = computeSalesRegister(companyId, fromDate, toDate);
        return { success: true, data, displayType: 'table' };
      }

      case 'expense-register': {
        // No dedicated expense register; return purchase register as closest match
        const data = computePurchaseRegister(companyId, fromDate, toDate);
        return { success: true, data, displayType: 'table' };
      }

      case 'settings': {
        const company = getCompany(companyId);
        return { success: true, data: company, displayType: 'json' };
      }

      case 'compliance': {
        const cal = getEntityData(companyId, 'pvt_ltd', 'compliance_calendar');
        return { success: true, data: cal?.data || { message: 'No compliance calendar' }, displayType: 'json' };
      }

      case 'audit': {
        const auditData = listEntityData(companyId, 'pvt_ltd')
          .filter((d) => ['audit', 'drs', 'caro'].includes(d.section));
        const result: Record<string, unknown> = {};
        for (const d of auditData) result[d.section] = d.data;
        return { success: true, data: result, displayType: 'json' };
      }

      case 'registers': {
        const reg = getEntityData(companyId, 'pvt_ltd', 'registers');
        return { success: true, data: reg?.data || { message: 'No register data' }, displayType: 'json' };
      }

      default: {
        // Generic: try to find it in entity_data
        const record = getEntityData(companyId, 'pvt_ltd', page);
        if (record) return { success: true, data: record.data, displayType: 'json' };
        return { success: true, data: { message: `Page "${page}" data not available via this tool. Try using a specific compute tool instead.` }, displayType: 'text' };
      }
    }
  },
};
