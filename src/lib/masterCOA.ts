/**
 * VAARTA Master Chart of Accounts — 523 accounts, ICAI & IndAS compliant.
 *
 * Every account maps to:
 *   primaryGroup  → Capital & Liabilities | Assets | Income | Expenses
 *   subGroup      → ~50 Schedule-III-aligned sub-groups
 *   nature        → asset | liability | capital | revenue | expense
 *   contra        → true when normal balance is opposite to its group
 *
 * This is the SINGLE source of truth for account classification.
 * Compute engines query by subGroup; the UI dropdown uses this list.
 */

export type PrimaryGroup = 'Capital & Liabilities' | 'Assets' | 'Income' | 'Expenses';
export type JournalNature = 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';

/** Human-readable meaning of each nature (for manual entry clarification). */
export const NATURE_MEANINGS: Record<JournalNature, string> = {
  asset: 'Resources owned or controlled by the entity that are expected to give future economic benefit (e.g. cash, inventory, receivables).',
  liability: 'Amounts owed to others; obligations to transfer economic benefits (e.g. payables, borrowings, provisions).',
  capital: 'Owner’s stake in the entity; residual interest after deducting liabilities from assets (e.g. share capital, reserves).',
  revenue: 'Income earned from operations or other activities; increases equity (e.g. sales, interest received).',
  expense: 'Outflows or consumption of assets that reduce profit; cost of running the business (e.g. salaries, rent, depreciation).',
};

/** Human-readable meaning of each primary group (for manual entry clarification). */
export const PRIMARY_GROUP_MEANINGS: Record<PrimaryGroup, string> = {
  'Capital & Liabilities': 'Sources of funds: owner’s equity (capital & reserves) and amounts owed to others (liabilities). Shown on the liability side of the Balance Sheet.',
  'Assets': 'What the entity owns or is owed; resources that will generate future benefit. Shown on the asset side of the Balance Sheet.',
  'Income': 'Revenue and gains that increase equity. Shown in the Profit & Loss (credit side in traditional format).',
  'Expenses': 'Costs and losses that reduce profit. Shown in the Profit & Loss or Trading Account (debit side in traditional format).',
};

export function getNatureMeaning(nature: JournalNature): string {
  return NATURE_MEANINGS[nature] ?? '';
}

export function getPrimaryGroupMeaning(primaryGroup: PrimaryGroup): string {
  return PRIMARY_GROUP_MEANINGS[primaryGroup] ?? '';
}

export interface MasterAccount {
  id: number;
  name: string;
  primaryGroup: PrimaryGroup;
  subGroup: string;
  nature: JournalNature;
  contra: boolean;
  /** Marks accounts whose lines should carry inventory_sub_lines and feed inventory registers. */
  isInventorySensitive?: boolean;
}

function deriveNature(pg: PrimaryGroup, sg: string): JournalNature {
  if (pg === 'Capital & Liabilities') {
    return (sg === 'Share Capital' || sg === 'Reserves & Surplus') ? 'capital' : 'liability';
  }
  if (pg === 'Assets') return 'asset';
  if (pg === 'Income') return 'revenue';
  return 'expense';
}

// ── Compact data ────────────────────────────────────────────────────
// Group layout: [primaryGroupIndex, subGroupName, accountEntries[]]
//   primaryGroupIndex: 0=CL  1=A  2=I  3=E
//   accountEntry: [id, name]  or  [id, name, true] (contra)
const PG: PrimaryGroup[] = ['Capital & Liabilities', 'Assets', 'Income', 'Expenses'];
type AE = [number, string] | [number, string, true];
type GD = [number, string, AE[]];

