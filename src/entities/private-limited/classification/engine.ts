/**
 * Private Limited — Classification Engine
 *
 * Computes the three classifications from Section 0 of the master spec.
 * Re-run every financial year on latest audited figures.
 *
 * Outputs drive: financial statement components, audit requirements,
 * filing forms, disclosure obligations, and compliance calendar.
 */

import {
  type Classification,
  type ClassificationInput,
  type SmallCompanyExclusion,
  type SizeClass,
  type AccountingFramework,
  type ScheduleIIIDivision,
  type AuditFlags,
  type FilingObligations,
} from './types';
import { DEFAULT_THRESHOLDS, resolveThreshold, type ThresholdSet } from './thresholds';

/* ═══════════════════════════════════════════════════════
   0.1 — Size class: "Small Company" (Sec 2(85))
   ═══════════════════════════════════════════════════════ */

function computeSizeClass(
  input: ClassificationInput,
  thresholds: ThresholdSet,
): { sizeClass: SizeClass; exclusion: SmallCompanyExclusion | null } {
  const asOf = input.fyEndDate;

  // Hard exclusions — never small regardless of size
  if (input.isHolding) {
    return {
      sizeClass: 'large',
      exclusion: { reason: 'holding_company', detail: 'Holding companies are excluded from Small Company status' },
    };
  }
  if (input.isSubsidiary) {
    return {
      sizeClass: 'large',
      exclusion: { reason: 'subsidiary_company', detail: 'Subsidiary companies are excluded from Small Company status' },
    };
  }

  // Size test — BOTH must be satisfied
  const capitalLimit = resolveThreshold(thresholds.smallCompanyCapital, asOf);
  const turnoverLimit = resolveThreshold(thresholds.smallCompanyTurnover, asOf);

  if (input.paidUpShareCapital > capitalLimit) {
    return {
      sizeClass: 'large',
      exclusion: {
        reason: 'capital_exceeds',
        detail: `Paid-up share capital (₹${fmt(input.paidUpShareCapital)}) exceeds limit (₹${fmt(capitalLimit)})`,
      },
    };
  }

  if (input.turnover > turnoverLimit) {
    return {
      sizeClass: 'large',
      exclusion: {
        reason: 'turnover_exceeds',
        detail: `Turnover (₹${fmt(input.turnover)}) exceeds limit (₹${fmt(turnoverLimit)})`,
      },
    };
  }

  return { sizeClass: 'small', exclusion: null };
}

/* ═══════════════════════════════════════════════════════
   0.2 — Accounting framework: AS vs Ind AS
   ═══════════════════════════════════════════════════════ */

function computeAccountingFramework(
  input: ClassificationInput,
  thresholds: ThresholdSet,
): { framework: AccountingFramework; division: ScheduleIIIDivision } {
  // Once in Ind AS, always Ind AS
  if (input.priorIndAsAdoption) {
    return { framework: 'ind_as', division: 'division_ii' };
  }

  // Listed or in process of listing
  if (input.isListed) {
    return { framework: 'ind_as', division: 'division_ii' };
  }

  // Holding/subsidiary/associate/JV of an Ind AS company
  if (input.isIndAsRelated) {
    return { framework: 'ind_as', division: 'division_ii' };
  }

  // Net worth test
  const netWorthLimit = resolveThreshold(thresholds.indAsNetWorth, input.fyEndDate);
  if (input.netWorth >= netWorthLimit) {
    return { framework: 'ind_as', division: 'division_ii' };
  }

  // Default: Indian GAAP (AS)
  return { framework: 'indian_gaap', division: 'division_i' };
}

/* ═══════════════════════════════════════════════════════
   0.3 — Audit trigger flags (each independent)
   ═══════════════════════════════════════════════════════ */

