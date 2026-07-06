/**
 * Private Limited — Notes to Accounts Template Library
 *
 * Standard notes that accompany Schedule III financial statements.
 * Each note has a reference number, title, and template content.
 */

/* ═══════════════════════════════════════════════════════
   Note Template Structure
   ═══════════════════════════════════════════════════════ */

export interface NoteTemplate {
  noteNumber: number;
  title: string;
  /** Which BS/P&L line items this note supports */
  lineItemRefs: string[];
  /** Sub-items within this note */
  subItems: NoteSubItem[];
  /** Whether this note has a mandatory table */
  hasTable: boolean;
  /** Div I only, Div II only, or both */
  applicableTo: 'both' | 'division_i' | 'division_ii';
}

export interface NoteSubItem {
  label: string;
  currentYear: number;
  previousYear: number;
}

/* ═══════════════════════════════════════════════════════
   Standard Notes — Template Definitions
   ═══════════════════════════════════════════════════════ */

export const NOTES_TEMPLATE: NoteTemplate[] = [
  {
    noteNumber: 1,
    title: 'Corporate Information',
    lineItemRefs: [],
    subItems: [],
    hasTable: false,
    applicableTo: 'both',
  },
  {
    noteNumber: 2,
    title: 'Significant Accounting Policies',
    lineItemRefs: [],
    subItems: [],
    hasTable: false,
    applicableTo: 'both',
  },
  {
    noteNumber: 3,
    title: 'Share Capital',
    lineItemRefs: ['shareCapital'],
    subItems: [
      { label: 'Authorised Share Capital', currentYear: 0, previousYear: 0 },
      { label: 'Issued, Subscribed & Paid-up', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 4,
    title: 'Reserves and Surplus',
    lineItemRefs: ['reservesAndSurplus'],
    subItems: [
      { label: 'Securities Premium', currentYear: 0, previousYear: 0 },
      { label: 'General Reserve', currentYear: 0, previousYear: 0 },
      { label: 'Surplus in Statement of Profit & Loss', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 5,
    title: 'Long-Term Borrowings',
    lineItemRefs: ['longTermBorrowings'],
    subItems: [
      { label: 'Term Loans from Banks (Secured)', currentYear: 0, previousYear: 0 },
      { label: 'Unsecured Loans', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 6,
    title: 'Deferred Tax Liabilities (Net)',
    lineItemRefs: ['deferredTaxLiabilities'],
    subItems: [
      { label: 'Depreciation (Timing Difference)', currentYear: 0, previousYear: 0 },
      { label: 'Disallowances u/s 43B', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 7,
    title: 'Other Long-Term Liabilities',
    lineItemRefs: ['otherLongTermLiabilities'],
    subItems: [
      { label: 'Security Deposits Received', currentYear: 0, previousYear: 0 },
      { label: 'Other Payables', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 8,
    title: 'Long-Term Provisions',
    lineItemRefs: ['longTermProvisions'],
    subItems: [
      { label: 'Provision for Employee Benefits (Gratuity)', currentYear: 0, previousYear: 0 },
      { label: 'Provision for Leave Encashment', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 9,
    title: 'Short-Term Borrowings',
    lineItemRefs: ['shortTermBorrowings'],
    subItems: [
      { label: 'Working Capital Loans from Banks (Secured)', currentYear: 0, previousYear: 0 },
      { label: 'Unsecured Loans', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 10,
    title: 'Trade Payables',
    lineItemRefs: ['tradePayables'],
    subItems: [
      { label: 'Total outstanding dues of MSME', currentYear: 0, previousYear: 0 },
      { label: 'Total outstanding dues of others', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 11,
    title: 'Other Current Liabilities',
    lineItemRefs: ['otherCurrentLiabilities'],
    subItems: [
      { label: 'Statutory Dues Payable', currentYear: 0, previousYear: 0 },
      { label: 'Advance from Customers', currentYear: 0, previousYear: 0 },
      { label: 'Other Payables', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 12,
    title: 'Short-Term Provisions',
    lineItemRefs: ['shortTermProvisions'],
    subItems: [
      { label: 'Provision for Income Tax (Net of Advance Tax)', currentYear: 0, previousYear: 0 },
      { label: 'Provision for Employee Benefits', currentYear: 0, previousYear: 0 },
      { label: 'Proposed Dividend', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 13,
    title: 'Property, Plant and Equipment',
    lineItemRefs: ['ppe'],
    subItems: [],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 14,
    title: 'Capital Work-in-Progress',
    lineItemRefs: ['capitalWorkInProgress'],
    subItems: [],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 15,
    title: 'Intangible Assets',
    lineItemRefs: ['intangibleAssets'],
    subItems: [],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 16,
    title: 'Non-Current Investments',
    lineItemRefs: ['nonCurrentInvestments'],
    subItems: [
      { label: 'Investment in Equity (Trade)', currentYear: 0, previousYear: 0 },
      { label: 'Investment in Mutual Funds', currentYear: 0, previousYear: 0 },
      { label: 'Other Investments', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 17,
    title: 'Long-Term Loans and Advances',
    lineItemRefs: ['longTermLoansAndAdvances'],
    subItems: [
      { label: 'Security Deposits', currentYear: 0, previousYear: 0 },
      { label: 'Loans to Employees', currentYear: 0, previousYear: 0 },
      { label: 'Capital Advances', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 18,
    title: 'Inventories',
    lineItemRefs: ['inventories'],
    subItems: [
      { label: 'Raw Materials', currentYear: 0, previousYear: 0 },
      { label: 'Work-in-Progress', currentYear: 0, previousYear: 0 },
      { label: 'Finished Goods', currentYear: 0, previousYear: 0 },
      { label: 'Stores and Spares', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 19,
    title: 'Trade Receivables',
    lineItemRefs: ['tradeReceivables'],
    subItems: [
      { label: 'Secured, Considered Good', currentYear: 0, previousYear: 0 },
      { label: 'Unsecured, Considered Good', currentYear: 0, previousYear: 0 },
      { label: 'Doubtful', currentYear: 0, previousYear: 0 },
      { label: 'Less: Allowance for Doubtful Debts', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 20,
    title: 'Cash and Cash Equivalents',
    lineItemRefs: ['cashAndCashEquivalents'],
    subItems: [
      { label: 'Balance with Banks (Current Accounts)', currentYear: 0, previousYear: 0 },
      { label: 'Fixed Deposits (maturity < 3 months)', currentYear: 0, previousYear: 0 },
      { label: 'Cash on Hand', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 21,
    title: 'Revenue from Operations',
    lineItemRefs: ['revenueFromOperations'],
    subItems: [
      { label: 'Sale of Products', currentYear: 0, previousYear: 0 },
      { label: 'Sale of Services', currentYear: 0, previousYear: 0 },
      { label: 'Other Operating Revenue', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 22,
    title: 'Other Income',
    lineItemRefs: ['otherIncome'],
    subItems: [
      { label: 'Interest Income', currentYear: 0, previousYear: 0 },
      { label: 'Dividend Income', currentYear: 0, previousYear: 0 },
      { label: 'Net Gain on Foreign Currency Transactions', currentYear: 0, previousYear: 0 },
      { label: 'Miscellaneous Income', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 23,
    title: 'Cost of Materials Consumed',
    lineItemRefs: ['costOfMaterialsConsumed'],
    subItems: [
      { label: 'Opening Stock of Raw Materials', currentYear: 0, previousYear: 0 },
      { label: 'Add: Purchases during the year', currentYear: 0, previousYear: 0 },
      { label: 'Less: Closing Stock of Raw Materials', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 24,
    title: 'Employee Benefit Expenses',
    lineItemRefs: ['employeeBenefitExpense'],
    subItems: [
      { label: 'Salaries and Wages', currentYear: 0, previousYear: 0 },
      { label: 'Contribution to PF and Other Funds', currentYear: 0, previousYear: 0 },
      { label: 'Gratuity Expense', currentYear: 0, previousYear: 0 },
      { label: 'Staff Welfare Expenses', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 25,
    title: 'Finance Costs',
    lineItemRefs: ['financeCharges'],
    subItems: [
      { label: 'Interest on Term Loans', currentYear: 0, previousYear: 0 },
      { label: 'Interest on Working Capital', currentYear: 0, previousYear: 0 },
      { label: 'Bank Charges', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 26,
    title: 'Depreciation and Amortisation',
    lineItemRefs: ['depreciationAndAmortisation'],
    subItems: [
      { label: 'Depreciation on PPE', currentYear: 0, previousYear: 0 },
      { label: 'Amortisation of Intangible Assets', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
  {
    noteNumber: 27,
    title: 'Other Expenses',
    lineItemRefs: ['otherExpenses'],
    subItems: [
      { label: 'Rent', currentYear: 0, previousYear: 0 },
      { label: 'Repairs and Maintenance', currentYear: 0, previousYear: 0 },
      { label: 'Insurance', currentYear: 0, previousYear: 0 },
      { label: 'Rates and Taxes', currentYear: 0, previousYear: 0 },
      { label: 'Legal and Professional Fees', currentYear: 0, previousYear: 0 },
      { label: 'Auditor\'s Remuneration', currentYear: 0, previousYear: 0 },
      { label: 'Travelling and Conveyance', currentYear: 0, previousYear: 0 },
      { label: 'Communication Expenses', currentYear: 0, previousYear: 0 },
      { label: 'Printing and Stationery', currentYear: 0, previousYear: 0 },
      { label: 'Bad Debts Written Off', currentYear: 0, previousYear: 0 },
      { label: 'Miscellaneous Expenses', currentYear: 0, previousYear: 0 },
    ],
    hasTable: true,
    applicableTo: 'both',
  },
];

/* ═══════════════════════════════════════════════════════
   Additional Mandatory Notes (MCA 2021 amendments)
   ═══════════════════════════════════════════════════════ */

export const ADDITIONAL_MANDATORY_NOTES: Array<{
  title: string;
  requirement: string;
  applicableTo: 'both' | 'division_i' | 'division_ii';
}> = [
  {
    title: 'Ageing of Trade Receivables',
    requirement: 'Separate ageing for disputed/undisputed, categorized by secured-good, unsecured-good, significant credit risk, credit impaired',
    applicableTo: 'both',
  },
  {
    title: 'Ageing of Trade Payables',
    requirement: 'Separate ageing for disputed/undisputed, split between MSME and others',
    applicableTo: 'both',
  },
  {
    title: 'Ageing of Capital Work-in-Progress',
    requirement: 'CWIP ageing schedule — less than 1 year, 1-2 years, 2-3 years, more than 3 years; for projects whose completion is overdue or cost exceeded',
    applicableTo: 'both',
  },
  {
    title: 'Ageing of Intangible Assets Under Development',
    requirement: 'Same ageing as CWIP for intangibles under development',
    applicableTo: 'both',
  },
  {
    title: 'Financial Ratios',
    requirement: '11 mandatory ratios with variance analysis; explanation required for >25% change',
    applicableTo: 'both',
  },
  {
    title: 'Promoter Shareholding',
    requirement: 'Shares held by promoters with year-on-year changes and percentage change',
    applicableTo: 'both',
  },
  {
    title: 'Related Party Transactions',
    requirement: 'Disclosure as per AS 18 / Ind AS 24 with categories and transaction details',
    applicableTo: 'both',
  },
  {
    title: 'Benami Property',
    requirement: 'Whether any proceedings initiated/pending under Benami Transactions Act',
    applicableTo: 'both',
  },
  {
    title: 'Crypto / Virtual Digital Assets',
    requirement: 'Profit/loss on crypto transactions, amount held, deposits/advances received',
    applicableTo: 'both',
  },
  {
    title: 'Undisclosed Income',
    requirement: 'Income surrendered/disclosed during search/survey/assessment and its treatment in books',
    applicableTo: 'both',
  },
  {
    title: 'Struck-off Companies',
    requirement: 'Relationship with companies struck off under Sec 248 or 560 — nature, balance outstanding',
    applicableTo: 'both',
  },
  {
    title: 'Wilful Defaulter',
    requirement: 'Whether company has been declared wilful defaulter by any bank/FI',
    applicableTo: 'both',
  },
  {
    title: 'Title Deeds of Immovable Property',
    requirement: 'Where title deeds not in company name — details required',
    applicableTo: 'both',
  },
  {
    title: 'Loans/Advances to Promoters/Directors/KMP/Related Parties',
    requirement: 'Type, amount, outstanding, and percentage of total loans/advances',
    applicableTo: 'both',
  },
  {
    title: 'Utilisation of Borrowed Funds and Share Premium',
    requirement: 'Whether borrowed funds/share premium used for giving loans/advances to intermediaries for ultimate lending/investing by the company',
    applicableTo: 'both',
  },
];

/* ═══════════════════════════════════════════════════════
   Accounting Policies Template (Note 2)
   ═══════════════════════════════════════════════════════ */

export const ACCOUNTING_POLICIES_TEMPLATE: Array<{
  policy: string;
  indianGAAP: string;
  indAS: string;
}> = [
  {
    policy: 'Basis of Preparation',
    indianGAAP: 'Financial statements are prepared under the historical cost convention on accrual basis in accordance with generally accepted accounting principles in India and comply with Accounting Standards prescribed under Section 133 of the Companies Act 2013.',
    indAS: 'Financial statements are prepared in accordance with Indian Accounting Standards (Ind AS) notified under Section 133 of the Companies Act 2013, using the historical cost basis except for certain financial instruments measured at fair value.',
  },
  {
    policy: 'Revenue Recognition',
    indianGAAP: 'Revenue is recognised when significant risks and rewards of ownership are transferred, amount can be reliably measured, and recovery is reasonably certain (AS 9).',
    indAS: 'Revenue is recognised when control of goods or services is transferred to the customer at an amount that reflects the consideration expected in exchange (Ind AS 115).',
  },
  {
    policy: 'Property, Plant and Equipment',
    indianGAAP: 'PPE is stated at cost less accumulated depreciation. Depreciation is provided on straight-line/WDV method over useful lives prescribed in Schedule II of the Companies Act 2013.',
    indAS: 'PPE is recognised at cost less accumulated depreciation and impairment losses. Depreciation is calculated using straight-line/WDV method over estimated useful lives per Schedule II, with component accounting where material.',
  },
  {
    policy: 'Inventories',
    indianGAAP: 'Inventories are valued at lower of cost and net realisable value. Cost is determined on FIFO/weighted average basis (AS 2).',
    indAS: 'Inventories are measured at the lower of cost and net realisable value. Cost comprises purchase price, conversion costs, and other costs to bring inventories to their present location and condition (Ind AS 2).',
  },
  {
    policy: 'Employee Benefits',
    indianGAAP: 'Short-term benefits are recognised as expense. Defined contribution plans (PF, ESI) are charged as incurred. Defined benefit obligations (gratuity) are measured using projected unit credit method (AS 15).',
    indAS: 'Short-term benefits expensed as incurred. Defined contribution plans charged as incurred. Defined benefit obligations measured at present value using projected unit credit method; remeasurements recognised in OCI (Ind AS 19).',
  },
  {
    policy: 'Borrowing Costs',
    indianGAAP: 'Borrowing costs directly attributable to acquisition/construction of qualifying assets are capitalised. Other borrowing costs are expensed (AS 16).',
    indAS: 'Borrowing costs directly attributable to qualifying assets are capitalised as part of the cost. All other borrowing costs are recognised in the Statement of Profit and Loss (Ind AS 23).',
  },
  {
    policy: 'Income Tax',
    indianGAAP: 'Current tax is provided at applicable rates. Deferred tax is recognised using the timing difference approach on all timing differences (AS 22).',
    indAS: 'Current tax at applicable rates. Deferred tax recognised using the balance sheet approach on all temporary differences. Deferred tax assets recognised to extent of probable future taxable profit (Ind AS 12).',
  },
  {
    policy: 'Impairment of Assets',
    indianGAAP: 'Carrying amounts are reviewed at each balance sheet date for impairment. Impairment loss is recognised when recoverable amount is less than carrying amount (AS 28).',
    indAS: 'At each reporting date, the company assesses whether there is any indication of impairment. If indication exists, recoverable amount is estimated. Impairment loss recognised when carrying amount exceeds recoverable amount (Ind AS 36).',
  },
  {
    policy: 'Provisions and Contingencies',
    indianGAAP: 'Provision is recognised when there is a present obligation, probable outflow, and reliable estimate. Contingent liabilities are disclosed (AS 29).',
    indAS: 'Provisions recognised when there is a present obligation (legal or constructive), probable outflow, and reliable estimate. Contingent liabilities are disclosed. Contingent assets are not recognised (Ind AS 37).',
  },
  {
    policy: 'Leases',
    indianGAAP: 'Operating lease payments recognised as expense on straight-line basis. Finance lease assets capitalised at fair value / present value of minimum lease payments (AS 19).',
    indAS: 'All leases (except short-term and low value) recognised as right-of-use asset with corresponding lease liability. Depreciation on ROU asset and interest on lease liability recognised separately (Ind AS 116).',
  },
];
