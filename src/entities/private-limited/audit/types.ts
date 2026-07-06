/**
 * Private Limited — Audit Report Types
 *
 * Auditor's Report, CARO 2020, Tax Audit (3CA/3CD),
 * Board's Report (Sec 134), Directors' Responsibility Statement.
 */

/* ═══════════════════════════════════════════════════════
   Auditor's Report — SA 700/705/706
   ═══════════════════════════════════════════════════════ */

export type AuditOpinion =
  | 'unmodified'
  | 'qualified'
  | 'adverse'
  | 'disclaimer';

export type EOMType = 'emphasis_of_matter' | 'other_matter';

export interface AuditorReport {
  companyId: string;
  financialYear: string;
  /** Opinion type */
  opinion: AuditOpinion;
  /** Basis for qualification/adverse/disclaimer */
  basisForModification?: string;
  /** Key Audit Matters (if applicable) */
  keyAuditMatters?: KeyAuditMatter[];
  /** EOM / Other Matter paragraphs */
  emphasisParagraphs?: Array<{
    type: EOMType;
    matter: string;
    noteReference?: string;
  }>;
  /** Going concern */
  goingConcernIssue: boolean;
  goingConcernDetails?: string;
  /** Report on IFCoFR — Sec 143(3)(i) */
  ifcReport: {
    opinion: 'effective' | 'material_weakness' | 'significant_deficiency';
    details?: string;
  };
  /** CARO applicability */
  caroApplicable: boolean;
  caroExemptionReason?: string;
  /** Report on other legal requirements — Sec 143(3) */
  otherRequirements: {
    properBooksKept: boolean;
    bsAgreeWithBooks: boolean;
    complianceWithAS: boolean;
    directorDisqualified: boolean;
    disqualifiedDirectors?: string[];
    adequateIFC: boolean;
    reportOnDirectorsRemuneration?: boolean;
  };
  /** Auditor details */
  auditorName: string;
  firmName: string;
  firmRegNo: string;
  membershipNo: string;
  udin: string;
  reportDate: string;
  place: string;
}

export interface KeyAuditMatter {
  title: string;
  description: string;
  auditResponse: string;
  noteReference?: string;
}

/* ═══════════════════════════════════════════════════════
   CARO 2020 — 21 Clauses
   ═══════════════════════════════════════════════════════ */

export interface CAROReport {
  companyId: string;
  financialYear: string;
  /** Whether CARO is applicable */
  applicable: boolean;
  exemptionReason?: 'small_company' | 'opc' | 'section_8' | 'other';
  clauses: CAROClause[];
}

export interface CAROClause {
  clauseNumber: string;
  subClause?: string;
  title: string;
  /** Whether this clause is applicable to the company */
  applicable: boolean;
  /** Reporting: favorable / unfavorable / not_applicable */
  reporting: 'favorable' | 'unfavorable' | 'not_applicable';
  /** Auditor's comment */
  comment: string;
  /** Quantification if unfavorable */
  amount?: number;
}

/** All 21 clause titles for CARO 2020 */
export const CARO_CLAUSE_TITLES: Array<{ clause: string; title: string }> = [
  { clause: '(i)', title: 'Property, Plant and Equipment & Intangible Assets' },
  { clause: '(ii)', title: 'Inventory' },
  { clause: '(iii)', title: 'Loans, Investments, Guarantees & Security (Sec 185/186)' },
  { clause: '(iv)', title: 'Compliance with Sec 185 & 186' },
  { clause: '(v)', title: 'Deposits (Sec 73-76)' },
  { clause: '(vi)', title: 'Cost Records (Sec 148)' },
  { clause: '(vii)', title: 'Statutory Dues (PF, ESI, IT, GST, Customs, Cess)' },
  { clause: '(viii)', title: 'Undisclosed Income' },
  { clause: '(ix)', title: 'Default in Repayment of Loans/Borrowings' },
  { clause: '(x)', title: 'Application of IPO/FPO/Preferential Allotment/Private Placement Monies' },
  { clause: '(xi)', title: 'Fraud Reported / Noticed' },
  { clause: '(xii)', title: 'Nidhi Company Compliance' },
  { clause: '(xiii)', title: 'Related Party Transactions (Sec 177/188)' },
  { clause: '(xiv)', title: 'Internal Audit System' },
  { clause: '(xv)', title: 'Non-Cash Transactions with Directors/Related Persons' },
  { clause: '(xvi)', title: 'Registration under Sec 45-IA of RBI Act' },
  { clause: '(xvii)', title: 'Cash Losses' },
  { clause: '(xviii)', title: 'Resignation of Statutory Auditor' },
  { clause: '(xix)', title: 'Financial Ratios / Ageing Analysis' },
  { clause: '(xx)', title: 'Unspent CSR Amount' },
  { clause: '(xxi)', title: 'Consolidated Reporting on Subsidiaries/Associates/JVs' },
];

