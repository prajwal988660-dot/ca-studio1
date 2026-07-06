import type { EntityConfig } from './index';

export const individualConfig: EntityConfig = {
  entityType: 'individual',
  label: 'Individual (Salaried / Non-Business)',
  itrForm: 'ITR-1/ITR-2',
  taxAuditForm: 'none',
  nav: {
    // ── Primary Books ── not applicable for pure individuals
    journal: false,
    cashBook: false,
    pettyCash: false,
    purchaseRegister: 'never',
    salesRegister: 'never',
    purchaseReturns: 'never',
    salesReturns: 'never',
    billsReceivable: false,
    billsPayable: false,

    // ── Ledgers ── not applicable
    ledger: false,
    debtors: false,
    creditors: false,
    fixedAssets: false,
    investments: 'never',
    loans: 'never',

    // ── Financial Statements ── not applicable
    trialBalance: false,
    tradingAccount: 'never',
    profitLoss: true,
    profitLossFormat: 'schedule_iii',
    plAppropriation: false,
    balanceSheet: false,
    balanceSheetFormat: 'traditional',
    cashFlowStatement: 'never',
    fundsFlowStatement: 'never',
    incomeExpenditure: false,
    receiptsPayments: false,

    // ── Special Accounts ── not applicable
    partnersCapital: false,
    revaluation: false,
    realisation: false,
    shareCapital: false,
    debentures: 'never',
    kartaCapital: false,
    fundAccounts: false,
    incompleteRecords: false,
    memberRegister: false,

    // ── Tax & Compliance ── CORE FEATURES for individuals
    gst: 'never',
    incomeTax: true,         // ITR-1 / ITR-2 iframe utility
    tdsRegister: 'always',   // Form 16, TDS credit tracking
    tcsRegister: 'never',
    advanceTax: true,        // Advance tax instalment tracker
    deferredTax: false,
    brs: false,
    depreciation: false,

    // ── Audit ── not applicable for salaried individuals
    audit: 'never',
    auditForm: 'none',

    // ── Inventory / Payroll ──
    inventory: 'never',
    payroll: 'never',

    // ── Misc ──
    segmentReporting: false,
    relatedParty: false,
    relatedPartyByLevel: false,
    accountingPolicies: false,
    accountingPoliciesByLevel: false,
    asChecklist: false,
    asChecklistByLevel: false,
    fcra: 'never',
    applicationCheck: false,
    form10b: false,
    llpForms: false,

    // ── Analysis ──
    ratioAnalysis: false,
    bsNotes: false,
    taxComputation: true,
    msmeDisclosure: false,
    contingentLiabilities: false,

    // ── Company-only ── not applicable
    directorsReport: false,
    caro: false,
    costRecords: 'never',
    formN: false,

    // ── Vouchers ── not applicable
    salesInvoice: false,
    purchaseVoucher: false,
    paymentVoucher: false,
    receiptVoucher: false,
    debitNote: false,
    creditNote: false,

    bankImport: false,
  },
};
