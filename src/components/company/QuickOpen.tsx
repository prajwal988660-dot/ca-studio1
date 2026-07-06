'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react';

interface Dest { label: string; path: string; keywords?: string; section: string }

// Every reachable feature, so typing a shortcut ("tall", "bal", "gst"…) opens it.
const DESTINATIONS: Dest[] = [
  { section: 'Books', label: 'Journal', path: 'journal', keywords: 'entries voucher' },
  { section: 'Books', label: 'Cash Book', path: 'cash-book' },
  { section: 'Books', label: 'Ledger Accounts', path: 'ledger', keywords: 'ledgers accounts' },
  { section: 'Registers', label: 'Purchase Register', path: 'purchase-register' },
  { section: 'Registers', label: 'Sales Register', path: 'sales-register' },
  { section: 'Registers', label: 'Purchase Returns', path: 'purchase-returns' },
  { section: 'Registers', label: 'Sales Returns', path: 'sales-returns' },
  { section: 'Registers', label: 'Bills Receivable', path: 'bills-receivable' },
  { section: 'Registers', label: 'Bills Payable', path: 'bills-payable' },
  { section: 'Ledgers', label: 'Debtors', path: 'debtors' },
  { section: 'Ledgers', label: 'Creditors', path: 'creditors' },
  { section: 'Financials', label: 'Trial Balance', path: 'trial-balance', keywords: 'tb' },
  { section: 'Financials', label: 'Trading Account', path: 'trading-account' },
  { section: 'Financials', label: 'Profit & Loss', path: 'profit-loss', keywords: 'pl p&l income statement' },
  { section: 'Financials', label: 'P&L Appropriation', path: 'pl-appropriation' },
  { section: 'Financials', label: 'Balance Sheet', path: 'balance-sheet', keywords: 'bs' },
  { section: 'Financials', label: 'Balance Sheet Notes', path: 'bs-notes' },
  { section: 'Financials', label: 'Cash Flow Statement', path: 'cash-flow' },
  { section: 'Financials', label: 'Funds Flow Statement', path: 'funds-flow' },
  { section: 'Financials', label: 'Ratio Analysis', path: 'ratio-analysis' },
  { section: 'Financials', label: 'Income & Expenditure', path: 'income-expenditure' },
  { section: 'Financials', label: 'Receipts & Payments', path: 'receipts-payments' },
  { section: 'Special', label: "Partners' Capital", path: 'partners-capital' },
  { section: 'Special', label: 'Revaluation Account', path: 'revaluation' },
  { section: 'Special', label: 'Realisation Account', path: 'realisation' },
  { section: 'Special', label: 'Share Capital', path: 'share-capital' },
  { section: 'Special', label: 'Debentures', path: 'debentures' },
  { section: 'Special', label: "Karta's Capital", path: 'karta-capital' },
  { section: 'Special', label: 'Fund Accounts', path: 'fund-accounts' },
  { section: 'Special', label: 'Incomplete Records', path: 'incomplete-records' },
  { section: 'Special', label: 'Member Register', path: 'member-register' },
  { section: 'Assets', label: 'Fixed Assets', path: 'fixed-assets' },
  { section: 'Assets', label: 'Investments', path: 'investments' },
  { section: 'Assets', label: 'Loans', path: 'loans' },
  { section: 'Assets', label: 'Depreciation', path: 'depreciation' },
  { section: 'Tax', label: 'GST', path: 'gst' },
  { section: 'Tax', label: 'GSTR-1', path: 'gst/gstr1' },
  { section: 'Tax', label: 'GSTR-3B', path: 'gst/gstr3b' },
  { section: 'Tax', label: 'ITC Register', path: 'gst/itc-register' },
  { section: 'Tax', label: 'E-way Bill', path: 'gst/eway-bill' },
  { section: 'Tax', label: 'Income Tax', path: 'income-tax', keywords: 'tax computation' },
  { section: 'Tax', label: 'TDS Register', path: 'tds-register' },
  { section: 'Tax', label: 'TCS Register', path: 'tcs-register' },
  { section: 'Tax', label: 'Advance Tax', path: 'advance-tax' },
  { section: 'Tax', label: 'Deferred Tax', path: 'deferred-tax' },
  { section: 'Tax', label: 'Bank Reconciliation', path: 'brs', keywords: 'brs' },
  { section: 'Compliance', label: 'Audit', path: 'audit' },
  { section: 'Compliance', label: 'FCRA', path: 'fcra' },
  { section: 'Compliance', label: 'Application Check', path: 'application-check' },
  { section: 'Compliance', label: 'Form 10B', path: 'form-10b' },
  { section: 'Compliance', label: 'LLP Forms', path: 'llp-forms' },
  { section: 'Compliance', label: 'Segment Reporting', path: 'segment-reporting' },
  { section: 'Compliance', label: 'Related Party', path: 'related-party' },
  { section: 'Compliance', label: 'Accounting Policies', path: 'accounting-policies' },
  { section: 'Compliance', label: 'AS Checklist', path: 'as-checklist' },
  { section: 'Compliance', label: 'Contingent Liabilities', path: 'contingent-liabilities' },
  { section: 'Compliance', label: "Director's Report", path: 'directors-report' },
  { section: 'Compliance', label: 'CARO', path: 'caro' },
  { section: 'Compliance', label: 'Cost Records', path: 'cost-records' },
  { section: 'Compliance', label: 'Form N', path: 'form-n' },
  { section: 'Inventory', label: 'Inventory', path: 'inventory' },
  { section: 'Inventory', label: 'Bin Card', path: 'inventory/bin-card' },
  { section: 'Inventory', label: 'Stores Ledger', path: 'inventory/stores-ledger' },
  { section: 'Inventory', label: 'Cost Sheet', path: 'inventory/cost-sheet' },
  { section: 'Payroll', label: 'Payroll', path: 'payroll' },
  { section: 'Banking', label: 'Bank Accounts', path: 'bank-accounts' },
  { section: 'Banking', label: 'Bank Import', path: 'bank-import' },
  { section: 'Banking', label: 'Bank Statement Importer', path: 'bulk-workspace' },
  { section: 'Tally', label: 'Tally', path: 'tally', keywords: 'tally import' },
  { section: 'Workspace', label: 'Folders', path: 'folders', keywords: 'workspace files' },
  { section: 'Workspace', label: 'Settings', path: 'settings' },
];