const GROUPS: GD[] = [
  // ═══════════════ PART A — CAPITAL & LIABILITIES ═══════════════
  [0, 'Share Capital', [
    [1, 'Equity Share Capital'],
    [2, 'Preference Share Capital — Cumulative'],
    [3, 'Preference Share Capital — Non-Cumulative'],
    [4, 'Calls in Arrears', true],
    [5, 'Forfeited Share Capital'],
    [6, 'Bonus Shares Issued', true],
    [7, 'Buy-back of Shares', true],
    [8, 'Minority Interest'],
    [9, "Partners' Capital Account"],
    [10, "Partners' Current Account"],
    [11, "Proprietor's Capital Account"],
    [12, 'Drawings Account', true],
  ]],
  [0, 'Reserves & Surplus', [
    [13, 'Securities Premium Reserve'],
    [14, 'Capital Reserve'],
    [15, 'Capital Redemption Reserve'],
    [16, 'General Reserve'],
    [17, 'Debenture Redemption Reserve'],
    [18, 'Investment Allowance Reserve'],
    [19, 'Revaluation Reserve'],
    [20, 'Amalgamation Reserve'],
    [21, 'Export Profit Reserve'],
    [22, 'Foreign Currency Translation Reserve'],
    [23, 'Hedging Reserve'],
    [24, 'Share Options Outstanding Account (ESOP)'],
    [25, 'Retained Earnings / Surplus in P&L'],
    [26, 'Interim Dividend Declared', true],
    [27, 'Final Dividend Declared', true],
  ]],
  [0, 'Long-term Borrowings', [
    [28, 'Secured Debentures'],
    [29, 'Unsecured Debentures'],
    [30, 'Term Loans from Banks — Secured'],
    [31, 'Term Loans from Banks — Unsecured'],
    [32, 'Term Loans from Financial Institutions'],
    [33, 'Loans from Directors'],
    [34, 'Loans from Related Parties'],
    [35, 'Foreign Currency Term Loans'],
    [36, 'Deferred Payment Liabilities'],
    [37, 'Finance Lease Obligations'],
    [38, 'Bonds Issued'],
    [39, 'Public Deposits (Long-term)'],
    [40, 'Inter-corporate Deposits (Long-term)'],
    [41, 'Debenture Redemption Premium Payable'],
    [42, 'Premium on Redemption of Debentures'],
  ]],
  [0, 'Deferred Tax Liability', [
    [43, 'Deferred Tax Liability — Depreciation Timing Difference'],
    [44, 'Deferred Tax Liability — Other Timing Differences'],
  ]],
  [0, 'Other Long-term Liabilities', [
    [45, 'Long-term Trade Payables'],
    [46, 'Security Deposits Received (Long-term)'],
    [47, 'Advance Received from Customers (Long-term)'],
    [48, 'Retention Money Payable'],
    [49, 'Royalty Payable (Long-term)'],
    [50, 'Lease Equalisation Reserve'],
    [51, 'Long-term Warranty Provisions'],
    [52, 'Long-term Maintenance Provisions'],
    [53, 'Long-term Litigation Provisions'],
    [54, 'Other Long-term Liabilities'],
  ]],
  [0, 'Long-term Provisions', [
    [55, 'Provision for Gratuity'],
    [56, 'Provision for Leave Encashment'],
    [57, 'Provision for Pension'],
    [58, 'Provision for Post-Retirement Benefits'],
    [59, 'Provision for Decommissioning Costs'],
    [60, 'Provision for Warranty (Long-term)'],
    [61, 'Provision for Contingencies (Long-term)'],
    [62, 'Provision for Other Long-term Employee Benefits'],
  ]],
  [0, 'Short-term Borrowings', [
    [63, 'Cash Credit from Banks'],
    [64, 'Overdraft from Banks'],
    [65, 'Short-term Loans from Banks — Secured'],
    [66, 'Short-term Loans from Banks — Unsecured'],
    [67, 'Commercial Paper Issued'],
    [68, 'Bills Discounted / Bills Payable to Banks'],
    [69, 'Public Deposits (Short-term)'],
    [70, 'Inter-corporate Deposits (Short-term)'],
    [71, 'Loans from Directors (Short-term)'],
    [72, 'Loans from Related Parties (Short-term)'],
    [73, 'Loans from Partners / Proprietor (Short-term)'],
    [74, 'Working Capital Demand Loans'],
  ]],
  [0, 'Trade Payables', [
    [75, 'Trade Creditors — Domestic (Goods)'],
    [76, 'Trade Creditors — Domestic (Services)'],
    [77, 'Trade Creditors — Import (Foreign)'],
    [78, 'Trade Creditors — MSME'],
    [79, 'Bills Payable'],
    [80, 'Creditors for Capital Goods'],
    [81, 'Advance from Customers (Short-term)'],
    [82, 'Creditors — Related Parties'],
    [83, 'Outstanding Expenses Payable'],
    [84, 'Accrued Liabilities'],
    [85, 'Creditors — Consignment'],
  ]],
  [0, 'Other Current Liabilities', [
    [86, 'Unpaid Dividends'],
    [87, 'Unclaimed Matured Deposits'],
    [88, 'Application Money Pending Allotment'],
    [89, 'Calls in Advance'],
    [90, 'Current Portion of Long-term Borrowings'],
    [91, 'Interest Accrued & Due on Borrowings'],
    [92, 'Interest Accrued but Not Due'],
    [93, 'Salary Payable'],
    [94, 'Bonus Payable'],
    [95, 'Security Deposits Payable (Short-term)'],
  ]],
  [0, 'Statutory Liabilities', [
    [96, 'TDS Payable — Sec 192 (Salary)'],
    [97, 'TDS Payable — Sec 194C (Contractors)'],
    [98, 'TDS Payable — Sec 194H (Commission)'],
    [99, 'TDS Payable — Sec 194I (Rent)'],
    [100, 'TDS Payable — Sec 194J (Professional Fees)'],
    [101, 'TDS Payable — Sec 194A (Interest)'],
    [102, 'TDS Payable — Other Sections'],
    [103, 'TCS Payable'],
    [104, 'PF Payable (Employee + Employer)'],
    [105, 'ESI Payable (Employee + Employer)'],
    [106, 'Professional Tax Payable'],
    [107, 'GST Payable (Net after ITC)'],
    [108, 'Income Tax Payable'],
    [109, 'Advance Tax Paid (Adjustable)', true],
    [110, 'Statutory Dues Payable (Other)'],
  ]],
  [0, 'Short-term Provisions', [
    [111, 'Provision for Tax (Current Year)'],
    [112, 'Provision for Dividend'],
    [113, 'Provision for Audit Fees'],
    [114, 'Provision for Bonus'],
    [115, 'Provision for Warranty (Short-term)'],
    [116, 'Provision for Bad & Doubtful Debts (Short-term)'],
    [117, 'Provision for Leave Encashment (Short-term)'],
    [118, 'Provision for Pending Legal Claims (Short-term)'],
  ]],
  [0, 'GST — Output Tax', [
    [119, 'CGST Output Tax Payable'],
    [120, 'SGST / UTGST Output Tax Payable'],
    [121, 'IGST Output Tax Payable'],
  ]],
  [0, 'GST — RCM', [
    [122, 'GST — RCM Payable'],
  ]],
  [0, 'GST — Advances', [
    [123, 'GST Payable on Advances Received'],
  ]],
  [0, 'Money received against share warrants', [
    [521, 'Money received against share warrants'],
  ]],

  // ═══════════════ PART B — ASSETS ═══════════════
  [1, 'Deferred Tax Asset', [
    [124, 'Deferred Tax Asset — Depreciation Timing Difference'],
    [125, 'Deferred Tax Asset — Unabsorbed Depreciation'],
    [126, 'Deferred Tax Asset — Carry Forward Losses'],
    [127, 'Deferred Tax Asset — Provision for Doubtful Debts'],
    [128, 'Deferred Tax Asset — Employee Benefits'],
    [129, 'Deferred Tax Asset — Other Timing Differences'],
    [130, 'Deferred Tax Asset — MAT Credit Entitlement'],
    [131, 'Net Deferred Tax Liability / Asset (Balance Sheet)'],
  ]],
  [1, 'Tangible Fixed Assets', [
    [132, 'Land — Freehold'],
    [133, 'Land — Leasehold'],
    [134, 'Buildings — Factory'],
    [135, 'Buildings — Office'],
    [136, 'Buildings — Residential'],
    [137, 'Leasehold Improvements'],
    [138, 'Plant & Machinery'],
    [139, 'Electrical Installations'],
    [140, 'Furniture & Fixtures'],
    [141, 'Office Equipment'],
    [142, 'Computers & IT Equipment'],
    [143, 'Vehicles — Commercial'],
    [144, 'Vehicles — Personal / Staff'],
    [145, 'Laboratory Equipment'],
    [146, 'Factory Equipment'],
    [147, 'Air Conditioners & Cooling Equipment'],
    [148, 'Tools & Dies'],
  ]],
  [1, 'Accumulated Depreciation', [
    [149, 'Accum. Dep — Buildings — Factory', true],
    [150, 'Accum. Dep — Buildings — Office', true],
    [151, 'Accum. Dep — Buildings — Residential', true],
    [152, 'Accum. Dep — Leasehold Improvements', true],
    [153, 'Accum. Dep — Plant & Machinery', true],
    [154, 'Accum. Dep — Electrical Installations', true],
    [155, 'Accum. Dep — Furniture & Fixtures', true],
    [156, 'Accum. Dep — Office Equipment', true],
    [157, 'Accum. Dep — Computers & IT Equipment', true],
    [158, 'Accum. Dep — Vehicles — Commercial', true],
    [159, 'Accum. Dep — Vehicles — Personal / Staff', true],
    [160, 'Accum. Dep — Laboratory Equipment', true],
    [161, 'Accum. Dep — Factory Equipment', true],
    [162, 'Accum. Dep — Air Conditioners', true],
    [163, 'Accum. Dep — Tools & Dies', true],
  ]],
  [1, 'Capital Work in Progress', [
    [164, 'CWIP — Buildings'],
    [165, 'CWIP — Plant & Machinery'],
    [166, 'CWIP — General'],
  ]],
  [1, 'Intangible Assets', [
    [167, 'Goodwill'],
    [168, 'Patents & Trademarks'],
    [169, 'Copyrights'],
    [170, 'Computer Software / Licenses'],
    [171, 'Franchise Rights'],
    [172, 'Customer Relationships'],
    [173, 'Intangible Assets Under Development'],
  ]],
  [1, 'Accumulated Amortisation', [
    [174, 'Accum. Amortisation — Goodwill', true],
    [175, 'Accum. Amortisation — Patents & Trademarks', true],
    [176, 'Accum. Amortisation — Computer Software', true],
    [177, 'Accum. Amortisation — Franchise Rights', true],
  ]],
  [1, 'Non-current Investments', [
    [178, 'Investment in Equity Shares — Subsidiaries'],
    [179, 'Investment in Preference Shares — Subsidiaries'],
    [180, 'Investment in Equity Shares — Associates'],
    [181, 'Investment in Equity Shares — Others (Quoted)'],
    [182, 'Investment in Equity Shares — Others (Unquoted)'],
    [183, 'Investment in Mutual Funds (Long-term)'],
    [184, 'Investment in Debentures & Bonds (Long-term)'],
    [185, 'Investment in Government Securities (Long-term)'],
    [186, 'Investment in Partnership Firms'],
    [187, 'Investment in LLPs'],
    [188, 'Investment in Fixed Deposits (Long-term)'],
    [189, 'Investment in Units of Venture Capital Funds'],
    [190, 'Capital Contribution in JV'],
    [191, 'Investment in NSC / KVP / Post Office'],
    [192, 'Investment in PPF'],
    [193, 'Investment in Life Insurance Policies (Key Man)'],
    [194, 'Investment in Gratuity Fund'],
    [195, 'Investment in PF Trust'],
    [196, 'Investment in Gold / Gold ETF (Long-term)'],
    [197, 'Investment in REIT / InvIT'],
    [198, 'Investment in Foreign Securities (Non-current)'],
    [199, 'Provision for Diminution in Value of Investments', true],
    [200, 'Provision for Impairment of Investment', true],
  ]],
  [1, 'Long-term Loans & Advances', [
    [201, 'Capital Advances'],
    [202, 'Security Deposits Paid (Long-term)'],
    [203, 'Loans to Subsidiaries (Long-term)'],
    [204, 'Loans to Associates (Long-term)'],
    [205, 'Loans to Employees (Long-term)'],
    [206, 'Advance Income Tax Paid (Long-term)'],
    [207, 'MAT Credit Entitlement'],
    [208, 'Prepaid Expenses (Long-term)'],
    [209, 'Advance for Capital Goods'],
    [210, 'Advance to Suppliers (Long-term)'],
    [211, 'Inter-corporate Loans Given (Long-term)'],
    [212, 'Long-term Deposits with Government'],
    [213, 'Long-term Deposits with Customs / Excise'],
    [214, 'Other Long-term Loans & Advances'],
  ]],
  [1, 'Other Non-current Assets', [
    [215, 'Unamortised Debenture Issue Expenses'],
    [216, 'Unamortised Share Issue Expenses'],
    [217, 'Unamortised Bond Premium'],
    [218, 'Long-term Bank FD (Margin Money)'],
    [219, 'Miscellaneous Expenditure (Not Written Off)'],
    [220, 'Export Benefit Receivable (Long-term)'],
    [221, 'Amalgamation Adjustment Account'],
    [222, 'Other Non-current Assets'],
  ]],
  [1, 'Current Investments', [
    [223, 'Investment in Mutual Funds (Short-term)'],
    [224, 'Investment in Fixed Deposits (Short-term)'],
    [225, 'Investment in Treasury Bills'],
    [226, 'Investment in Commercial Paper'],
    [227, 'Investment in Listed Equity Shares (Trading)'],
    [228, 'Investment in Government Securities (Short-term)'],
    [229, 'Investment in Debentures (Short-term)'],
    [230, 'Investment in Liquid Funds'],
    [231, 'Investment in Gold ETF (Short-term)'],
    [232, 'Provision for Diminution — Current Investments', true],
  ]],
  [1, 'Inventories', [
    [233, 'Raw Materials'],
    [234, 'Packing Materials'],
    [235, 'Stores & Spares'],
    [236, 'Fuel & Consumables'],
    [237, 'Work in Progress (WIP)'],
    [238, 'Finished Goods'],
    [239, 'Stock-in-Trade (Traded Goods)'],
    [240, 'Scrap / Waste Materials'],
    [241, 'Goods in Transit — Raw Materials'],
    [242, 'Goods in Transit — Finished Goods'],
    [243, 'Provision for Slow Moving / Obsolete Inventory', true],
    [244, 'Stock with Third Parties / on Consignment'],
  ]],
  [1, 'Trade Receivables', [
    [245, 'Debtors — Domestic (Trade)'],
    [246, 'Debtors — Export (Foreign)'],
    [247, 'Debtors — Related Parties'],
    [248, 'Debtors — Government / PSU'],
    [249, 'Debtors — MSME'],
    [250, 'Bills Receivable'],
    [251, 'Cheques Dishonoured (Pending Recovery)'],
    [252, 'Post-dated Cheques Receivable'],
    [253, 'Debtors — Retention Money'],
    [254, 'Factored Receivables'],
    [255, 'Discounted Bills (Contingent — Memo)'],
    [256, 'Provision for Bad & Doubtful Debts', true],
    [257, 'Bad Debts Written Off Account'],
  ]],
  [1, 'Cash & Cash Equivalents', [
    [258, 'Cash in Hand — Main / Head Office'],
    [259, 'Cash in Hand — Branch 1'],
    [260, 'Cash in Hand — Branch 2'],
    [261, 'Petty Cash'],
    [262, 'Cheques / DDs in Hand (in Transit)'],
  ]],
  [1, 'Bank Balances', [
    [263, 'Current Account — Bank 1'],
    [264, 'Current Account — Bank 2'],
    [265, 'Savings Account'],
    [266, 'Cash Credit Account (when in debit balance)'],
    [267, 'Overdraft Account (when in debit balance)'],
    [268, 'Foreign Currency Account'],
    [269, 'Online Payment Gateway Account'],
  ]],
  [1, 'Cash Equivalents', [
    [270, 'Fixed Deposit Account (< 3 months)'],
  ]],
  [1, 'Short-term Loans & Advances', [
    [271, 'Advance to Suppliers (Short-term)'],
    [272, 'Advance for Expenses (Short-term)'],
    [273, 'Advance to Employees (Short-term)'],
    [274, 'Security Deposits Paid (Short-term)'],
    [275, 'Prepaid Expenses (Short-term)'],
    [276, 'Advance Income Tax Paid (Current Year)'],
    [277, 'TDS Receivable — Sec 194C (Contractors)'],
    [278, 'TDS Receivable — Sec 194H (Commission)'],
    [279, 'TDS Receivable — Sec 194I (Rent)'],
    [280, 'TDS Receivable — Sec 194J (Professional Fees)'],
    [281, 'TDS Receivable — Sec 194A (Interest)'],
    [282, 'TDS Receivable — Other Sections'],
    [283, 'TCS Receivable'],
    [284, 'Export Benefit Receivable (Short-term)'],
    [285, 'Balance with Customs / Excise'],
    [286, 'Balance with GST Authorities (Non-ITC)'],
    [287, 'Inter-branch / Inter-unit Receivable'],
    [288, 'Receivable from Subsidiaries (Short-term)'],
    [289, 'Advances to Directors (Short-term)'],
    [290, 'Other Short-term Loans & Advances'],
  ]],
  [1, 'Other Current Assets', [
    [291, 'Interest Accrued on Fixed Deposits'],
    [292, 'Interest Accrued on Loans Given'],
    [293, 'Interest Accrued on Investments'],
    [294, 'Dividend Receivable'],
    [295, 'Claims Receivable — Insurance'],
    [296, 'Export Incentive Receivable (RoDTEP / MEIS)'],
    [297, 'Receivable from Employees'],
    [299, 'Income Tax Refund Receivable'],
    [300, 'Unamortised Expenses (Short-term)'],
    [301, 'Accrued Revenue / Unbilled Revenue'],
    [302, 'Other Receivables'],
    [303, 'Suspense Account — Current'],
  ]],
  [1, 'GST — Input Tax Credit', [
    [304, 'CGST Input Tax Credit Receivable'],
    [305, 'SGST / UTGST Input Tax Credit Receivable'],
    [306, 'IGST Input Tax Credit Receivable'],
    [307, 'GST — RCM Input Tax Credit Receivable'],
  ]],
  [1, 'GST — Refund', [
    [308, 'GST Refund Receivable'],
  ]],
  [1, 'GST — Reconciliation', [
    [309, 'GST — Annual Adjustment Account'],
  ]],
  [1, 'GST — Legacy', [
    [310, 'GST — Transition Credit (TRAN-1)'],
  ]],
  [1, 'Suspense & Clearing', [
    [311, 'Suspense Account — General'],
    [312, 'Difference in Books Account (Rounding)'],
    [313, 'Opening Balance Difference Account'],
    [314, 'Payroll Clearing Account'],
    [315, 'Bank Reconciliation Suspense'],
    [316, 'Journal Voucher Clearing Account'],
    [317, 'Inter-branch Settlement Account'],
    [318, 'Inter-company Settlement Account'],
    [319, 'Cash Transit Account'],
    [320, 'Cheque in Transit — Outgoing'],
    [321, 'Cheque in Transit — Incoming'],
    [322, 'Bank Transfer Clearing Account'],
    [323, 'TDS Clearing Account'],
    [324, 'GST Clearing Account'],
    [325, 'Salary Advance Clearing Account'],
    [326, 'Vendor Prepayment Clearing Account'],
    [327, 'Customer Prepayment Clearing Account'],
    [328, 'Goods in Transit Clearing'],
    [329, 'Error Suspense Account'],
    [330, 'System Migration Adjustment Account'],
  ]],

  // ═══════════════ PART C — INCOME ═══════════════
  [2, 'Other Income', [
    [331, 'Profit on Sale of Fixed Assets'],
    [332, 'Interest Income — Fixed Deposits'],
    [333, 'Interest Income — Loans Given'],
    [334, 'Interest Income — Debentures / Bonds'],
    [335, 'Dividend Income — Equity Shares'],
    [336, 'Dividend Income — Mutual Funds'],
    [337, 'Profit on Sale of Investments'],
    [338, 'Rent Received'],
    [339, 'Commission Received'],
    [340, 'Discount Received'],
    [341, 'Liabilities Written Back'],
    [342, 'Provisions Written Back'],
    [343, 'Miscellaneous Income'],
    [344, 'Foreign Exchange Gain'],
    [345, 'Insurance Claim Received'],
  ]],
  [2, 'Revenue from Operations', [
    [346, 'Sales — Domestic Products / Goods'],
    [347, 'Sales — Export'],
    [348, 'Sales — Traded Goods'],
    [349, 'Sales — Services Rendered'],
    [350, 'Sales — Projects / Contracts'],
    [351, 'Service Revenue — Maintenance Contracts'],
    [352, 'Service Revenue — Consultancy'],
    [353, 'Revenue from Long-term Contracts'],
    [354, 'Sales Returns & Allowances', true],
    [355, 'Trade Discounts Allowed', true],
    [356, 'Revenue from Royalties'],
    [357, 'Revenue from Licensing'],
    [358, 'Revenue from Commission'],
    [359, 'Revenue from Subscription'],
    [360, 'Sales — E-commerce / Online'],
    [361, 'Sales — Government Contracts'],
    [362, 'Revenue from Franchisees'],
    [363, 'Other Operating Revenue'],
  ]],

  // ═══════════════ PART D — EXPENSES ═══════════════
  [3, 'Tax Expense', [
    [364, 'Deferred Tax Expense / Income (P&L charge)'],
    [365, 'Current Tax Expense (Income Tax)'],
    [366, 'MAT (Minimum Alternate Tax) Expense'],
    [367, 'Income Tax — Short / Excess Provision (Prior Year)'],
    [368, 'Tax Expense — Others'],
  ]],
  [3, 'Exceptional Items', [
    [522, 'Exceptional Items — Loss / Expense'],
    [523, 'Exceptional Items — Gain / Income', true],
  ]],
  [3, 'Other Expenses', [
    [369, 'Loss on Sale of Fixed Assets'],
  ]],
  [3, 'Cost of Materials Consumed', [
    [370, 'Opening Stock — Raw Materials'],
    [371, 'Purchases — Raw Materials (Domestic)'],
    [372, 'Purchases — Raw Materials (Import)'],
    [373, 'Freight Inward on Raw Materials'],
    [374, 'Custom Duty on Import of Raw Materials'],
    [375, 'Closing Stock — Raw Materials', true],
    [376, 'Opening Stock — Packing Materials'],
    [377, 'Purchases — Packing Materials'],
    [378, 'Closing Stock — Packing Materials', true],
    [379, 'Purchase Returns', true],
    [380, 'Carriage Inward / Freight Inward'],
  ]],
  [3, 'Changes in Inventories', [
    [381, 'Opening Stock — WIP'],
    [382, 'Closing Stock — WIP', true],
    [383, 'Opening Stock — Finished Goods'],
    [384, 'Closing Stock — Finished Goods', true],
  ]],
  [3, 'Purchases of Stock-in-Trade', [
    [385, 'Opening Stock — Traded Goods'],
    [386, 'Purchases — Traded Goods'],
    [387, 'Closing Stock — Traded Goods', true],
  ]],
  [3, 'Direct Expenses', [
    [388, 'Direct Labour / Manufacturing Wages'],
    [389, 'Power & Fuel — Manufacturing'],
    [390, 'Repairs & Maintenance — Plant'],
    [391, 'Repairs & Maintenance — Buildings (Factory)'],
    [392, 'Factory Rent'],
    [393, 'Factory Insurance'],
    [394, 'Royalty on Production'],
    [395, 'Subcontracting / Job Work Charges'],
    [396, 'Quality Control / Testing Charges'],
    [397, 'Packing & Forwarding Charges'],
    [398, 'Stores & Spares Consumed'],
    [399, 'Fuel Consumed'],
    [400, 'Direct Project Expenses'],
    [401, 'Sub-contract Labour'],
    [402, 'Equipment Hire Charges'],
    [403, 'Processing Charges'],
    [404, 'Material Handling Charges'],
    [405, 'Defective / Rejected Materials Written Off'],
    [406, 'Scrap Sales (Contra — Reduces Cost)', true],
    [407, 'Labour Welfare Charges (Factory)'],
    [408, 'Safety Equipment & Consumables'],
    [409, 'Laboratory / Testing Consumables'],
    [410, 'Tooling Costs'],
    [411, 'Dies & Moulds Consumed'],
    [412, 'Assembly Charges'],
    [413, 'Loading & Unloading Charges (Inward)'],
    [414, 'Water Charges — Factory'],
    [415, 'Environmental Compliance Costs'],
    [416, 'Factory Overheads — General'],
    [417, 'Cost of Services Rendered (Direct)'],
    [418, 'Direct Expenses — Others'],
  ]],
  [3, 'Employee Benefits Expense', [
    [419, 'Salaries & Wages'],
    [420, 'Director Remuneration'],
    [421, 'Bonus & Incentives'],
    [422, 'Leave Encashment (P&L charge)'],
    [423, 'Gratuity Expense'],
    [424, 'Provident Fund — Employer\'s Contribution'],
    [425, 'ESI — Employer\'s Contribution'],
    [426, 'Staff Welfare Expenses'],
    [427, 'Medical Reimbursement'],
    [428, 'LTA — Leave Travel Allowance'],
    [429, 'HRA — House Rent Allowance'],
    [430, 'Conveyance Allowance'],
    [431, 'Vehicle Allowance'],
    [432, 'Mobile & Internet Allowance'],
    [433, 'Uniform & Livery Expenses'],
    [434, 'Canteen Expenses'],
    [435, 'Training & Development Expenses'],
    [436, 'Recruitment Expenses'],
    [437, 'ESOP / Share-based Expense'],
    [438, 'Superannuation Fund Contribution'],
    [439, 'National Pension Scheme Contribution'],
    [440, 'Group Insurance Premium'],
    [441, 'Group Term Life Insurance'],
    [442, 'Workmen Compensation'],
    [443, 'Labour Contract Charges (Indirect)'],
    [444, 'Temporary / Contractual Staff Cost'],
    [445, 'Payroll Processing Charges'],
    [446, 'HR Consultancy Charges'],
    [447, 'Key Managerial Personnel Remuneration'],
    [448, 'Non-executive Director Sitting Fees'],
  ]],
  [3, 'Finance Costs', [
    [449, 'Interest on Term Loans'],
    [450, 'Interest on Working Capital / Cash Credit'],
    [451, 'Interest on Debentures'],
    [452, 'Interest on Public Deposits'],
    [453, 'Bank Charges & Commission'],
    [454, 'Loan Processing Fees'],
    [455, 'Commitment Charges'],
    [456, 'Foreign Exchange Loss (Finance Related)'],
    [457, 'Premium on Redemption of Debentures (Amortised)'],
    [458, 'Unwinding of Discount on Provisions'],
    [459, 'Other Borrowing Costs'],
  ]],
  [3, 'Depreciation & Amortisation', [
    [460, 'Depreciation — Tangible Assets'],
    [461, 'Depreciation — Leased Assets (Right-of-use)'],
    [462, 'Amortisation — Intangible Assets'],
    [463, 'Impairment Loss on Fixed Assets'],
    [464, 'Impairment Loss on Intangible Assets'],
  ]],
  [3, 'Other Expenses — Administration', [
    [465, 'Rent — Office'],
    [466, 'Rates & Taxes (Excluding Income Tax)'],
    [467, 'Municipal Taxes / Property Tax'],
    [468, 'Professional Tax — Employer\'s Share'],
    [469, 'Electricity & Power — Office'],
    [470, 'Water Charges — Office'],
    [471, 'Office Maintenance Expenses'],
    [472, 'Repairs & Maintenance — Furniture (Office)'],
    [473, 'Repairs & Maintenance — Computers & IT'],
    [474, 'Printing & Stationery'],
    [475, 'Postage & Courier'],
    [476, 'Telephone & Internet — Office'],
    [477, 'Office Supplies'],
    [478, 'Books & Periodicals'],
    [479, 'Legal & Professional Charges'],
    [480, 'Audit Fees — Statutory Audit'],
    [481, 'Audit Fees — Internal Audit'],
    [482, 'ROC Filing Fees & Annual Return Expenses'],
    [483, 'Company Secretarial Expenses'],
    [484, 'Board Meeting Expenses'],
    [485, 'Subscription & Membership Fees'],
    [486, 'Donations & Charitable Contributions'],
    [487, 'CSR Expenditure'],
    [488, 'Insurance — Office & General'],
    [489, 'Security Expenses'],
    [490, 'Housekeeping Expenses'],
    [491, 'Car Park Charges'],
    [492, 'Miscellaneous Administrative Expenses'],
  ]],
  [3, 'Other Expenses — Selling', [
    [493, 'Advertisement & Publicity'],
    [494, 'Sales Promotion Expenses'],
    [495, 'Trade Fair & Exhibition Expenses'],
    [496, 'Samples & Free Issues'],
    [497, 'Commission on Sales'],
    [498, 'Discount Allowed'],
    [499, 'Freight Outward / Delivery Charges'],
    [500, 'Sales Force Expenses (Travel & DA)'],
    [501, 'Customer Entertainment'],
    [502, 'Bad Debts Written Off'],
    [503, 'Provision for Bad & Doubtful Debts (P&L)'],
    [504, 'After-sales Service Costs'],
    [505, 'Warranty Claims Expenses'],
    [506, 'Online Marketing / Digital Advertising'],
    [507, 'Packaging & Dispatch Expenses'],
    [508, 'Export Expenses (Freight & Insurance)'],
    [509, 'Foreign Exchange Loss (Operations)'],
    [510, 'E-commerce Platform Commission'],
    [511, 'Royalty Paid (Revenue / Sales Based)'],
  ]],
  [3, 'Other Expenses — Write-offs', [
    [512, 'Loss on Sale of Investments'],
    [513, 'Prior Period Expenses'],
    [514, 'Penalties & Fines'],
    [515, 'Obsolete Stock Written Off'],
    [516, 'Miscellaneous Expenses Written Off'],
    [517, 'Preliminary Expenses Written Off'],
    [518, 'Deferred Revenue Expenditure Written Off'],
  ]],
  [3, 'GST — ITC', [
    [519, 'GST — ITC Reversal Account'],
    [520, 'GST — ITC Blocked (Non-eligible)'],
  ]],
];