function computeAuditFlags(
  input: ClassificationInput,
  sizeClass: SizeClass,
  thresholds: ThresholdSet,
): AuditFlags {
  const asOf = input.fyEndDate;

  // Tax audit (44AB / §63)
  const taxAuditLimit = resolveThreshold(thresholds.taxAuditTurnover, asOf);
  const taxAuditLimitCash = resolveThreshold(thresholds.taxAuditTurnoverCashBelow5, asOf);
  const cashBelow5 = input.cashReceiptsPercent <= 5 && input.cashPaymentsPercent <= 5;
  const effectiveLimit = cashBelow5 ? taxAuditLimitCash : taxAuditLimit;
  const taxAudit = input.turnover > effectiveLimit;

  // CARO 2020 — exempt if Small OR meets ALL three limits
  let caro = false;
  if (sizeClass !== 'small') {
    const caroCapitalLimit = resolveThreshold(thresholds.caroCapitalReserves, asOf);
    const caroBorrowLimit = resolveThreshold(thresholds.caroBorrowings, asOf);
    const caroRevenueLimit = resolveThreshold(thresholds.caroRevenue, asOf);

    const capitalPlusReserves = input.paidUpShareCapital + input.reserves;
    const isCaroExempt =
      !input.isSubsidiary &&
      !input.isHolding &&
      capitalPlusReserves <= caroCapitalLimit &&
      input.peakBorrowings <= caroBorrowLimit &&
      input.revenue <= caroRevenueLimit;

    caro = !isCaroExempt;
  }

  // IFC reporting — exempt for small/OPC
  const ifcReporting = sizeClass !== 'small';

  // Cost audit — industry flag only
  const costAudit = input.isCostAuditIndustry;

  // Secretarial audit (Sec 204)
  const secAuditCapital = resolveThreshold(thresholds.secretarialAuditCapital, asOf);
  const secAuditTurnover = resolveThreshold(thresholds.secretarialAuditTurnover, asOf);
  const secretarialAudit =
    input.paidUpShareCapital >= secAuditCapital || input.turnover >= secAuditTurnover;

  // Internal audit (Sec 138)
  const intAuditTurnover = resolveThreshold(thresholds.internalAuditTurnover, asOf);
  const intAuditBorrowings = resolveThreshold(thresholds.internalAuditBorrowings, asOf);
  const internalAudit =
    input.turnover >= intAuditTurnover || input.peakBorrowings >= intAuditBorrowings;

  // CSR (Sec 135) — any ONE of three
  const csrNW = resolveThreshold(thresholds.csrNetWorth, asOf);
  const csrTO = resolveThreshold(thresholds.csrTurnover, asOf);
  const csrNP = resolveThreshold(thresholds.csrNetProfit, asOf);
  const csrApplicable =
    input.netWorth >= csrNW || input.turnover >= csrTO || input.avgNetProfit3Years >= csrNP;

  // XBRL
  const xbrlCapital = resolveThreshold(thresholds.xbrlCapital, asOf);
  const xbrlTurnover = resolveThreshold(thresholds.xbrlTurnover, asOf);
  const xbrlFiling =
    input.priorXbrlFiling ||
    input.paidUpShareCapital >= xbrlCapital ||
    input.turnover >= xbrlTurnover;

  return {
    statutoryAudit: true,
    taxAudit,
    caro,
    ifcReporting,
    costAudit,
    secretarialAudit,
    internalAudit,
    csrApplicable,
    xbrlFiling,
  };
}

/* ═══════════════════════════════════════════════════════
   Derived filing obligations
   ═══════════════════════════════════════════════════════ */

function deriveFilingObligations(
  sizeClass: SizeClass,
  framework: AccountingFramework,
  auditFlags: AuditFlags,
): FilingObligations {
  return {
    annualReturnForm: sizeClass === 'small' ? 'MGT-7A' : 'MGT-7',
    cashFlowRequired: sizeClass !== 'small',
    soceRequired: framework === 'ind_as',
    abridgedBoardReport: sizeClass === 'small',
    caroAnnexure: auditFlags.caro,
    ifcParagraph: auditFlags.ifcReporting,
    itrForm: 'ITR-6',
    taxAuditForm: '3CA',  // 3CA for companies; 3CB is for non-companies
  };
}

/* ═══════════════════════════════════════════════════════
   Main: classify()
   ═══════════════════════════════════════════════════════ */

/**
 * Run the full classification engine for a Private Limited company.
 *
 * @param input — financial metrics for the FY
 * @param thresholds — override defaults for testing or law changes
 * @returns Classification result that drives all downstream modules
 */
export function classify(
  input: ClassificationInput,
  thresholds: ThresholdSet = DEFAULT_THRESHOLDS,
): Classification {
  // 0.1 — Size class
  const { sizeClass, exclusion } = computeSizeClass(input, thresholds);

  // 0.2 — Accounting framework
  const { framework, division } = computeAccountingFramework(input, thresholds);

  // 0.3 — Audit flags
  const auditFlags = computeAuditFlags(input, sizeClass, thresholds);

  // Derived
  const filingObligations = deriveFilingObligations(sizeClass, framework, auditFlags);

  return {
    financialYear: deriveFY(input.fyEndDate),
    computedAt: new Date().toISOString(),
    sizeClass,
    smallCompanyExclusion: exclusion,
    accountingFramework: framework,
    scheduleIIIDivision: division,
    auditFlags,
    filingObligations,
  };
}

/* ═══════════════════════════════════════════════════════
   Statute version resolver
   ═══════════════════════════════════════════════════════ */

/**
 * Resolve which Income-tax Act applies for a given tax year.
 * IT Act 2025 is in force from 1 Apr 2026 (TY 2026-27 onward).
 * FY 2025-26 audit reporting still uses the old Act.
 */
export function resolveStatuteVersion(fyEndDate: string): {
  version: 'it_act_1961' | 'it_act_2025';
  taxAuditSection: string;
  yearLabel: string;
} {
  // Tax year = FY for new Act; Assessment Year = FY+1 for old Act
  const fyEnd = new Date(fyEndDate);
  const fyStartYear = fyEnd.getMonth() < 3 ? fyEnd.getFullYear() - 1 : fyEnd.getFullYear();

  if (fyStartYear >= 2026) {
    // New Act applies from TY 2026-27 (FY starting Apr 2026)
    return {
      version: 'it_act_2025',
      taxAuditSection: '§63',
      yearLabel: `TY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`,
    };
  }

  return {
    version: 'it_act_1961',
    taxAuditSection: '44AB',
    yearLabel: `AY ${fyStartYear + 1}-${String(fyStartYear + 2).slice(2)}`,
  };
}

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

function deriveFY(fyEndDate: string): string {
  const d = new Date(fyEndDate);
  const endYear = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const startYear = month < 3 ? endYear - 1 : endYear;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}
