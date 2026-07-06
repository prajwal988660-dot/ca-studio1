/**
 * Private Limited — Schedule III Financial Statement Types
 *
 * Division I: Indian GAAP (AS)
 * Division II: Ind AS
 *
 * Mandatory disclosures per MCA amendments effective Apr 2021.
 */

/* ═══════════════════════════════════════════════════════
   Division Selection
   ═══════════════════════════════════════════════════════ */

export type ScheduleDivision = 'division_i' | 'division_ii';

/* ═══════════════════════════════════════════════════════
   Balance Sheet — Schedule III Part I
   ═══════════════════════════════════════════════════════ */

export interface ScheduleIIIBalanceSheet {
  division: ScheduleDivision;
  companyId: string;
  asOnDate: string;
  previousYearDate: string;

  /** I. Equity and Liabilities */
  equityAndLiabilities: {
    shareholdersFunds: {
      shareCapital: LineItem;
      reservesAndSurplus: LineItem;
      /** Div II only: Other equity */
      otherEquity?: LineItem;
    };
    /** Div II: Non-current liabilities / Current liabilities split differently */
    nonCurrentLiabilities: {
      longTermBorrowings: LineItem;
      deferredTaxLiabilities: LineItem;
      otherLongTermLiabilities: LineItem;
      longTermProvisions: LineItem;
      /** Div II: Lease liabilities (Ind AS 116) */
      leaseLiabilities?: LineItem;
    };
    currentLiabilities: {
      shortTermBorrowings: LineItem;
      tradePayables: TradePayablesDisclosure;
      otherCurrentLiabilities: LineItem;
      shortTermProvisions: LineItem;
    };
    totalEquityAndLiabilities: LineItem;
  };

  /** II. Assets */
  assets: {
    nonCurrentAssets: {
      ppe: LineItem;
      capitalWorkInProgress: LineItem;
      intangibleAssets: LineItem;
      intangibleAssetsUnderDevelopment?: LineItem;
      /** Div II: Right-of-use assets */
      rightOfUseAssets?: LineItem;
      nonCurrentInvestments: LineItem;
      longTermLoansAndAdvances: LineItem;
      otherNonCurrentAssets: LineItem;
      /** Div II: Deferred tax assets */
      deferredTaxAssets?: LineItem;
    };
    currentAssets: {
      inventories: LineItem;
      tradeReceivables: TradeReceivablesDisclosure;
      cashAndCashEquivalents: LineItem;
      shortTermLoansAndAdvances: LineItem;
      otherCurrentAssets: LineItem;
      /** Div II: Current tax assets */
      currentTaxAssets?: LineItem;
    };
    totalAssets: LineItem;
  };
}

/** Line item with current and previous year */
export interface LineItem {
  currentYear: number;
  previousYear: number;
  noteRef?: string;
}

/* ═══════════════════════════════════════════════════════
   Mandatory Disclosures — Trade Payables/Receivables Ageing
   (MCA amendment effective 1 Apr 2021)
   ═══════════════════════════════════════════════════════ */

export interface AgeingBucket {
  notDue: number;
  lessThan1Year: number;
  oneToTwoYears: number;
  twoToThreeYears: number;
  moreThanThreeYears: number;
  total: number;
}

export interface TradePayablesDisclosure {
  currentYear: number;
  previousYear: number;
  noteRef?: string;
  /** Mandatory ageing schedule */
  ageing: {
    /** MSME dues — separate ageing */
    msme: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
    /** Other than MSME */
    others: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
  };
  /** Unbilled dues */
  unbilledDues: number;
}

export interface TradeReceivablesDisclosure {
  currentYear: number;
  previousYear: number;
  noteRef?: string;
  /** Mandatory ageing schedule */
  ageing: {
    /** Considered good — secured */
    securedGood: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
    /** Considered good — unsecured */
    unsecuredGood: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
    /** Which have significant increase in credit risk */
    significantCreditRisk: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
    /** Credit impaired */
    creditImpaired: {
      disputed: AgeingBucket;
      undisputed: AgeingBucket;
    };
  };
  /** Unbilled receivables */
  unbilledReceivables: number;
}

/* ═══════════════════════════════════════════════════════
   Statement of Profit and Loss — Schedule III Part II
   ═══════════════════════════════════════════════════════ */

export interface ScheduleIIIProfitLoss {
  division: ScheduleDivision;
  companyId: string;
  financialYear: string;
  previousFinancialYear: string;

  revenue: {
    revenueFromOperations: LineItem;
    otherIncome: LineItem;
    totalRevenue: LineItem;
  };

  expenses: {
    costOfMaterialsConsumed: LineItem;
    purchasesOfStockInTrade: LineItem;
    changesInInventory: LineItem;
    employeeBenefitExpense: LineItem;
    financeCharges: LineItem;
    depreciationAndAmortisation: LineItem;
    otherExpenses: LineItem;
    totalExpenses: LineItem;
  };

  profitBeforeTax: LineItem;

  taxExpense: {
    currentTax: LineItem;
    deferredTax: LineItem;
    totalTax: LineItem;
  };

  profitAfterTax: LineItem;