// ── Build MASTER_COA array ──────────────────────────────────────────
export const MASTER_COA: MasterAccount[] = [];
for (const [pgIdx, subGroup, accounts] of GROUPS) {
  const primaryGroup = PG[pgIdx];
  const nature = deriveNature(primaryGroup, subGroup);
  for (const entry of accounts) {
    const contra = entry.length === 3 ? (entry[2] as boolean) : false;
    const name = entry[1] as string;
    const isInventorySensitive =
      subGroup === 'Inventories' ||
      subGroup === 'Cost of Materials Consumed' ||
      subGroup === 'Changes in Inventories' ||
      subGroup === 'Purchases of Stock-in-Trade' ||
      (subGroup === 'Direct Expenses' &&
        [
          'Stores & Spares Consumed',
          'Fuel Consumed',
          'Defective / Rejected Materials Written Off',
          'Scrap Sales (Contra — Reduces Cost)',
          'Packing & Forwarding Charges',
          'Material Handling Charges',
          'Loading & Unloading Charges (Inward)',
        ].includes(name)) ||
      (subGroup === 'Other Expenses — Write-offs' &&
        ['Obsolete Stock Written Off', 'Stock Shortage', 'Abnormal Loss'].includes(name)) ||
      (subGroup === 'Revenue from Operations' &&
        (name.startsWith('Sales —') || name === 'Sales Returns & Allowances'));

    MASTER_COA.push({
      id: entry[0] as number,
      name,
      primaryGroup,
      subGroup,
      nature,
      contra,
      isInventorySensitive: isInventorySensitive || undefined,
    });
  }
}