/* ═══════════════════════════════════════════════════════
   Tax Audit — 3CA/3CD (44 Clauses)
   ═══════════════════════════════════════════════════════ */

export interface TaxAuditReport {
  companyId: string;
  financialYear: string;
  assessmentYear: string;
  /** Form 3CA (for companies) or 3CB (for non-companies) */
  form: '3CA' | '3CB';
  /** Auditor details */
  auditorName: string;
  membershipNo: string;
  udin: string;
  reportDate: string;
  /** Clauses of Form 3CD — key clause data */
  clauses: TaxAuditClause[];
}

export interface TaxAuditClause {
  clauseNumber: number;
  subClause?: string;
  title: string;
  applicable: boolean;
  response: string;
  /** Quantification where applicable */
  amount?: number;
  /** Sub-items / details */
  details?: Record<string, unknown>;
}

/** Key clause titles for 3CD (selected important ones) */
export const TAX_AUDIT_KEY_CLAUSES: Array<{ clause: number; title: string }> = [
  { clause: 1, title: 'Name of assessee' },
  { clause: 2, title: 'Address' },
  { clause: 3, title: 'PAN' },
  { clause: 4, title: 'Whether accounts audited earlier' },
  { clause: 5, title: 'Nature of business / profession' },
  { clause: 8, title: 'Previous year dates' },
  { clause: 9, title: 'Books of account maintained' },
  { clause: 10, title: 'Whether books at registered office' },
  { clause: 11, title: 'Method of accounting' },
  { clause: 12, title: 'Method of valuation of closing stock' },
  { clause: 13, title: 'Capital account changes' },
  { clause: 14, title: 'Depreciation as per IT Act' },
  { clause: 16, title: 'Amounts debited to P&L — Sec 28 to 44DB' },
  { clause: 17, title: 'Amounts inadmissible u/s 40' },
  { clause: 18, title: 'Particulars of payments to specified persons u/s 40A(2)(b)' },
  { clause: 19, title: 'Amounts deemed as profits u/s 32AC, 33AB, etc.' },
  { clause: 20, title: 'Deemed income under sections' },
  { clause: 21, title: 'Deductions admissible — Chapter VI-A / Sec 10AA' },
  { clause: 22, title: 'MSME payments — Sec 43B(h)' },
  { clause: 26, title: 'TDS/TCS compliance' },
  { clause: 27, title: 'Tax liability on presumptive basis' },
  { clause: 29, title: 'Quantitative details of principal items' },
  { clause: 30, title: 'Goods/Services Tax details' },
  { clause: 31, title: 'Computation of total income' },
  { clause: 34, title: 'Disallowance under Sec 14A' },
  { clause: 36, title: 'Receipt of amount in excess of limit — Sec 269ST' },
  { clause: 40, title: 'Turnover as per GST returns vs books' },
  { clause: 42, title: 'GAAR provisions applicable' },
  { clause: 44, title: 'Breakup of total expenditure (indigenous vs imported)' },
];

/* ═══════════════════════════════════════════════════════
   Board's Report — Sec 134
   ═══════════════════════════════════════════════════════ */

