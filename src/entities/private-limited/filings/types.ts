/**
 * Private Limited — Filing Engine Types
 *
 * Tracks ROC/MCA, IT, GST filings and their statuses.
 * Links to compliance calendar items for due-date awareness.
 */

/* ═══════════════════════════════════════════════════════
   Filing Status & Tracking
   ═══════════════════════════════════════════════════════ */

export type FilingCategory = 'roc' | 'income_tax' | 'gst' | 'tds_tcs' | 'other';

export type FilingProgress =
  | 'not_started'
  | 'data_collection'
  | 'draft_prepared'
  | 'review_pending'
  | 'approved'
  | 'filed'
  | 'acknowledged';

export interface FilingTracker {
  id: string;
  companyId: string;
  financialYear: string;
  formCode: string;
  formName: string;
  category: FilingCategory;
  dueDate: string;
  /** Actual filing date */
  filedDate?: string;
  /** SRN / acknowledgment number */
  acknowledgmentNumber?: string;
  progress: FilingProgress;
  /** Preparer and reviewer */
  preparedBy?: string;
  reviewedBy?: string;
  /** Linked compliance calendar item ID */
  complianceItemId?: string;
  /** Supporting documents attached */
  attachments?: FilingAttachment[];
  /** Late fee computed if filed after due date */
  lateFee?: number;
  notes?: string;
}

export interface FilingAttachment {
  name: string;
  type: 'pdf' | 'xml' | 'json' | 'excel' | 'other';
  /** base64 or URL */
  content: string;
  uploadedAt: string;
}

/* ═══════════════════════════════════════════════════════
   AOC-4 — Financial Statement Filing
   ═══════════════════════════════════════════════════════ */

export interface AOC4Data {
  companyId: string;
  financialYear: string;
  /** Whether XBRL filing */
  isXBRL: boolean;
  /** BS, P&L, Cash Flow statement hashes/references */
  balanceSheetDate: string;
  turnover: number;
  netProfitOrLoss: number;
  /** Auditor details */
  auditorName: string;
  auditorFirmRegNo: string;
  auditorReportDate: string;
  /** Whether auditor report has qualifications */
  hasQualifications: boolean;
  qualificationDetails?: string;
  /** AGM date on which accounts were adopted */
  agmDate: string;
  /** Board resolution date for adoption */
  boardResolutionDate: string;
}

/* ═══════════════════════════════════════════════════════
   MGT-7 / MGT-7A — Annual Return
   ═══════════════════════════════════════════════════════ */

export interface MGT7Data {
  companyId: string;
  financialYear: string;
  /** MGT-7 or MGT-7A (small company) */
  formType: 'MGT-7' | 'MGT-7A';
  /** Registered office address */
  registeredOffice: string;
  /** Principal business activities (NIC codes) */
  principalActivities: Array<{
    nicCode: string;
    description: string;
    percentageTurnover: number;
  }>;
  /** Share capital */
  authorisedCapital: number;
  paidUpCapital: number;
  /** Shareholding pattern */
  totalMembers: number;
  /** Indebtedness */
  totalIndebtedness: number;
  /** Details of directors/KMP changes */
  directorChanges: Array<{
    din: string;
    name: string;
    changeType: 'appointment' | 'cessation' | 'change_in_designation';
    changeDate: string;
  }>;
  /** Meetings held */
  boardMeetingsHeld: number;
  agmDate: string;
  egmDates?: string[];
  /** Matters requiring special resolution */
  specialResolutions?: string[];
  /** PCS certification (if applicable) */
  pcsCertified: boolean;
  pcsName?: string;
  pcsCPNumber?: string;
}

/* ═══════════════════════════════════════════════════════
   DPT-3 — Return of Deposits / Outstanding Loans
   ═══════════════════════════════════════════════════════ */

export interface DPT3Data {
  companyId: string;
  financialYear: string;
  /** Whether company has accepted deposits */
  hasDeposits: boolean;
  /** Total deposits outstanding */
  depositsOutstanding: number;
  /** Loans from directors (exempted deposits) */
  loansFromDirectors: number;
  /** Loans from relatives of directors */
  loansFromRelatives: number;
  /** Inter-corporate loans received */
  interCorporateLoans: number;
  /** Debentures outstanding */
  debenturesOutstanding: number;
  /** Any default in repayment */
  hasDefault: boolean;
  defaultDetails?: string;
}

/* ═══════════════════════════════════════════════════════
   MSME-1 — Outstanding dues to MSME vendors
   ═══════════════════════════════════════════════════════ */

export interface MSME1Data {
  companyId: string;
  halfYear: 'H1' | 'H2';
  financialYear: string;
  /** Period covered */
  periodFrom: string;
  periodTo: string;
  /** Outstanding dues > 45 days */
  overdueEntries: Array<{
    vendorName: string;
    vendorUdyamNumber: string;
    msmeCategory: 'micro' | 'small';
    invoiceDate: string;
    invoiceAmount: number;
    amountOutstanding: number;
    daysOverdue: number;
    interestDue: number;
    interestPaid: number;
  }>;
  /** Totals */
  totalOutstanding: number;
  totalInterestDue: number;
  totalInterestPaid: number;
  /** NIL return */
  isNilReturn: boolean;
}

/* ═══════════════════════════════════════════════════════
   ITR-6 Tracker
   ═══════════════════════════════════════════════════════ */

export interface ITR6Tracker {
  companyId: string;
  assessmentYear: string;
  financialYear: string;
  /** Gross total income */
  grossTotalIncome: number;
  /** Total deductions (Chapter VI-A) */
  totalDeductions: number;
  /** Total income */
  totalIncome: number;
  /** Tax on total income */
  taxOnIncome: number;
  /** Surcharge */
  surcharge: number;
  /** Cess */
  cess: number;
  /** Total tax liability */
  totalTaxLiability: number;
  /** TDS/TCS/advance tax credits */
  tdsCredit: number;
  tcsCredit: number;
  advanceTaxPaid: number;
  selfAssessmentTax: number;
  /** Refund or tax payable */
  refundOrPayable: number;
  /** Whether under old or new regime */
  taxRegime: 'old' | 'new';
  /** MAT applicable */
  matApplicable: boolean;
  matLiability?: number;
  /** Transfer pricing applicable */
  transferPricingApplicable: boolean;
}

/* ═══════════════════════════════════════════════════════
   GSTR-9 Annual Return Tracker
   ═══════════════════════════════════════════════════════ */

export interface GSTR9Tracker {
  companyId: string;
  financialYear: string;
  /** Outward supplies */
  totalOutwardSupplies: number;
  /** Inward supplies */
  totalInwardSupplies: number;
  /** ITC claimed */
  totalITCClaimed: number;
  /** ITC reversed */
  totalITCReversed: number;
  /** Tax paid */
  totalTaxPaid: number;
  /** Late fee */
  lateFee: number;
  /** HSN-wise summary */
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
  }>;
  /** Reconciliation with books */
  booksReconciliation: {
    turnoverAsPerBooks: number;
    turnoverAsPerGSTR9: number;
    difference: number;
    reasonForDifference?: string;
  };
}
