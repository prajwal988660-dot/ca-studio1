/**
 * Chart of Accounts — Single source of truth.
 *
 * TWO-LAYER MODEL:
 *   LedgerGroup.label     → Tally-style name CAs see (e.g. "Sundry Debtors")
 *   LedgerGroup.scheduleIII → Internal Schedule III sub-group stored in journal_line.account_group
 *                             and used by compute engines (e.g. "Trade Receivables")
 *
 * This file is the ONLY place that defines account structure.
 * masterCOA.ts re-exports from here for backward compatibility.
 */

export type JournalNature = 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';
export type PrimaryGroup = 'Capital & Liabilities' | 'Assets' | 'Income' | 'Expenses';

export interface LedgerGroup {
  id: string;
  label: string;          // Tally-style name — what the CA sees & selects
  description: string;    // Short hint shown in "Under" selector
  scheduleIII: string;    // Stored in journal_line.account_group → drives all compute engines
  primaryGroup: PrimaryGroup;
  nature: JournalNature;
  normalBalance: 'debit' | 'credit';
  defaultAccounts: string[];  // Pre-seeded common ledger names under this group
}

// ─────────────────────────────────────────────────────────────────────────────
// THE 26 GROUPS
// ─────────────────────────────────────────────────────────────────────────────

export const LEDGER_GROUPS: LedgerGroup[] = [

  /* ── CAPITAL & LIABILITIES ── */

  {
    id: 'capital_account',
    label: 'Capital Account',
    description: 'Owner / shareholder equity, share capital, proprietor\'s capital',
    scheduleIII: 'Share Capital',
    primaryGroup: 'Capital & Liabilities',
    nature: 'capital',
    normalBalance: 'credit',
    defaultAccounts: [
      'Proprietor\'s Capital Account',
      'Drawings Account',
    ],
  },

  {
    id: 'partners_capital',
    label: 'Partners\' Capital',
    description: 'Capital accounts of partners (Partnership / LLP)',
    scheduleIII: 'Share Capital',
    primaryGroup: 'Capital & Liabilities',
    nature: 'capital',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'reserves_surplus',
    label: 'Reserves & Surplus',
    description: 'General reserve, retained earnings, securities premium',
    scheduleIII: 'Reserves & Surplus',
    primaryGroup: 'Capital & Liabilities',
    nature: 'capital',
    normalBalance: 'credit',
    defaultAccounts: [
      'Retained Earnings / Surplus in P&L',
    ],
  },

  {
    id: 'share_warrants',
    label: 'Money Against Share Warrants',
    description: 'Money received against share warrants pending allotment (Schedule III)',
    scheduleIII: 'Money received against share warrants',
    primaryGroup: 'Capital & Liabilities',
    nature: 'capital',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'long_term_loans',
    label: 'Long-term Loans',
    description: 'Term loans, debentures, secured long-term borrowings',
    scheduleIII: 'Long-term Borrowings',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'Term Loans',
    ],
  },

  {
    id: 'sundry_creditors',
    label: 'Sundry Creditors',
    description: 'Trade creditors for goods and services purchased on credit',
    scheduleIII: 'Trade Payables',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'Sundry Creditors',
    ],
  },

  {
    id: 'short_term_borrowings',
    label: 'Short-term Borrowings',
    description: 'Cash credit, overdraft, short-term loans from banks',
    scheduleIII: 'Short-term Borrowings',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'Bank Overdraft',
    ],
  },

  {
    id: 'other_liabilities',
    label: 'Other Liabilities',
    description: 'Outstanding expenses, advance from customers, other payables',
    scheduleIII: 'Other Current Liabilities',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'Outstanding Expenses',
    ],
  },

  {
    id: 'duties_taxes',
    label: 'Duties & Taxes Payable',
    description: 'TDS payable, PF, ESI, income tax, other statutory dues',
    scheduleIII: 'Statutory Liabilities',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'TDS Payable',
    ],
  },

  {
    id: 'gst_output',
    label: 'GST Output Tax',
    description: 'CGST, SGST, IGST output tax collected on sales',
    scheduleIII: 'GST — Output Tax',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'gst_rcm',
    label: 'GST — Reverse Charge (RCM)',
    description: 'GST payable under Reverse Charge Mechanism on purchases from unregistered dealers / notified services',
    scheduleIII: 'GST — RCM',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'gst_advances',
    label: 'GST on Advance Receipts',
    description: 'GST collected on advance payments received from customers before supply',
    scheduleIII: 'GST — Advances',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'GST on Advance Receipts',
    ],
  },

  {
    id: 'short_term_provisions',
    label: 'Short-term Provisions',
    description: 'Provision for employee bonuses, proposed dividends, short-term warranty, leave encashment (< 1 year)',
    scheduleIII: 'Short-term Provisions',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [
      'Provision for Bonus',
      'Provision for Dividend',
      'Provision for Leave Encashment',
    ],
  },

  {
    id: 'deferred_tax_liability',
    label: 'Deferred Tax Liabilities',
    description: 'Timing differences creating future tax obligations (non-current)',
    scheduleIII: 'Deferred Tax Liability',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'other_long_term_liabilities',
    label: 'Other Long-term Liabilities',
    description: 'Security deposits received, deferred revenue (> 1 year)',
    scheduleIII: 'Other Long-term Liabilities',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'long_term_provisions',
    label: 'Long-term Provisions',
    description: 'Provision for gratuity, leave encashment, warranty (non-current)',
    scheduleIII: 'Long-term Provisions',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  /* ── ASSETS ── */

  {
    id: 'fixed_assets',
    label: 'Fixed Assets',
    description: 'Land, buildings, plant & machinery, furniture, vehicles, computers',
    scheduleIII: 'Tangible Fixed Assets',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Furniture & Fixtures',
      'Computers & IT Equipment',
    ],
  },

  {
    id: 'accumulated_depreciation',
    label: 'Provision for Depreciation',
    description: 'Accumulated / provision for depreciation on tangible fixed assets (contra-asset, credit balance)',
    scheduleIII: 'Accumulated Depreciation',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'intangible_assets',
    label: 'Intangible Assets',
    description: 'Goodwill, patents, trademarks, software, brands',
    scheduleIII: 'Intangible Assets',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'accumulated_amortisation',
    label: 'Provision for Amortisation',
    description: 'Accumulated / provision for amortisation on intangible assets (contra-asset, credit balance)',
    scheduleIII: 'Accumulated Amortisation',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'credit',
    defaultAccounts: [],
  },

  {
    id: 'capital_wip',
    label: 'Capital Work-in-Progress',
    description: 'Assets under construction / installation not yet in use',
    scheduleIII: 'Capital Work in Progress',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'deferred_tax_asset',
    label: 'Deferred Tax Assets',
    description: 'Timing differences creating future tax benefits',
    scheduleIII: 'Deferred Tax Asset',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'investments',
    label: 'Investments',
    description: 'Shares in subsidiaries, mutual funds, FDs, long-term investments',
    scheduleIII: 'Non-current Investments',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'current_investments',
    label: 'Current Investments',
    description: 'Short-term investments — liquid mutual funds, treasury bills, short-term FDs (< 1 year)',
    scheduleIII: 'Current Investments',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Liquid Mutual Funds',
      'Short-term Fixed Deposits',
    ],
  },

  {
    id: 'long_term_loans_advances',
    label: 'Long-term Loans & Advances',
    description: 'Capital advances, deposits with govt, loans to subsidiaries (> 1 year)',
    scheduleIII: 'Long-term Loans & Advances',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'other_non_current_assets',
    label: 'Other Non-current Assets',
    description: 'Long-term prepaid expenses, unamortised preliminary expenses',
    scheduleIII: 'Other Non-current Assets',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'sundry_debtors',
    label: 'Sundry Debtors',
    description: 'Trade debtors — customers who owe money for goods/services sold on credit',
    scheduleIII: 'Trade Receivables',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Sundry Debtors',
    ],
  },

  {
    id: 'cash_in_hand',
    label: 'Cash in Hand',
    description: 'Physical cash, petty cash, cash at branches',
    scheduleIII: 'Cash & Cash Equivalents',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Cash in Hand',
    ],
  },

  {
    id: 'bank_accounts',
    label: 'Bank Accounts',
    description: 'Current accounts, savings accounts, OD accounts at banks',
    scheduleIII: 'Bank Balances',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Bank Account',
    ],
  },

  {
    id: 'cash_equivalents',
    label: 'Cash Equivalents',
    description: 'Treasury bills, commercial paper, money market instruments maturing within 3 months',
    scheduleIII: 'Cash Equivalents',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'loans_advances',
    label: 'Loans & Advances',
    description: 'Advances to suppliers, staff loans, security deposits, prepaid expenses',
    scheduleIII: 'Short-term Loans & Advances',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Advance to Suppliers',
    ],
  },

  {
    id: 'stock_inventory',
    label: 'Stock / Inventory',
    description: 'Raw materials, WIP, finished goods, traded goods, stock-in-trade',
    scheduleIII: 'Inventories',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Opening Stock',
      'Closing Stock',
    ],
  },

  {
    id: 'other_current_assets',
    label: 'Other Current Assets',
    description: 'TDS receivable, advance income tax, accrued income',
    scheduleIII: 'Other Current Assets',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'gst_input',
    label: 'GST Input Credit',
    description: 'CGST, SGST, IGST input tax credit receivable on purchases',
    scheduleIII: 'GST — Input Tax Credit',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'gst_refund',
    label: 'GST Refund Receivable',
    description: 'GST refund claimed from department and pending receipt',
    scheduleIII: 'GST — Refund',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'GST Refund Receivable',
    ],
  },

  {
    id: 'gst_reconciliation',
    label: 'GST Reconciliation Account',
    description: 'Temporary GST reconciliation / suspense account for GSTR-2A/2B mismatches',
    scheduleIII: 'GST — Reconciliation',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'GST Reconciliation Suspense',
    ],
  },

  {
    id: 'gst_legacy',
    label: 'GST Legacy / Transition Credit',
    description: 'Transitional input tax credit (TRAN-1 / TRAN-2) carried forward from pre-GST regime (excise, VAT, service tax)',
    scheduleIII: 'GST — Legacy',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'suspense_clearing',
    label: 'Suspense & Clearing',
    description: 'Unidentified receipts/payments pending classification; clearing accounts',
    scheduleIII: 'Suspense & Clearing',
    primaryGroup: 'Assets',
    nature: 'asset',
    normalBalance: 'debit',
    defaultAccounts: [
      'Suspense Account',
      'Clearing Account',
    ],
  },

  /* ── INCOME ── */

  {
    id: 'sales_accounts',
    label: 'Sales Accounts',
    description: 'Revenue from operations — all sales of goods and services',
    scheduleIII: 'Revenue from Operations',
    primaryGroup: 'Income',
    nature: 'revenue',
    normalBalance: 'credit',
    defaultAccounts: [
      'Sales Account',
      'Sales Returns',
    ],
  },

  {
    id: 'other_income',
    label: 'Other Income',
    description: 'Interest, rent received, profit on asset sale, dividends',
    scheduleIII: 'Other Income',
    primaryGroup: 'Income',
    nature: 'revenue',
    normalBalance: 'credit',
    defaultAccounts: [
      'Discount Received',
      'Interest Received',
    ],
  },

  /* ── EXPENSES ── */

  {
    id: 'purchase_accounts',
    label: 'Purchase Accounts',
    description: 'Purchases of raw materials, traded goods, stock-in-trade, freight inward',
    scheduleIII: 'Cost of Materials Consumed',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Purchase Account',
      'Purchase Returns',
    ],
  },

  {
    id: 'direct_expenses',
    label: 'Direct Expenses',
    description: 'Manufacturing / production expenses directly related to goods',
    scheduleIII: 'Direct Expenses',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Direct Labour / Wages',
      'Freight Inward',
    ],
  },

  {
    id: 'indirect_expenses',
    label: 'Indirect Expenses',
    description: 'Admin & selling overheads — rent, electricity, advertising, misc',
    scheduleIII: 'Other Expenses — Administration',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Rent Expense',
      'Office Expenses',
      'Bank Charges',
      'Discount Allowed',
    ],
  },

  {
    id: 'employee_costs',
    label: 'Employee Costs',
    description: 'Salaries, wages, director remuneration, PF, ESI, gratuity, bonus',
    scheduleIII: 'Employee Benefits Expense',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Salaries & Wages',
    ],
  },

  {
    id: 'finance_costs',
    label: 'Finance Costs',
    description: 'Interest on loans, bank charges on borrowings, processing fees',
    scheduleIII: 'Finance Costs',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Interest Expense',
    ],
  },

  {
    id: 'depreciation',
    label: 'Depreciation',
    description: 'Depreciation on fixed assets, amortisation of intangibles',
    scheduleIII: 'Depreciation & Amortisation',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Depreciation Expense',
    ],
  },

  {
    id: 'current_tax',
    label: 'Current Tax',
    description: 'Current year income tax, MAT, short/excess provision of earlier years',
    scheduleIII: 'Tax Expense',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Current Tax Expense',
      'Income Tax Payable',
    ],
  },

  {
    id: 'deferred_tax_pl',
    label: 'Deferred Tax (Expense)',
    description: 'Deferred tax expense or credit recognised in the Statement of Profit & Loss',
    scheduleIII: 'Tax Expense',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'stock_in_trade_purchases',
    label: 'Purchases of Stock-in-Trade',
    description: 'Purchases of goods for resale by trading companies (not manufacturing)',
    scheduleIII: 'Purchases of Stock-in-Trade',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Purchases of Stock-in-Trade',
      'Stock-in-Trade Returns',
    ],
  },

  {
    id: 'inventory_changes',
    label: 'Changes in Inventories',
    description: 'Changes in inventories of finished goods, WIP and stock-in-trade (Opening − Closing)',
    scheduleIII: 'Changes in Inventories',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [],
  },

  {
    id: 'exceptional_items',
    label: 'Exceptional Items',
    description: 'Non-recurring, unusual items — loss on sale of asset, write-offs, restructuring costs',
    scheduleIII: 'Exceptional Items',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'Loss on Sale of Asset',
      'Impairment Loss',
    ],
  },

  {
    id: 'gst_itc',
    label: 'GST — ITC Reversal / Blocked',
    description: 'ITC reversal on exempt supplies, personal use, ineligible credits (Rule 42/43), and permanently blocked ITC (Section 17(5))',
    scheduleIII: 'GST — ITC',
    primaryGroup: 'Expenses',
    nature: 'expense',
    normalBalance: 'debit',
    defaultAccounts: [
      'GST — ITC Reversal Account',
      'GST — ITC Blocked (Non-eligible)',
    ],
  },

  {
    id: 'other_comprehensive_income',
    label: 'Other Comprehensive Income',
    description: 'Remeasurement of defined benefit plans, FVOCI investments, forex translation (Ind AS Schedule III)',
    scheduleIII: 'Other Comprehensive Income',
    primaryGroup: 'Income',
    nature: 'revenue',
    normalBalance: 'credit',
    defaultAccounts: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getGroupById(id: string): LedgerGroup | undefined {
  return LEDGER_GROUPS.find((g) => g.id === id);
}

export function getGroupByScheduleIII(sgIII: string): LedgerGroup | undefined {
  return LEDGER_GROUPS.find((g) => g.scheduleIII === sgIII);
}

/** All default account names across all groups, in one flat list */
export function getAllDefaultAccounts(): Array<{ name: string; group: LedgerGroup }> {
  return LEDGER_GROUPS.flatMap((g) => g.defaultAccounts.map((name) => ({ name, group: g })));
}

/** Find which group a default account belongs to (exact/case-insensitive match) */
export function classifyDefaultAccount(name: string): LedgerGroup | null {
  const q = name.trim().toLowerCase();
  for (const g of LEDGER_GROUPS) {
    for (const a of g.defaultAccounts) {
      if (a.toLowerCase() === q) return g;
    }
  }
  return null;
}

/**
 * Classify any account name → LedgerGroup.
 * Used by AI and auto-classification to get scheduleIII + nature.
 *
 * Priority:
 * 1. Exact match in defaultAccounts
 * 2. Keyword-based routing (patterns in account name)
 * 3. Null (caller must show classification dialog)
 */
export function classifyAccount(name: string): LedgerGroup | null {
  // 1. Exact / case-insensitive match in defaults
  const exact = classifyDefaultAccount(name);
  if (exact) return exact;

  // 2. Keyword routing
  const n = name.toLowerCase();

  if (/\b(sales|revenue|turnover|income from operations|operating income)\b/.test(n) && !/return|allowance|refund/.test(n)) return getGroupById('sales_accounts')!;
  if (/\b(purchase|raw material|stock.in.trade|carriage inward)\b/.test(n)) return getGroupById('purchase_accounts')!;
  if (/\b(salary|wage|remuneration|pf contribution|esi contribution|gratuity|bonus|staff)\b/.test(n)) return getGroupById('employee_costs')!;
  if (/\b(depreciation)\b/.test(n)) return getGroupById('depreciation')!;
  if (/\b(amortis|amortiz)\b/.test(n)) return getGroupById('depreciation')!;
  if (/\b(interest on|bank charges|loan processing|finance cost)\b/.test(n)) return getGroupById('finance_costs')!;
  if (/\b(current tax|income tax|mat|short provision|excess provision|prior year tax)\b/.test(n)) return getGroupById('current_tax')!;
  if (/\b(deferred tax expense|deferred tax.*charge|deferred tax.*credit)\b/.test(n)) return getGroupById('deferred_tax_pl')!;
  if (/\b(rent |electricity|telephone|internet|printing|stationery|legal|professional|audit fee|advertisement|freight outward|bad debt|insurance|repair|maintenance|conveyance|travelling)\b/.test(n)) return getGroupById('indirect_expenses')!;
  if (/\b(direct labour|manufacturing wage|factory|power.*fuel|packaging|job work|royalt)\b/.test(n)) return getGroupById('direct_expenses')!;
  if (/\b(cash in hand|petty cash)\b/.test(n)) return getGroupById('cash_in_hand')!;
  if (/\b(bank|current account|savings account|overdraft|od account)\b/.test(n) && !/long.term|noncurrent|nonoperating/.test(n)) return getGroupById('bank_accounts')!;
  if (/\b(sundry debtor|trade debtor|receivable|bills receivable|debtor)\b/.test(n)) return getGroupById('sundry_debtors')!;
  if (/\b(sundry creditor|trade creditor|payable|bills payable|creditor|advance from customer)\b/.test(n)) return getGroupById('sundry_creditors')!;
  if (/\b(capital|equity share|preference share|proprietor|owner equity|authorised capital)\b/.test(n)) return getGroupById('capital_account')!;
  if (/\b(partner.s capital|partner.s current|partner.s drawing)\b/.test(n)) return getGroupById('partners_capital')!;
  if (/\b(reserve|surplus|retained earning|securities premium|general reserve)\b/.test(n)) return getGroupById('reserves_surplus')!;
  if (/\b(term loan|long.term borrow|debenture)\b/.test(n)) return getGroupById('long_term_loans')!;
  if (/\b(cash credit|short.term loan|overdraft from bank|commercial paper)\b/.test(n)) return getGroupById('short_term_borrowings')!;
  if (/\b(land|building|plant|machinery|furniture|computer|vehicle|equipment)\b/.test(n) && !/accumulated dep/.test(n)) return getGroupById('fixed_assets')!;
  if (/\b(goodwill|patent|trademark|brand|software|intangible)\b/.test(n)) return getGroupById('intangible_assets')!;
  if (/\b(investment|mutual fund|shares.*subsidiary|nsc|kvp)\b/.test(n)) return getGroupById('investments')!;
  if (/\b(stock|inventory|closing stock|opening stock|work.in.progress|wip)\b/.test(n)) return getGroupById('stock_inventory')!;
  if (/\b(tds payable|pf payable|esi payable|statutory|provision for tax)\b/.test(n)) return getGroupById('duties_taxes')!;
  if (/\b(cgst output|sgst output|igst output|gst.*output|gst.*payable|rcm liability)\b/.test(n)) return getGroupById('gst_output')!;
  if (/\b(cgst input|sgst input|igst input|gst.*input|gst.*receivable|itc)\b/.test(n)) return getGroupById('gst_input')!;
  if (/\b(advance.*tax|tds receivable|income tax.*refund|accrued income|prepaid)\b/.test(n)) return getGroupById('other_current_assets')!;
  if (/\b(advance.*supplier|staff advance|security deposit|loans.*advance)\b/.test(n)) return getGroupById('loans_advances')!;
  if (/\b(outstanding.*expense|salary payable|rent payable|audit.*payable)\b/.test(n)) return getGroupById('other_liabilities')!;
  if (/\b(interest income|rent received|dividend|commission received|discount received|forex gain|miscellaneous income)\b/.test(n)) return getGroupById('other_income')!;
  if (/\b(deferred tax liabilit)\b/.test(n)) return getGroupById('deferred_tax_liability')!;
  if (/\b(deferred tax asset|mat credit entitlement)\b/.test(n)) return getGroupById('deferred_tax_asset')!;
  if (/\b(other long.term liabilit|security deposit.*received|deferred revenue.*long)\b/.test(n)) return getGroupById('other_long_term_liabilities')!;
  if (/\b(long.term provision|provision.*gratuity|provision.*leave encash|provision.*warranty)\b/.test(n)) return getGroupById('long_term_provisions')!;
  if (/\b(capital work.in.progress|cwip|capital wip|asset.*under.*construct)\b/.test(n)) return getGroupById('capital_wip')!;
  if (/\b(long.term loans.*advance|capital advance|loan.*subsidiary|loan.*associate)\b/.test(n)) return getGroupById('long_term_loans_advances')!;
  if (/\b(other non.current asset|unamortis|preliminary expense|deferred revenue expenditure)\b/.test(n)) return getGroupById('other_non_current_assets')!;
  if (/\b(share warrant|warrant.*application|money.*warrant)\b/.test(n)) return getGroupById('share_warrants')!;
  if (/\b(short.term provision|provision.*bonus|provision.*dividend|provision.*leave encash.*short)\b/.test(n)) return getGroupById('short_term_provisions')!;
  if (/\b(rcm.*payable|reverse charge.*payable|gst.*rcm|rcm.*gst)\b/.test(n)) return getGroupById('gst_rcm')!;
  if (/\b(gst.*advance receipt|tax.*advance.*receiv|gst on advance)\b/.test(n)) return getGroupById('gst_advances')!;
  if (/\b(provision.*depreciation|accumulated depreciation|accumulated dep|dep.*provision)\b/.test(n)) return getGroupById('accumulated_depreciation')!;
  if (/\b(provision.*amortis|accumulated amortis|amortis.*provision)\b/.test(n)) return getGroupById('accumulated_amortisation')!;
  if (/\b(current investment|liquid.*fund|short.term.*fd|short.term fixed deposit|liquid mutual)\b/.test(n)) return getGroupById('current_investments')!;
  if (/\b(treasury bill|t.bill|commercial paper|money market instrument|cash equivalent)\b/.test(n)) return getGroupById('cash_equivalents')!;
  if (/\b(gst refund|refund.*gst|gst.*refund.*receiv)\b/.test(n)) return getGroupById('gst_refund')!;
  if (/\b(gst reconcil|gst.*mismatch|gstr.2[ab].*reconcil)\b/.test(n)) return getGroupById('gst_reconciliation')!;
  if (/\b(tran.1|tran.2|transition credit|pre.gst credit|excise credit.*gst|vat credit.*gst)\b/.test(n)) return getGroupById('gst_legacy')!;
  if (/\b(itc reversal|itc blocked|itc.*ineligible|blocked.*itc|rule 42|rule 43|section 17.5)\b/.test(n)) return getGroupById('gst_itc')!;
  if (/\b(suspense|clearing account|unidentified)\b/.test(n)) return getGroupById('suspense_clearing')!;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE ENGINE ARRAYS  (compute engines import these — do NOT rename)
// These map scheduleIII values to accounting statement lines.
// ─────────────────────────────────────────────────────────────────────────────

/** Sub-groups that go on the DEBIT (cost) side of the Trading Account */
export const TRADING_DEBIT_SUBGROUPS = [
  'Cost of Materials Consumed',
  'Purchases of Stock-in-Trade',
  'Changes in Inventories',
  'Direct Expenses',
];

/** Sub-groups that go on the CREDIT (income) side of the Trading Account */
export const TRADING_CREDIT_SUBGROUPS = [
  'Revenue from Operations',
];

/** All expense sub-groups that feed into P&L below the gross profit line */
export const PNL_EXPENSE_SUBGROUPS = [
  'Employee Benefits Expense',
  'Finance Costs',
  'Depreciation & Amortisation',
  'Direct Expenses',
  'Other Expenses — Administration',
  'Other Expenses — Selling',
  'Other Expenses — Write-offs',
  'Other Expenses',
  'Exceptional Items',
  'Tax Expense',
  'GST — ITC',
];

/** Income sub-groups for P&L (other income — not trading revenue) */
export const PNL_INCOME_SUBGROUPS = [
  'Other Income',
];

/** OCI sub-groups (Schedule III — Other Comprehensive Income section) */
export const OCI_SUBGROUPS = [
  'Other Comprehensive Income',
];

/** Cash & bank sub-groups for Cash Book */
export const CASH_SUBGROUPS = ['Cash & Cash Equivalents'];
export const BANK_SUBGROUPS = ['Bank Balances'];
export const CASH_EQUIVALENT_SUBGROUPS = ['Cash Equivalents'];

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPATIBILITY TYPES (used in AccountComboBox + masterCOA importers)
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy type used by compute engines via masterCOA import */
export interface MasterAccount {
  id: string;
  name: string;
  primaryGroup: PrimaryGroup;
  subGroup: string;   // = scheduleIII
  nature: JournalNature;
  contra?: boolean;
}

/** Get all default accounts as MasterAccount array (replaces old MASTER_COA array) */
export function getMasterCOAAccounts(): MasterAccount[] {
  return LEDGER_GROUPS.flatMap((g) =>
    g.defaultAccounts.map((name, i) => ({
      id: `${g.id}_${i}`,
      name,
      primaryGroup: g.primaryGroup,
      subGroup: g.scheduleIII,
      nature: g.nature,
    })),
  );
}

/** Sub-groups available per primary group (used in legacy AccountComboBox) */
export function getSubGroupsForPrimaryGroup(pg: PrimaryGroup): string[] {
  const seen = new Set<string>();
  return LEDGER_GROUPS
    .filter((g) => g.primaryGroup === pg)
    .map((g) => g.scheduleIII)
    .filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; });
}