// ── Lookup indexes (lazy-init) ──────────────────────────────────────
let _exactMap: Map<string, MasterAccount> | null = null;
let _lowerMap: Map<string, MasterAccount> | null = null;

function ensureMaps() {
  if (_exactMap) return;
  _exactMap = new Map();
  _lowerMap = new Map();
  for (const a of MASTER_COA) {
    _exactMap.set(a.name, a);
    const lower = a.name.toLowerCase();
    if (!_lowerMap.has(lower)) _lowerMap.set(lower, a);
  }
}

// Common short-name aliases that users type but don't match VAARTA names exactly
const ALIASES: Record<string, { subGroup: string; nature: JournalNature; contra: boolean }> = {
  'cash': { subGroup: 'Cash & Cash Equivalents', nature: 'asset', contra: false },
  'cash a/c': { subGroup: 'Cash & Cash Equivalents', nature: 'asset', contra: false },
  'cash account': { subGroup: 'Cash & Cash Equivalents', nature: 'asset', contra: false },
  'petty cash': { subGroup: 'Cash & Cash Equivalents', nature: 'asset', contra: false },
  'bank': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'bank a/c': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'bank account': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'bank – current a/c': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'bank – savings a/c': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'capital': { subGroup: 'Share Capital', nature: 'capital', contra: false },
  'capital account': { subGroup: 'Share Capital', nature: 'capital', contra: false },
  'drawings': { subGroup: 'Share Capital', nature: 'capital', contra: true },
  'sales': { subGroup: 'Revenue from Operations', nature: 'revenue', contra: false },
  'sale': { subGroup: 'Revenue from Operations', nature: 'revenue', contra: false },
  'purchases': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'purchase': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'purchase returns': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: true },
  'purchase return': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: true },
  'sales returns': { subGroup: 'Revenue from Operations', nature: 'revenue', contra: true },
  'sales return': { subGroup: 'Revenue from Operations', nature: 'revenue', contra: true },
  'sundry debtors': { subGroup: 'Trade Receivables', nature: 'asset', contra: false },
  'sundry creditors': { subGroup: 'Trade Payables', nature: 'liability', contra: false },
  'trade payables': { subGroup: 'Trade Payables', nature: 'liability', contra: false },
  'trade payable': { subGroup: 'Trade Payables', nature: 'liability', contra: false },
  'stock-in-trade': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'opening stock': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'closing stock': { subGroup: 'Changes in Inventories', nature: 'expense', contra: true },
  'salary': { subGroup: 'Employee Benefits Expense', nature: 'expense', contra: false },
  'salaries': { subGroup: 'Employee Benefits Expense', nature: 'expense', contra: false },
  'wages': { subGroup: 'Employee Benefits Expense', nature: 'expense', contra: false },
  'rent': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'electricity': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'telephone & internet': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'printing & stationery': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'travelling expenses': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'conveyance': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'repairs & maintenance': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'bank charges': { subGroup: 'Finance Costs', nature: 'expense', contra: false },
  'interest paid': { subGroup: 'Finance Costs', nature: 'expense', contra: false },
  'interest received': { subGroup: 'Other Income', nature: 'revenue', contra: false },
  'commission paid': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'commission received': { subGroup: 'Other Income', nature: 'revenue', contra: false },
  'discount received': { subGroup: 'Other Income', nature: 'revenue', contra: false },
  'discount allowed': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'miscellaneous expenses': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'depreciation': { subGroup: 'Depreciation & Amortisation', nature: 'expense', contra: false },
  'input cgst': { subGroup: 'GST — Input Tax Credit', nature: 'asset', contra: false },
  'input sgst': { subGroup: 'GST — Input Tax Credit', nature: 'asset', contra: false },
  'input igst': { subGroup: 'GST — Input Tax Credit', nature: 'asset', contra: false },
  'output cgst': { subGroup: 'GST — Output Tax', nature: 'liability', contra: false },
  'output sgst': { subGroup: 'GST — Output Tax', nature: 'liability', contra: false },
  'output igst': { subGroup: 'GST — Output Tax', nature: 'liability', contra: false },
  'raw material': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'raw materials': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'work-in-progress': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'finished goods': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'cost of goods sold': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'consumption of raw materials': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'stores consumed': { subGroup: 'Direct Expenses', nature: 'expense', contra: false },
  'stock shortage': { subGroup: 'Other Expenses — Write-offs', nature: 'expense', contra: false },
  'stock write-off': { subGroup: 'Other Expenses — Write-offs', nature: 'expense', contra: false },
  'abnormal loss': { subGroup: 'Other Expenses — Write-offs', nature: 'expense', contra: false },
  'stock excess': { subGroup: 'Other Income', nature: 'revenue', contra: false },
  'bad debts': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'advertisement': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'insurance': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'freight inward': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'freight outward': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'carriage inward': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'carriage outward': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },

  // Control-account / header names so every COA type routes correctly
  'trade receivables': { subGroup: 'Trade Receivables', nature: 'asset', contra: false },
  'trade receivable': { subGroup: 'Trade Receivables', nature: 'asset', contra: false },
  'inventories': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'inventory': { subGroup: 'Inventories', nature: 'asset', contra: false },
  'bank balances': { subGroup: 'Bank Balances', nature: 'asset', contra: false },
  'cash equivalents': { subGroup: 'Cash Equivalents', nature: 'asset', contra: false },
  'tangible fixed assets': { subGroup: 'Tangible Fixed Assets', nature: 'asset', contra: false },
  'intangible assets': { subGroup: 'Intangible Assets', nature: 'asset', contra: false },
  'accumulated depreciation': { subGroup: 'Accumulated Depreciation', nature: 'asset', contra: true },
  'accumulated amortisation': { subGroup: 'Accumulated Amortisation', nature: 'asset', contra: true },
  'capital work in progress': { subGroup: 'Capital Work in Progress', nature: 'asset', contra: false },
  'non-current investments': { subGroup: 'Non-current Investments', nature: 'asset', contra: false },
  'current investments': { subGroup: 'Current Investments', nature: 'asset', contra: false },
  'long-term loans & advances': { subGroup: 'Long-term Loans & Advances', nature: 'asset', contra: false },
  'short-term loans & advances': { subGroup: 'Short-term Loans & Advances', nature: 'asset', contra: false },
  'other current assets': { subGroup: 'Other Current Assets', nature: 'asset', contra: false },
  'other non-current assets': { subGroup: 'Other Non-current Assets', nature: 'asset', contra: false },
  'gst — input tax credit': { subGroup: 'GST — Input Tax Credit', nature: 'asset', contra: false },
  'gst input': { subGroup: 'GST — Input Tax Credit', nature: 'asset', contra: false },
  'gst — output tax': { subGroup: 'GST — Output Tax', nature: 'liability', contra: false },
  'gst output': { subGroup: 'GST — Output Tax', nature: 'liability', contra: false },
  'deferred tax asset': { subGroup: 'Deferred Tax Asset', nature: 'asset', contra: false },
  'deferred tax liability': { subGroup: 'Deferred Tax Liability', nature: 'liability', contra: false },
  'suspense & clearing': { subGroup: 'Suspense & Clearing', nature: 'asset', contra: false },
  'suspense': { subGroup: 'Suspense & Clearing', nature: 'asset', contra: false },

  'share capital': { subGroup: 'Share Capital', nature: 'capital', contra: false },
  'reserves & surplus': { subGroup: 'Reserves & Surplus', nature: 'capital', contra: false },
  'reserves and surplus': { subGroup: 'Reserves & Surplus', nature: 'capital', contra: false },
  'long-term borrowings': { subGroup: 'Long-term Borrowings', nature: 'liability', contra: false },
  'short-term borrowings': { subGroup: 'Short-term Borrowings', nature: 'liability', contra: false },
  'other current liabilities': { subGroup: 'Other Current Liabilities', nature: 'liability', contra: false },
  'statutory liabilities': { subGroup: 'Statutory Liabilities', nature: 'liability', contra: false },
  'short-term provisions': { subGroup: 'Short-term Provisions', nature: 'liability', contra: false },
  'long-term provisions': { subGroup: 'Long-term Provisions', nature: 'liability', contra: false },
  'other long-term liabilities': { subGroup: 'Other Long-term Liabilities', nature: 'liability', contra: false },
  'revenue from operations': { subGroup: 'Revenue from Operations', nature: 'revenue', contra: false },
  'other income': { subGroup: 'Other Income', nature: 'revenue', contra: false },
  'cost of materials consumed': { subGroup: 'Cost of Materials Consumed', nature: 'expense', contra: false },
  'purchases of stock-in-trade': { subGroup: 'Purchases of Stock-in-Trade', nature: 'expense', contra: false },
  'changes in inventories': { subGroup: 'Changes in Inventories', nature: 'expense', contra: false },
  'direct expenses': { subGroup: 'Direct Expenses', nature: 'expense', contra: false },
  'employee benefits expense': { subGroup: 'Employee Benefits Expense', nature: 'expense', contra: false },
  'finance costs': { subGroup: 'Finance Costs', nature: 'expense', contra: false },
  'depreciation & amortisation': { subGroup: 'Depreciation & Amortisation', nature: 'expense', contra: false },
  'other expenses — administration': { subGroup: 'Other Expenses — Administration', nature: 'expense', contra: false },
  'other expenses — selling': { subGroup: 'Other Expenses — Selling', nature: 'expense', contra: false },
  'other expenses — write-offs': { subGroup: 'Other Expenses — Write-offs', nature: 'expense', contra: false },
  'tax expense': { subGroup: 'Tax Expense', nature: 'expense', contra: false },
  'exceptional items': { subGroup: 'Exceptional Items', nature: 'expense', contra: false },
  'gst — itc': { subGroup: 'GST — ITC', nature: 'expense', contra: false },
};

