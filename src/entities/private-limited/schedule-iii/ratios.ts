/**
 * Private Limited — Financial Ratio Computation
 *
 * 11 mandatory ratios per MCA 2021 amendment.
 * >25% variance requires explanation in notes.
 */

import type { FinancialRatio } from './types';
import { MANDATORY_RATIOS } from './types';

export interface RatioInputs {
  // Balance Sheet items
  currentAssets: number;
  currentLiabilities: number;
  totalDebt: number;
  shareholderEquity: number;
  averageShareholderEquity: number;
  capitalEmployed: number;
  workingCapital: number;
  averageInventory: number;
  averageTradeReceivables: number;
  averageTradePayables: number;
  averageInvestments: number;

  // P&L items
  netSales: number;
  netCreditSales: number;
  netCreditPurchases: number;
  cogs: number;
  netProfitAfterTax: number;
  ebit: number;
  incomeFromInvestments: number;

  // Debt service
  earningsForDebtService: number; // net profit + non-cash charges + interest + other adjustments
  interestPayment: number;
  principalRepayment: number;
}

/**
 * Compute all 11 mandatory ratios for current year.
 */
export function computeRatios(inputs: RatioInputs): Map<string, number> {
  const ratios = new Map<string, number>();

  const safeDivide = (num: number, den: number): number =>
    den === 0 ? 0 : Math.round((num / den) * 100) / 100;

  ratios.set('Current Ratio', safeDivide(inputs.currentAssets, inputs.currentLiabilities));
  ratios.set('Debt-Equity Ratio', safeDivide(inputs.totalDebt, inputs.shareholderEquity));
  ratios.set('Debt Service Coverage Ratio',
    safeDivide(inputs.earningsForDebtService, inputs.interestPayment + inputs.principalRepayment));
  ratios.set('Return on Equity', safeDivide(inputs.netProfitAfterTax, inputs.averageShareholderEquity));
  ratios.set('Inventory Turnover Ratio', safeDivide(inputs.cogs, inputs.averageInventory));
  ratios.set('Trade Receivables Turnover Ratio', safeDivide(inputs.netCreditSales, inputs.averageTradeReceivables));
  ratios.set('Trade Payables Turnover Ratio', safeDivide(inputs.netCreditPurchases, inputs.averageTradePayables));
  ratios.set('Net Capital Turnover Ratio', safeDivide(inputs.netSales, inputs.workingCapital));
  ratios.set('Net Profit Ratio', safeDivide(inputs.netProfitAfterTax, inputs.netSales));
  ratios.set('Return on Capital Employed', safeDivide(inputs.ebit, inputs.capitalEmployed));
  ratios.set('Return on Investment', safeDivide(inputs.incomeFromInvestments, inputs.averageInvestments));

  return ratios;
}

/**
 * Build the full FinancialRatio[] disclosure with variance analysis.
 */
export function buildRatioDisclosure(
  currentInputs: RatioInputs,
  previousInputs: RatioInputs,
): FinancialRatio[] {
  const currentRatios = computeRatios(currentInputs);
  const previousRatios = computeRatios(previousInputs);

  return MANDATORY_RATIOS.map((def) => {
    const cy = currentRatios.get(def.name) ?? 0;
    const py = previousRatios.get(def.name) ?? 0;
    const variance = py === 0
      ? (cy === 0 ? 0 : 100)
      : Math.round(((cy - py) / Math.abs(py)) * 10000) / 100;

    return {
      name: def.name,
      formula: def.formula,
      currentYear: cy,
      previousYear: py,
      variancePercentage: variance,
      explanationRequired: Math.abs(variance) > 25,
    };
  });
}
