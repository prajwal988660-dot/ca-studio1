/**
 * Private Limited — Audit Report Templates
 *
 * Default CARO 2020 clause structure and Tax Audit 3CD clause structure
 * that the AI agent can populate and the CA reviews/signs off.
 */

import type { CAROClause, TaxAuditClause } from './types';
import { CARO_CLAUSE_TITLES, TAX_AUDIT_KEY_CLAUSES } from './types';

/* ═══════════════════════════════════════════════════════
   CARO 2020 — Default clause template (all 21)
   ═══════════════════════════════════════════════════════ */

export function buildCAROTemplate(): CAROClause[] {
  return CARO_CLAUSE_TITLES.map((c) => ({
    clauseNumber: c.clause,
    title: c.title,
    applicable: true,
    reporting: 'favorable' as const,
    comment: '',
  }));
}

/* ═══════════════════════════════════════════════════════
   CARO 2020 — Detailed sub-clause structure
   ═══════════════════════════════════════════════════════ */

export const CARO_DETAILED_STRUCTURE: Array<{
  clause: string;
  subClauses: Array<{ sub: string; description: string }>;
}> = [
  {
    clause: '(i)',
    subClauses: [
      { sub: '(a)', description: 'Whether company maintains proper records of PPE with quantitative details and situation' },
      { sub: '(b)', description: 'Whether PPE have been physically verified at reasonable intervals' },
      { sub: '(c)', description: 'Whether title deeds of immovable properties are in the name of the company' },
      { sub: '(d)', description: 'Whether company has revalued PPE/intangibles — revaluation based on registered valuer' },
      { sub: '(e)', description: 'Whether any proceedings under Benami Transactions Act pending or initiated' },
    ],
  },
  {
    clause: '(ii)',
    subClauses: [
      { sub: '(a)', description: 'Whether physical verification of inventory conducted at reasonable intervals' },
      { sub: '(b)', description: 'Whether company has been sanctioned working capital limits >₹5Cr — quarterly returns/statements filed with banks' },
    ],
  },
  {
    clause: '(iii)',
    subClauses: [
      { sub: '(a)', description: 'Whether company has made investments/provided guarantee/security/granted loans — aggregate during year and balance outstanding' },
      { sub: '(b)', description: 'Whether investments/guarantee/security/loans granted are not prejudicial to company interest' },
      { sub: '(c)', description: 'Whether terms and conditions of loans granted are not prejudicial' },
      { sub: '(d)', description: 'Whether amounts due are received on time / steps taken for recovery' },
      { sub: '(e)', description: 'Whether loans granted have fallen due and renewed/extended — percentage of aggregate loans' },
      { sub: '(f)', description: 'Whether company has granted loans repayable on demand or without specifying repayment terms' },
    ],
  },
  {
    clause: '(vii)',
    subClauses: [
      { sub: '(a)', description: 'Whether company is regular in depositing undisputed statutory dues (PF, ESI, IT, GST, duty, cess)' },
      { sub: '(b)', description: 'Whether dues referred to above not deposited on account of any dispute — details with forum and amounts' },
    ],
  },
  {
    clause: '(ix)',
    subClauses: [
      { sub: '(a)', description: 'Whether company has defaulted in repayment of loans/borrowings to financial institution/bank/government/debenture holders' },
      { sub: '(b)', description: 'Whether company declared wilful defaulter by any bank/FI/other lender' },
      { sub: '(c)', description: 'Whether term loans applied for purpose obtained' },
      { sub: '(d)', description: 'Whether funds raised on short-term basis utilized for long-term purposes' },
      { sub: '(e)', description: 'Whether company has taken funds from any entity to meet obligations of subsidiaries/associates/JVs' },
      { sub: '(f)', description: 'Whether company has raised loans on pledge of securities of subsidiaries/associates/JVs' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   Tax Audit 3CD — Default clause template
   ═══════════════════════════════════════════════════════ */

export function buildTaxAuditTemplate(assessmentYear: string): TaxAuditClause[] {
  return TAX_AUDIT_KEY_CLAUSES.map((c) => ({
    clauseNumber: c.clause,
    title: c.title,
    applicable: true,
    response: '',
  }));
}

/* ═══════════════════════════════════════════════════════
   Tax Audit — Critical clauses with detailed sub-items
   ═══════════════════════════════════════════════════════ */

export const TAX_AUDIT_CRITICAL_DETAILS: Array<{
  clause: number;
  details: string[];
}> = [
  {
    clause: 14,
    details: [
      'Block-wise depreciation as per IT Act',
      'WDV at beginning of year',
      'Additions during year (with date put to use — before/after Oct for 50% rule)',
      'Deletions during year (sale price, WDV, profit/loss on disposal)',
      'Depreciation allowable',
      'WDV at end of year',
      'Additional depreciation u/s 32(1)(iia) if applicable',
    ],
  },
  {
    clause: 17,
    details: [
      '(a) Amounts inadmissible u/s 40(a)(i) — payment to non-resident without TDS',
      '(b) Amounts inadmissible u/s 40(a)(ia) — payment to resident without TDS',
      '(c) Amounts inadmissible u/s 40(a)(ib) — equalization levy not deducted',
      '(d) Provision for gratuity not allowable u/s 40A(7)',
      '(e) Payment in cash exceeding ₹10,000 u/s 40A(3)',
      '(f) Provision for bad debts u/s 36(1)(viia) for non-banking company',
    ],
  },
  {
    clause: 22,
    details: [
      'Amount due to micro & small enterprises outstanding >45 days',
      'Interest due under MSMED Act Sec 16',
      'Interest paid along with amount of payment made beyond appointed day',
      'Interest due and payable for the period of delay',
      'Interest accrued and remaining unpaid at end of year',
      'Disallowance u/s 43B(h) for amount remaining unpaid beyond time limit',
    ],
  },
  {
    clause: 26,
    details: [
      '(a) TDS deducted — whether deposited on time',
      '(b) TCS collected — whether deposited on time',
      '(c) Details of TDS/TCS not deposited by due date',
      '(d) Details of non-deduction of TDS with reasons',
    ],
  },
  {
    clause: 30,
    details: [
      '(a) GST registration details',
      '(b) Total value of supply — taxable, exempt, nil-rated, non-GST',
      '(c) ITC claimed, reversed, net ITC',
      '(d) Output tax liability — paid, due',
      '(e) Pending returns as on date of signing',
    ],
  },
  {
    clause: 40,
    details: [
      'Turnover as per books of account (net of GST)',
      'Turnover as per GST returns filed',
      'Reasons for difference, if any',
    ],
  },
  {
    clause: 44,
    details: [
      'Expenditure in foreign currency',
      'Expenditure on indigenous purchases',
      'Total expenditure — breakup by category',
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   Working Paper Templates — DPT-3 & MSME-1
   ═══════════════════════════════════════════════════════ */

export interface DPT3WorkingPaper {
  category: string;
  items: Array<{
    lenderName: string;
    natureOfDeposit: string;
    openingBalance: number;
    receivedDuringYear: number;
    repaidDuringYear: number;
    closingBalance: number;
    dueDate?: string;
    interestRate?: number;
    isExempted: boolean;
    exemptionBasis?: string;
  }>;
}

export const DPT3_CATEGORIES = [
  'Deposits from public',
  'Deposits from members',
  'Loans from directors',
  'Loans from relatives of directors',
  'Inter-corporate deposits received',
  'Commercial paper',
  'Debentures (privately placed)',
  'Other exempted deposits',
] as const;

export interface MSME1WorkingPaper {
  vendorName: string;
  udyamRegistrationNumber: string;
  msmeCategory: 'micro' | 'small';
  outstandingInvoices: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    amountPaid: number;
    amountOutstanding: number;
    paymentDueDate: string;
    actualPaymentDate?: string;
    daysDelayed: number;
    interestCalculation: {
      principal: number;
      rate: number; // 3x bank rate as per MSMED Act Sec 16
      days: number;
      interestAmount: number;
    };
  }>;
}