export interface AccountClassification {
  subGroup: string;
  primaryGroup: PrimaryGroup;
  nature: JournalNature;
  contra: boolean;
  matchedName?: string;
}

/** Classification plus human-readable clarification (what nature and group mean). */
export interface ClassificationWithClarification extends AccountClassification {
  natureMeaning: string;
  primaryGroupMeaning: string;
}

/** Add clarification strings to a classification. Use when showing users what nature/group mean. */
export function getClassificationWithClarification(cls: AccountClassification): ClassificationWithClarification {
  return {
    ...cls,
    natureMeaning: getNatureMeaning(cls.nature),
    primaryGroupMeaning: getPrimaryGroupMeaning(cls.primaryGroup),
  };
}

/**
 * Classify an account name → VAARTA sub-group + nature.
 * Layers: exact match → case-insensitive → alias → keyword contains → null.
 */
export function classifyAccount(name: string): AccountClassification | null {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  ensureMaps();

  // Layer 1: exact match
  const exact = _exactMap!.get(trimmed);
  if (exact) return { subGroup: exact.subGroup, primaryGroup: exact.primaryGroup, nature: exact.nature, contra: exact.contra, matchedName: exact.name };

  // Layer 2: case-insensitive
  const ci = _lowerMap!.get(lower);
  if (ci) return { subGroup: ci.subGroup, primaryGroup: ci.primaryGroup, nature: ci.nature, contra: ci.contra, matchedName: ci.name };

  // Layer 3: alias
  const alias = ALIASES[lower];
  if (alias) return { subGroup: alias.subGroup, primaryGroup: pgForSubGroup(alias.subGroup), nature: alias.nature, contra: alias.contra };

  // Layer 4: keyword-based prefix/contains
  for (const a of MASTER_COA) {
    if (a.name.toLowerCase().startsWith(lower) || lower.startsWith(a.name.toLowerCase())) {
      return { subGroup: a.subGroup, primaryGroup: a.primaryGroup, nature: a.nature, contra: a.contra, matchedName: a.name };
    }
  }

  // Layer 5: keyword contains (check if the account name contains key terms)
  for (const [aliasKey, val] of Object.entries(ALIASES)) {
    if (lower.includes(aliasKey)) {
      return { subGroup: val.subGroup, primaryGroup: pgForSubGroup(val.subGroup), nature: val.nature, contra: val.contra };
    }
  }

  return null;
}

