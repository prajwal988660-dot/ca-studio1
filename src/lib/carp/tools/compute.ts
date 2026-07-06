/**
 * CARP Tools — Financial Computation (5 tools)
 *
 * compute_financial_statement is a dispatcher that routes to
 * the appropriate compute function from src/lib/accounting/.
 */

import { listJournalEntries } from '@/lib/offlineDb';
import { computeTrialBalance } from '@/lib/accounting/trialBalanceCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeBalanceSheet } from '@/lib/accounting/balanceSheetCompute';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeCashFlow } from '@/lib/accounting/cashFlowCompute';
import { computeFundsFlow } from '@/lib/accounting/fundsFlowCompute';
import { computeRatioAnalysis } from '@/lib/accounting/ratioAnalysisCompute';
import { computePLAppropriation } from '@/lib/accounting/plAppropriationCompute';
import { computeCashBook } from '@/lib/accounting/cashBookCompute';
import { computeCogsWorking } from '@/lib/accounting/cogsWorkingCompute';
import { computeGSTR1, computeGSTR3B, computeITCRegister, computeHSNSummary } from '@/lib/accounting/gstCompute';
import { computeTDSRegister } from '@/lib/accounting/tdsCompute';
import { computeTaxableIncome } from '@/lib/accounting/taxableIncome';
import { computeDebtorAgeing, computeCreditorAgeing } from '@/lib/accounting/ageingCompute';
import { PARTNER_ARRAY_SCHEMA } from '@/lib/carp/geminiSchema';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const computeDeclarations: ToolDeclaration[] = [
  {
    name: 'compute_financial_statement',
    description: 'Compute any financial statement. Dispatcher tool — specify the statement type. Supports: trial_balance, profit_loss, balance_sheet, trading_account, cash_flow, funds_flow, ratio_analysis, pl_appropriation, cash_book, cogs_working.',
    parameters: {
      type: 'object',
      properties: {
        statement_type: {
          type: 'string',
          enum: [
            'trial_balance', 'profit_loss', 'balance_sheet', 'trading_account',
            'cash_flow', 'funds_flow', 'ratio_analysis', 'pl_appropriation',
            'cash_book', 'cogs_working',
          ],
          description: 'Which financial statement to compute',
        },
        from_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        format: { type: 'string', enum: ['traditional', 'schedule_iii'], description: 'Format (for P&L and BS)' },
        partners: PARTNER_ARRAY_SCHEMA,
        cash_book_type: { type: 'string', enum: ['single', 'double', 'triple'], description: 'Cash book column type' },
      },
      required: ['statement_type', 'from_date', 'to_date'],
    },
  },
  {
    name: 'compute_gst_data',
    description: 'Compute GST-related data: gst_register, gstr1_summary, gstr3b_summary, itc_register.',
    parameters: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: ['gst_register', 'gstr1_summary', 'gstr3b_summary', 'itc_register'],
          description: 'Type of GST report',
        },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
      },
      required: ['report_type', 'from_date', 'to_date'],
    },
  },
  {
    name: 'compute_tax_data',
    description: 'Compute tax data: tds_register or taxable_income.',
    parameters: {
      type: 'object',
      properties: {
        tax_type: { type: 'string', enum: ['tds_register', 'taxable_income'], description: 'Type of tax computation' },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
        assessment_year: { type: 'number', description: 'Assessment year (e.g. 2025) for taxable income' },
      },
      required: ['tax_type'],
    },
  },
  {
    name: 'compute_ageing',
    description: 'Compute debtors or creditors ageing analysis as at a given date.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['debtors', 'creditors'], description: 'Ageing type' },
        as_at_date: { type: 'string', description: 'Date for ageing snapshot (YYYY-MM-DD)' },
        format: { type: 'string', enum: ['legacy', 'schedule_iii'] },
      },
      required: ['type', 'as_at_date'],
    },
  },
  {
    name: 'compute_ledger',
    description: 'Compute ledger for a specific account showing all transactions with running balance.',
    parameters: {
      type: 'object',
      properties: {
        account_name: { type: 'string', description: 'Name of the account' },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
      },
      required: ['account_name'],
    },
  },
];

/* ── Executors ── */

