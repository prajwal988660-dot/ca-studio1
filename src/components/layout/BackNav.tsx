import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const ROUTE_META: Record<string, { label: string; section: string }> = {
  'journal':             { label: 'Journal',              section: 'Core' },
  'cash-book':           { label: 'Cash Book',            section: 'Core' },
  'trial-balance':       { label: 'Trial Balance',        section: 'Financial Statements' },
  'trading-account':     { label: 'Trading Account',      section: 'Financial Statements' },
  'profit-loss':         { label: 'Profit & Loss',        section: 'Financial Statements' },
  'pl-appropriation':    { label: 'P&L Appropriation',    section: 'Financial Statements' },
  'balance-sheet':       { label: 'Balance Sheet',        section: 'Financial Statements' },
  'bs-notes':            { label: 'Balance Sheet Notes',  section: 'Financial Statements' },
  'cash-flow':           { label: 'Cash Flow',            section: 'Financial Statements' },
  'funds-flow':          { label: 'Funds Flow',           section: 'Financial Statements' },
  'ratio-analysis':      { label: 'Ratio Analysis',       section: 'Financial Statements' },
  'income-expenditure':  { label: 'Income & Expenditure', section: 'Financial Statements' },
  'receipts-payments':   { label: 'Receipts & Payments',  section: 'Financial Statements' },
  'ledger':              { label: 'Ledger Accounts',      section: 'Ledgers' },
  'debtors':             { label: 'Debtors',              section: 'Ledgers' },
  'creditors':           { label: 'Creditors',            section: 'Ledgers' },
  'purchase-register':   { label: 'Purchase Register',    section: 'Registers' },
  'sales-register':      { label: 'Sales Register',       section: 'Registers' },
  'purchase-returns':    { label: 'Purchase Returns',     section: 'Registers' },
  'sales-returns':       { label: 'Sales Returns',        section: 'Registers' },
  'bills-receivable':    { label: 'Bills Receivable',     section: 'Registers' },
  'bills-payable':       { label: 'Bills Payable',        section: 'Registers' },
  'fixed-assets':        { label: 'Fixed Assets',         section: 'Registers' },
  'investments':         { label: 'Investments',          section: 'Registers' },
  'loans':               { label: 'Loans',                section: 'Registers' },
  'depreciation':        { label: 'Depreciation',         section: 'Registers' },
  'gst':                 { label: 'GST',                  section: 'Tax & Compliance' },
  'income-tax':          { label: 'Income Tax',           section: 'Tax & Compliance' },
  'tds-register':        { label: 'TDS Register',         section: 'Tax & Compliance' },
  'tcs-register':        { label: 'TCS Register',         section: 'Tax & Compliance' },
  'advance-tax':         { label: 'Advance Tax',          section: 'Tax & Compliance' },
  'deferred-tax':        { label: 'Deferred Tax',         section: 'Tax & Compliance' },
  'brs':                 { label: 'Bank Reconciliation',  section: 'Tax & Compliance' },
  'partners-capital':    { label: "Partners' Capital",    section: 'Special Accounts' },
  'revaluation':         { label: 'Revaluation',          section: 'Special Accounts' },
  'realisation':         { label: 'Realisation',          section: 'Special Accounts' },
  'share-capital':       { label: 'Share Capital',        section: 'Special Accounts' },
  'debentures':          { label: 'Debentures',           section: 'Special Accounts' },
  'karta-capital':       { label: "Karta's Capital",      section: 'Special Accounts' },
  'fund-accounts':       { label: 'Fund Accounts',        section: 'Special Accounts' },
  'incomplete-records':  { label: 'Incomplete Records',   section: 'Special Accounts' },
  'member-register':     { label: 'Member Register',      section: 'Special Accounts' },
  'inventory':           { label: 'Inventory',            section: 'Inventory' },
  'audit':               { label: 'Audit',                section: 'Compliance' },
  'payroll':             { label: 'Payroll',              section: 'Compliance' },
  'segment-reporting':   { label: 'Segment Reporting',    section: 'Compliance' },
  'related-party':       { label: 'Related Party',        section: 'Compliance' },
  'accounting-policies': { label: 'Accounting Policies',  section: 'Compliance' },
  'as-checklist':        { label: 'AS Checklist',         section: 'Compliance' },
  'bulk-workspace':      { label: 'Bank Import',          section: 'Bulk Workflow' },
  'folders':             { label: 'Workspace',            section: '' },
  'settings':            { label: 'Settings',             section: '' },
  'ai':                  { label: 'AI Assistant',         section: '' },
};

export function BackNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Extract segments: /company/abc123/profit-loss → ['company', 'abc123', 'profit-loss']
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // Hide on company root (/company/:id has only 2 segments)
  if (segments.length <= 2) return null;

  const meta = ROUTE_META[lastSegment] ?? {
    label: lastSegment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    section: '',
  };

  return (
    <div className="mb-2">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  );
}