export interface BoardReport {
  companyId: string;
  financialYear: string;
  /** Financial highlights */
  financialHighlights: {
    revenue: number;
    previousYearRevenue: number;
    netProfit: number;
    previousYearNetProfit: number;
    eps: number;
    previousYearEps: number;
  };
  /** State of affairs */
  stateOfAffairs: string;
  /** Dividend */
  dividendRecommended: boolean;
  dividendPerShare?: number;
  dividendTotalAmount?: number;
  /** Transfer to reserves */
  transferToReserves: number;
  /** Material changes after BS date */
  materialChanges?: string;
  /** Directors' details */
  directorsReport: {
    appointmentsDuringYear: string[];
    cessationsDuringYear: string[];
    directorsResponsibilityStatement: DirectorsResponsibilityStatement;
  };
  /** Number of Board/committee meetings */
  meetingsHeld: {
    boardMeetings: number;
    auditCommittee?: number;
    nominationCommittee?: number;
    csrCommittee?: number;
  };
  /** Auditor appointment */
  auditorDetails: {
    name: string;
    appointmentYear: string;
    expiresAt: string;
    qualifications?: string;
  };
  /** Related party transactions */
  rptDisclosure: string;
  /** Risk management */
  riskManagement: string;
  /** Internal financial controls */
  ifcAdequacy: string;
  /** Conservation of energy, technology absorption, forex */
  conservationOfEnergy?: string;
  technologyAbsorption?: string;
  forexEarningsAndOutgo?: {
    earnings: number;
    outgo: number;
  };
  /** Employee remuneration details (if applicable) */
  employeeRemuneration?: string;
  /** CSR details (if applicable) */
  csrDetails?: {
    averageNetProfit3Years: number;
    csrObligation: number;
    csrSpent: number;
    unspentAmount: number;
    activities: string[];
  };
  /** Secretarial audit remarks (if applicable) */
  secretarialAuditRemarks?: string;
  /** Annual return extract reference */
  annualReturnReference: string;
  /** Deposits */
  depositDetails: string;
  /** Significant and material orders */
  significantOrders?: string;
  /** Acknowledgments */
  acknowledgments: string;
}

/* ═══════════════════════════════════════════════════════
   Directors' Responsibility Statement — Sec 134(5)
   ═══════════════════════════════════════════════════════ */

export interface DirectorsResponsibilityStatement {
  /** (a) Applicable accounting standards followed */
  accountingStandardsFollowed: boolean;
  accountingStandardsDetails: string;
  /** (b) Accounting policies selected and applied consistently */
  consistentPolicies: boolean;
  policiesDetails: string;
  /** (c) Judgments and estimates are reasonable and prudent */
  reasonableEstimates: boolean;
  estimatesDetails: string;
  /** (d) Going concern basis followed */
  goingConcernBasis: boolean;
  goingConcernDetails: string;
  /** (e) Internal financial controls in place and operating effectively */
  ifcInPlace: boolean;
  ifcDetails: string;
  /** (f) Proper systems to ensure compliance with all laws */
  complianceSystems: boolean;
  complianceDetails: string;
}

/** Standard DRS text per Sec 134(5) */
export const DRS_STANDARD_TEXT: DirectorsResponsibilityStatement = {
  accountingStandardsFollowed: true,
  accountingStandardsDetails:
    'In the preparation of the annual accounts, the applicable accounting standards have been followed and there are no material departures.',
  consistentPolicies: true,
  policiesDetails:
    'The Directors have selected such accounting policies and applied them consistently and made judgments and estimates that are reasonable and prudent so as to give a true and fair view of the state of affairs of the company at the end of the financial year and of the profit of the company for that period.',
  reasonableEstimates: true,
  estimatesDetails:
    'The Directors have taken proper and sufficient care for the maintenance of adequate accounting records in accordance with the provisions of the Act for safeguarding the assets of the company and for preventing and detecting fraud and other irregularities.',
  goingConcernBasis: true,
  goingConcernDetails:
    'The Directors have prepared the annual accounts on a going concern basis.',
  ifcInPlace: true,
  ifcDetails:
    'The Directors have laid down internal financial controls to be followed by the company and that such internal financial controls are adequate and were operating effectively.',
  complianceSystems: true,
  complianceDetails:
    'The Directors have devised proper systems to ensure compliance with the provisions of all applicable laws and that such systems were adequate and operating effectively.',
};