export const computeExecutors: Record<string, ToolExecutor> = {
  compute_financial_statement(args, companyId) {
    const type = args.statement_type as string;
    const entries = listJournalEntries(companyId, {
      fromDate: args.from_date as string,
      toDate: args.to_date as string,
    });

    if (entries.length === 0) {
      return { success: true, data: { message: 'No journal entries found for this period.' }, displayType: 'text' };
    }

    switch (type) {
      case 'trial_balance': {
        const tb = computeTrialBalance(entries);
        return { success: true, data: tb, displayType: 'table' };
      }
      case 'trading_account': {
        const ta = computeTradingAccount(entries);
        return { success: true, data: ta, displayType: 'json' };
      }
      case 'profit_loss': {
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        return { success: true, data: pl, displayType: 'json' };
      }
      case 'balance_sheet': {
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        const fmt = (args.format as 'traditional' | 'schedule_iii') || 'traditional';
        const bs = computeBalanceSheet(entries, pl.netProfit, fmt);
        return { success: true, data: bs, displayType: 'json' };
      }
      case 'cash_flow': {
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        const cf = computeCashFlow(entries, pl.netProfit);
        return { success: true, data: cf, displayType: 'json' };
      }
      case 'funds_flow': {
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        const ff = computeFundsFlow(entries, [], pl.netProfit);
        return { success: true, data: ff, displayType: 'json' };
      }
      case 'ratio_analysis': {
        const ratios = computeRatioAnalysis(entries);
        return { success: true, data: ratios, displayType: 'json' };
      }
      case 'pl_appropriation': {
        const ta = computeTradingAccount(entries);
        const pl = computeProfitLoss(entries, ta.grossProfit);
        const partners = (args.partners || []) as Array<Record<string, unknown>>;
        const pla = computePLAppropriation(pl.netProfit, partners as never[]);
        return { success: true, data: pla, displayType: 'json' };
      }
      case 'cash_book': {
        const cbType = (args.cash_book_type as 'single' | 'double' | 'triple') || 'double';
        const cb = computeCashBook(entries, cbType);
        return { success: true, data: cb, displayType: 'json' };
      }
      case 'cogs_working': {
        const cogs = computeCogsWorking(entries);
        return { success: true, data: cogs, displayType: 'json' };
      }
      default:
        return { success: false, error: `Unknown statement type: ${type}` };
    }
  },

  compute_gst_data(args, companyId) {
    const entries = listJournalEntries(companyId, {
      fromDate: args.from_date as string,
      toDate: args.to_date as string,
    });
    const reportType = args.report_type as string;

    switch (reportType) {
      case 'gst_register':
        return { success: true, data: computeHSNSummary(entries), displayType: 'table' };
      case 'gstr1_summary':
        return { success: true, data: computeGSTR1(entries), displayType: 'json' };
      case 'gstr3b_summary':
        return { success: true, data: computeGSTR3B(entries), displayType: 'json' };
      case 'itc_register':
        return { success: true, data: computeITCRegister(entries), displayType: 'table' };
      default:
        return { success: false, error: `Unknown GST report type: ${reportType}` };
    }
  },

  compute_tax_data(args, companyId) {
    const taxType = args.tax_type as string;

    if (taxType === 'tds_register') {
      const entries = listJournalEntries(companyId, {
        fromDate: args.from_date as string | undefined,
        toDate: args.to_date as string | undefined,
      });
      return { success: true, data: computeTDSRegister(entries), displayType: 'table' };
    }

    if (taxType === 'taxable_income') {
      const year = (args.assessment_year as number) || new Date().getFullYear();
      const result = computeTaxableIncome(companyId, year);
      return { success: true, data: result, displayType: 'json' };
    }

    return { success: false, error: `Unknown tax type: ${taxType}` };
  },

  compute_ageing(args, companyId) {
    const entries = listJournalEntries(companyId);
    const asAt = args.as_at_date as string;
    const fmt = (args.format as 'legacy' | 'schedule_iii') || 'legacy';

    if (args.type === 'debtors') {
      return { success: true, data: computeDebtorAgeing(entries, asAt, fmt), displayType: 'table' };
    }
    return { success: true, data: computeCreditorAgeing(entries, asAt, fmt), displayType: 'table' };
  },

  compute_ledger(args, companyId) {
    const entries = listJournalEntries(companyId, {
      fromDate: args.from_date as string | undefined,
      toDate: args.to_date as string | undefined,
    });

    const accountName = args.account_name as string;
    let runningBalance = 0;
    const ledgerRows = entries
      .filter((e) => e.lines.some((l) => l.account_name === accountName))
      .map((e) => {
        let debit = 0;
        let credit = 0;
        for (const l of e.lines) {
          if (l.account_name === accountName) {
            debit += l.debit;
            credit += l.credit;
          }
        }
        runningBalance += debit - credit;
        return {
          date: e.entry_date,
          entryCode: e.entry_code,
          narration: e.narration,
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          balance: Math.round(runningBalance * 100) / 100,
        };
      });

    return { success: true, data: ledgerRows, displayType: 'table' };
  },
};