function pgForSubGroup(sg: string): PrimaryGroup {
  return getPrimaryGroupForSubGroup(sg);
}

/** Get primary group (Capital & Liabilities, Assets, Income, Expenses) for a sub-group name. */
export function getPrimaryGroupForSubGroup(sg: string): PrimaryGroup {
  for (const [pgIdx, subGroup] of GROUPS.map(g => [g[0], g[1]] as [number, string])) {
    if (subGroup === sg) return PG[pgIdx];
  }
  return 'Expenses';
}

// ── Utility queries ─────────────────────────────────────────────────

export function getAccountsForSubGroup(subGroup: string): MasterAccount[] {
  return MASTER_COA.filter(a => a.subGroup === subGroup);
}

export function getSubGroupsForPrimaryGroup(pg: PrimaryGroup): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const a of MASTER_COA) {
    if (a.primaryGroup === pg && !seen.has(a.subGroup)) {
      seen.add(a.subGroup);
      result.push(a.subGroup);
    }
  }
  return result;
}

export function getAllSubGroups(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const a of MASTER_COA) {
    if (!seen.has(a.subGroup)) {
      seen.add(a.subGroup);
      result.push(a.subGroup);
    }
  }
  return result;
}

export function getAllAccountNames(): string[] {
  return MASTER_COA.map(a => a.name);
}

