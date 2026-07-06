/**
 * Private Limited — Classification Types
 *
 * These types define the classification output that drives
 * every downstream obligation: statements, audits, filings.
 */

/** Size class per Sec 2(85) */
export type SizeClass = 'small' | 'large';

/** Accounting framework */
export type AccountingFramework = 'indian_gaap' | 'ind_as';

/** Schedule III division derived from framework */
export type ScheduleIIIDivision = 'division_i' | 'division_ii';

/** Statute version for section references */
export type StatuteVersion = 'it_act_1961' | 'it_act_2025';

/** Individual audit trigger flags */
export interface AuditFlags {
  /** Always true for companies */
  statutoryAudit: true;
  /** Sec 44AB / §63 — turnover-based */
  taxAudit: boolean;
  /** CARO 2020 — not small, not OPC, crosses limits */
  caro: boolean;
  /** Sec 143(3)(i) — IFC operating-effectiveness (exempt for small/OPC) */
  ifcReporting: boolean;
  /** Sec 148 — industry + turnover based */
  costAudit: boolean;
  /** Sec 204 — paid-up ≥ 50Cr or turnover ≥ 250Cr */
  secretarialAudit: boolean;
  /** Sec 138 — turnover ≥ 200Cr or borrowings ≥ 100Cr */
  internalAudit: boolean;
  /** Sec 135 — net worth/turnover/profit thresholds */
  csrApplicable: boolean;
  /** AOC-4 XBRL — paid-up ≥ 5Cr or turnover ≥ 100Cr */
  xbrlFiling: boolean;
}

/** Filing obligations derived from classification */
export interface FilingObligations {
  /** MGT-7 (full) vs MGT-7A (small company) */
  annualReturnForm: 'MGT-7' | 'MGT-7A';
  /** Cash Flow Statement required (exempt for small) */
  cashFlowRequired: boolean;
  /** Statement of Changes in Equity (Ind AS only) */
  soceRequired: boolean;
  /** Abridged Board's Report available (small company) */
  abridgedBoardReport: boolean;
  /** CARO annexure required in auditor's report */
  caroAnnexure: boolean;
  /** IFCoFR paragraph required in auditor's report */
  ifcParagraph: boolean;
  /** ITR form */
  itrForm: 'ITR-6';
  /** Tax audit form */
  taxAuditForm: '3CA' | '3CB';
}

/** Complete classification result for a company-FY pair */
export interface Classification {
  /** Financial year this classification applies to */
  financialYear: string;
  /** Date classification was computed */
  computedAt: string;

  // ── Section 0.1 ──
  sizeClass: SizeClass;
  smallCompanyExclusion: SmallCompanyExclusion | null;

  // ── Section 0.2 ──
  accountingFramework: AccountingFramework;
  scheduleIIIDivision: ScheduleIIIDivision;

  // ── Section 0.3 ──
  auditFlags: AuditFlags;

  // ── Derived ──
  filingObligations: FilingObligations;
}

/** Reason a company is excluded from small-company status */
export interface SmallCompanyExclusion {
  reason:
    | 'public_company'
    | 'holding_company'
    | 'subsidiary_company'
    | 'section8_company'
    | 'governed_by_special_act'
    | 'capital_exceeds'
    | 'turnover_exceeds';
  detail: string;
}

/** Input data needed to run classification */
export interface ClassificationInput {
  /** Financial year end date (e.g. '2026-03-31') */
  fyEndDate: string;

  // ── Size class inputs ──
  paidUpShareCapital: number;
  /** Turnover from preceding FY P&L */
  turnover: number;
  /** Is this a holding company? */
  isHolding: boolean;
  /** Is this a subsidiary? */
  isSubsidiary: boolean;

  // ── Ind AS inputs ──
  netWorth: number;
  /** Is listed or in process of listing? */
  isListed: boolean;
  /** Is holding/subsidiary/associate/JV of an Ind AS company? */
  isIndAsRelated: boolean;
  /** Was Ind AS adopted in a prior year? (once in, always in) */
  priorIndAsAdoption: boolean;

  // ── Audit trigger inputs ──
  /** Cash receipts as % of total receipts */
  cashReceiptsPercent: number;
  /** Cash payments as % of total payments */
  cashPaymentsPercent: number;
  /** Is specified industry for cost audit? */
  isCostAuditIndustry: boolean;
  /** Outstanding borrowings (peak during FY) */
  peakBorrowings: number;
  /** Reserves at year-end */
  reserves: number;
  /** Revenue for CARO test */
  revenue: number;
  /** Net profit average of preceding 3 FYs (for CSR) */
  avgNetProfit3Years: number;
  /** Has company already filed XBRL once? */
  priorXbrlFiling: boolean;
}