export function QuickOpen({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DESTINATIONS
      .map((d) => {
        const label = d.label.toLowerCase();
        const kw = (d.keywords || '').toLowerCase();
        const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : kw.includes(q) ? 2 : 3;
        return { d, score };
      })
      .filter((x) => x.score < 3)
      .sort((a, b) => a.score - b.score || a.d.label.localeCompare(b.d.label))
      .slice(0, 8)
      .map((x) => x.d);
  }, [query]);

  // Ctrl/⌘+K focuses the search from anywhere on the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (d: Dest) => {
    setQuery('');
    setOpen(false);
    navigate(`/company/${companyId}/${d.path}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && matches.length) { e.preventDefault(); go(matches[active] ?? matches[0]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search & open… try 'tall' → Tally, 'bal' → Balance Sheet, 'gst'…"
          className="w-full h-12 pl-11 pr-20 text-sm bg-white border border-gray-200 rounded-2xl shadow-[0_10px_30px_-16px_rgba(8,40,48,0.25)] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 transition-colors"
        />
        <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-md border border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-400">
          Ctrl K
        </kbd>
      </div>

      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-[0_28px_60px_-22px_rgba(8,40,48,0.30)] overflow-hidden py-1.5">
          {matches.map((d, i) => (
            <button
              key={d.path}
              // onMouseDown (not onClick) so it fires before the input's onBlur closes the list
              onMouseDown={(e) => { e.preventDefault(); go(d); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                i === active ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className={`text-sm font-semibold truncate ${i === active ? 'text-blue-700' : 'text-gray-800'}`}>{d.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 shrink-0">{d.section}</span>
              </span>
              {i === active
                ? <CornerDownLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                : <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