/**
 * Sub-groups that belong to Trading Account (debit side).
 * Used by tradingAccountCompute + COGS.
 */
export const TRADING_DEBIT_SUBGROUPS = [
  'Cost of Materials Consumed',
  'Purchases of Stock-in-Trade',
  'Changes in Inventories',
  'Direct Expenses',
];

/**
 * Sub-groups that belong to Trading Account (credit side).
 */
export const TRADING_CREDIT_SUBGROUPS = [
  'Revenue from Operations',
];

/**
 * All expense sub-groups that feed into P&L (below gross profit line).
 */
export const PNL_EXPENSE_SUBGROUPS = [
  'Employee Benefits Expense',
  'Finance Costs',
  'Depreciation & Amortisation',
  'Other Expenses — Administration',
  'Other Expenses — Selling',
  'Other Expenses — Write-offs',
  'Other Expenses',
  'Exceptional Items',
  'Tax Expense',
  'GST — ITC',
];

/**
 * Income sub-groups for P&L (other income, not trading).
 */
export const PNL_INCOME_SUBGROUPS = [
  'Other Income',
];

/**
 * Cash & bank sub-groups for Cash Book.
 */
export const CASH_SUBGROUPS = ['Cash & Cash Equivalents'];
export const BANK_SUBGROUPS = ['Bank Balances'];
export const CASH_EQUIVALENT_SUBGROUPS = ['Cash Equivalents'];
