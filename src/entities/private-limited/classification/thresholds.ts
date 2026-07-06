/**
 * Private Limited — Configurable Thresholds
 *
 * Every threshold is config, not hardcoded, because these move with each Finance Act.
 * Keyed by effective date so the engine auto-resolves which threshold applies for a given FY.
 *
 * Currency of law: verified to May 2026.
 */

export interface ThresholdEntry {
  effectiveFrom: string;   // ISO date when this threshold took effect
  value: number;           // threshold value in ₹
  description: string;     // human-readable note
}

export interface ThresholdSet {
  /** Sec 2(85) — Small Company paid-up capital limit */
  smallCompanyCapital: ThresholdEntry[];
  /** Sec 2(85) — Small Company turnover limit */
  smallCompanyTurnover: ThresholdEntry[];
  /** Companies (Indian Accounting Standards) Rules 2015 — Ind AS net worth trigger */
  indAsNetWorth: ThresholdEntry[];
  /** Sec 44AB (old) / §63 (new Act, AY 27-28 onward) — Tax audit turnover */
  taxAuditTurnover: ThresholdEntry[];
  /** Sec 44AB — Tax audit turnover (if cash ≤5%) */
  taxAuditTurnoverCashBelow5: ThresholdEntry[];
  /** CARO 2020 — paid-up + reserves limit for exemption */
  caroCapitalReserves: ThresholdEntry[];
  /** CARO 2020 — borrowings limit for exemption */
  caroBorrowings: ThresholdEntry[];
  /** CARO 2020 — revenue limit for exemption */
  caroRevenue: ThresholdEntry[];
  /** Sec 204 — Secretarial audit paid-up capital trigger */
  secretarialAuditCapital: ThresholdEntry[];
  /** Sec 204 — Secretarial audit turnover trigger */
  secretarialAuditTurnover: ThresholdEntry[];
  /** Sec 138 — Internal audit turnover (unlisted) */
  internalAuditTurnover: ThresholdEntry[];
  /** Sec 138 — Internal audit borrowings (unlisted) */
  internalAuditBorrowings: ThresholdEntry[];
  /** Sec 135 — CSR net worth trigger */
  csrNetWorth: ThresholdEntry[];
  /** Sec 135 — CSR turnover trigger */
  csrTurnover: ThresholdEntry[];
  /** Sec 135 — CSR net profit trigger */
  csrNetProfit: ThresholdEntry[];
  /** XBRL — paid-up capital trigger */
  xbrlCapital: ThresholdEntry[];
  /** XBRL — turnover trigger */
  xbrlTurnover: ThresholdEntry[];
}

/**
 * Resolve the applicable threshold value for a given date.
 * Returns the most recent threshold entry whose effectiveFrom ≤ asOfDate.
 */
export function resolveThreshold(entries: ThresholdEntry[], asOfDate: string): number {
  const sorted = [...entries].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  for (const entry of sorted) {
    if (entry.effectiveFrom <= asOfDate) return entry.value;
  }
  return sorted[sorted.length - 1]?.value ?? 0;
}

// ₹ multipliers for readability
const CR = 1_00_00_000;  // 1 crore
const L  = 1_00_000;     // 1 lakh

/**
 * Default thresholds as of May 2026.
 * Update these when Finance Act / amendment changes a threshold.
 */
export const DEFAULT_THRESHOLDS: ThresholdSet = {
  // Sec 2(85) — Small Company (revised 1 Dec 2025)
  smallCompanyCapital: [
    { effectiveFrom: '2013-04-01', value: 50 * L,    description: 'Original Companies Act 2013 limit' },
    { effectiveFrom: '2021-04-01', value: 4 * CR,    description: 'Revised by Companies (Specification of Definitions Details) Amendment Rules, 2021' },
    { effectiveFrom: '2025-12-01', value: 10 * CR,   description: 'Revised 1 Dec 2025 — paid-up ≤ ₹10 Cr' },
  ],
  smallCompanyTurnover: [
    { effectiveFrom: '2013-04-01', value: 2 * CR,    description: 'Original limit' },
    { effectiveFrom: '2021-04-01', value: 40 * CR,   description: 'Revised 2021' },
    { effectiveFrom: '2025-12-01', value: 100 * CR,  description: 'Revised 1 Dec 2025 — turnover ≤ ₹100 Cr' },
  ],

  // Ind AS — net worth trigger
  indAsNetWorth: [
    { effectiveFrom: '2015-04-01', value: 250 * CR, description: 'Companies (Indian Accounting Standards) Rules, 2015' },
  ],

  // Tax audit — Sec 44AB / §63
  taxAuditTurnover: [
    { effectiveFrom: '2013-04-01', value: 1 * CR,   description: 'Sec 44AB threshold' },
    { effectiveFrom: '2026-04-01', value: 1 * CR,   description: 'Income-tax Act 2025 §63 (same amount, new section)' },
  ],
  taxAuditTurnoverCashBelow5: [
    { effectiveFrom: '2020-04-01', value: 10 * CR,  description: 'If cash receipts AND payments ≤ 5% of total' },
  ],

  // CARO 2020 — exemption limits (ALL must be met)
  caroCapitalReserves: [
    { effectiveFrom: '2021-04-01', value: 1 * CR, description: 'Paid-up + reserves ≤ ₹1 Cr' },
  ],
  caroBorrowings: [
    { effectiveFrom: '2021-04-01', value: 1 * CR, description: 'Borrowings at any time ≤ ₹1 Cr' },
  ],
  caroRevenue: [
    { effectiveFrom: '2021-04-01', value: 10 * CR, description: 'Revenue ≤ ₹10 Cr' },
  ],

  // Secretarial audit — Sec 204
  secretarialAuditCapital: [
    { effectiveFrom: '2014-04-01', value: 50 * CR, description: 'Paid-up ≥ ₹50 Cr' },
  ],
  secretarialAuditTurnover: [
    { effectiveFrom: '2014-04-01', value: 250 * CR, description: 'Turnover ≥ ₹250 Cr' },
  ],

  // Internal audit — Sec 138
  internalAuditTurnover: [
    { effectiveFrom: '2014-04-01', value: 200 * CR, description: 'Turnover ≥ ₹200 Cr (unlisted)' },
  ],
  internalAuditBorrowings: [
    { effectiveFrom: '2014-04-01', value: 100 * CR, description: 'Borrowings ≥ ₹100 Cr (unlisted)' },
  ],

  // CSR — Sec 135
  csrNetWorth: [
    { effectiveFrom: '2014-04-01', value: 500 * CR, description: 'Net worth ≥ ₹500 Cr' },
  ],
  csrTurnover: [
    { effectiveFrom: '2014-04-01', value: 1000 * CR, description: 'Turnover ≥ ₹1000 Cr' },
  ],
  csrNetProfit: [
    { effectiveFrom: '2014-04-01', value: 5 * CR, description: 'Net profit ≥ ₹5 Cr (preceding 3 FYs)' },
  ],

  // XBRL
  xbrlCapital: [
    { effectiveFrom: '2014-04-01', value: 5 * CR, description: 'Paid-up ≥ ₹5 Cr' },
  ],
  xbrlTurnover: [
    { effectiveFrom: '2014-04-01', value: 100 * CR, description: 'Turnover ≥ ₹100 Cr' },
  ],
};