  /** Div II only: Other comprehensive income */
  otherComprehensiveIncome?: {
    /** Items not reclassified to P&L */
    notReclassified: LineItem;
    /** Items reclassified to P&L */
    reclassified: LineItem;
    totalOCI: LineItem;
  };

  /** Div II: Total comprehensive income */
  totalComprehensiveIncome?: LineItem;

  /** EPS */
  earningsPerShare: {
    basic: { currentYear: number; previousYear: number };
    diluted: { currentYear: number; previousYear: number };
    faceValue: number;
  };
}

/* ═══════════════════════════════════════════════════════
   Cash Flow Statement — AS 3 / Ind AS 7
   ═══════════════════════════════════════════════════════ */

export interface CashFlowStatement {
  division: ScheduleDivision;
  /** Indirect method (mandatory for companies) */
  method: 'indirect';
  companyId: string;
  financialYear: string;

  operatingActivities: {
    profitBeforeTax: number;
    adjustments: CashFlowAdjustment[];
    operatingProfitBeforeWorkingCapital: number;
    workingCapitalChanges: CashFlowAdjustment[];
    cashFromOperations: number;
    incomeTaxPaid: number;
    netCashFromOperating: number;
  };

  investingActivities: {
    items: CashFlowAdjustment[];
    netCashFromInvesting: number;
  };

  financingActivities: {
    items: CashFlowAdjustment[];
    netCashFromFinancing: number;
  };

  netChangeInCash: number;
  openingCash: number;
  closingCash: number;
}

export interface CashFlowAdjustment {
  description: string;
  amount: number;
  previousYear?: number;
}

/* ═══════════════════════════════════════════════════════
   Mandatory Ratio Disclosures (MCA 2021 amendment)
   ═══════════════════════════════════════════════════════ */

export interface FinancialRatio {
  name: string;
  formula: string;
  currentYear: number;
  previousYear: number;
  variancePercentage: number;
  /** Explanation required if variance > 25% */
  explanationRequired: boolean;
  explanation?: string;
}

export const MANDATORY_RATIOS: Array<{ name: string; formula: string }> = [
  { name: 'Current Ratio', formula: 'Current Assets / Current Liabilities' },
  { name: 'Debt-Equity Ratio', formula: 'Total Debt / Shareholder Equity' },
  { name: 'Debt Service Coverage Ratio', formula: 'Earnings for Debt Service / Interest + Principal' },
  { name: 'Return on Equity', formula: 'Net Profit after Tax / Average Shareholder Equity' },
  { name: 'Inventory Turnover Ratio', formula: 'COGS / Average Inventory' },
  { name: 'Trade Receivables Turnover Ratio', formula: 'Net Credit Sales / Average Trade Receivables' },
  { name: 'Trade Payables Turnover Ratio', formula: 'Net Credit Purchases / Average Trade Payables' },
  { name: 'Net Capital Turnover Ratio', formula: 'Net Sales / Working Capital' },
  { name: 'Net Profit Ratio', formula: 'Net Profit / Net Sales' },
  { name: 'Return on Capital Employed', formula: 'EBIT / Capital Employed' },
  { name: 'Return on Investment', formula: 'Income from Investments / Average Investments' },
];

/* ═══════════════════════════════════════════════════════
   Other Mandatory Disclosures
   ═══════════════════════════════════════════════════════ */

/** Promoter shareholding changes */
export interface PromoterShareholding {
  promoterName: string;
  sharesHeldCurrentYear: number;
  percentageCurrentYear: number;
  sharesHeldPreviousYear: number;
  percentagePreviousYear: number;
  percentageChange: number;
}

/** Benami property disclosure */
export interface BenamiPropertyDisclosure {
  hasBenamProperty: boolean;
  details?: string;
  proceedingsPending?: boolean;
  amountInvolved?: number;
}

/** Crypto/virtual digital asset disclosure */
export interface CryptoDisclosure {
  hasCryptoAssets: boolean;
  profitOrLossOnTransactions?: number;
  amountOfCryptoHeld?: number;
  depositOrAdvanceFromCustomer?: number;
}

/** Undisclosed income */
export interface UndisclosedIncomeDisclosure {
  hasUndisclosedIncome: boolean;
  surrenderedOrDisclosed?: number;
  previouslyUnrecorded?: boolean;
  details?: string;
}

/** Struck off companies */
export interface StruckOffCompanies {
  hasRelationshipWithStruckOff: boolean;
  entries?: Array<{
    companyName: string;
    cin: string;
    natureOfRelationship: 'holding' | 'subsidiary' | 'associate' | 'investment' | 'receivable' | 'payable';
    balanceOutstanding: number;
  }>;
}

/** Wilful defaulter */
export interface WilfulDefaulterDisclosure {
  isWilfulDefaulter: boolean;
  declaredBy?: string;
  amount?: number;
}

/** Related Party Transactions — AS 18 / Ind AS 24 */
export interface RPTDisclosure {
  category: string;
  partyName: string;
  relationship: string;
  transactions: Array<{
    nature: string;
    currentYear: number;
    previousYear: number;
  }>;
  closingBalance: number;
}
