import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useEntityConfig } from '@/hooks/useEntityConfig';
import { useWorkspaceFiles } from '@/hooks/useWorkspaceFiles';
import { addFile, deleteFile, updateFile } from '@/lib/workspaceDb';
import type { WorkspaceFile } from '@/lib/carp/tools/types';
import {
  BookOpen, Wallet, Coins, ClipboardList, ClipboardMinus,
  FileText, Users, Scale, TrendingUp, TrendingDown, BarChart3,
  Building2, ArrowRightLeft, Receipt, Briefcase, RefreshCw,
  Landmark, ScrollText, Home, PiggyBank, FileQuestion,
  ClipboardCheck, Building, Banknote, Calculator, FileSpreadsheet,
  IndianRupee, Clock, ArrowLeftRight, ShieldCheck, Globe, Percent,
  FileCheck, FileSignature, PieChart, Link2, CheckSquare, Package,
  Settings, Sparkles, FolderOpen, File, FileCode, FilePlus, FileUp,
  Trash2, Pencil, Check, X, LayoutGrid, Search, LogOut, type LucideIcon,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface NavItem { label: string; href: string; icon: LucideIcon }
interface NavGroup { heading: string; items: NavItem[] }
interface SidebarProps { onAlezaToggle?: () => void }

type AccessMode = 'professional' | 'business';
const ACCESS_MODE_KEY = 'ca_access_mode';

/* ── file type icon ── */
function fileIcon(type: WorkspaceFile['type']) {
  if (type === 'csv') return FileSpreadsheet;
  if (type === 'json') return FileCode;
  if (type === 'markdown') return FileText;
  return File;
}

/* ── Context Menu ── */
interface CtxMenu {
  x: number; y: number;
  kind: 'workspace-bg' | 'file';
  file?: WorkspaceFile;
}

export const Sidebar = React.memo(function Sidebar({ onAlezaToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { company, companyId, loading } = useCompany();
  const { config } = useEntityConfig();
  const wsFiles = useWorkspaceFiles(companyId);

  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null); // fileId
  const [renameVal, setRenameVal] = useState('');
  const ctxRef = useRef<HTMLDivElement>(null);

  // Access mode is chosen on the login page and persisted. The sidebar only
  // reads it here (defaults to Professional = full menu).
  const [mode] = useState<AccessMode>(() => {
    if (typeof window === 'undefined') return 'professional';
    return localStorage.getItem(ACCESS_MODE_KEY) === 'business' ? 'business' : 'professional';
  });

  // Quick search — type the start of a menu entry to jump to it.
  const [query, setQuery] = useState('');

  /* close context menu on outside click or Escape */
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtx(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [ctx]);

  /* block native context menu everywhere */
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  const openWorkspaceBg = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, kind: 'workspace-bg' });
  }, []);

  const openFileCtx = useCallback((e: React.MouseEvent, file: WorkspaceFile) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, kind: 'file', file });
  }, []);

  const handleNewFile = useCallback(() => {
    if (!companyId) return;
    setCtx(null);
    const name = `untitled-${Date.now()}.txt`;
    const f = addFile(companyId, { name, type: 'text', content: '' });
    navigate(`/company/${companyId}/folders?file=${f.id}`);
  }, [companyId, navigate]);

  const handleDeleteFile = useCallback((file: WorkspaceFile) => {
    if (!companyId) return;
    setCtx(null);
    deleteFile(companyId, file.id);
    if (pathname.includes('/folders')) {
      navigate(`/company/${companyId}/folders`);
    }
  }, [companyId, pathname, navigate]);

  const startRename = useCallback((file: WorkspaceFile) => {
    setCtx(null);
    setRenaming(file.id);
    setRenameVal(file.name);
  }, []);

  const commitRename = useCallback(() => {
    if (!companyId || !renaming || !renameVal.trim()) { setRenaming(null); return; }
    updateFile(companyId, renaming, { name: renameVal.trim() });
    setRenaming(null);
  }, [companyId, renaming, renameVal]);

  /* nav groups (memoised, no workspace items here) */
  const groups = useMemo(() => {
    if (!config || !companyId) return null;
    const base = `/company/${companyId}`;
    const nav = config.nav;

    // Both Professional and Business now see the full (unlocked) menu.
    const g: NavGroup[] = [];

    g.push({ heading: 'CORE', items: [
      ...(nav.journal ? [{ label: 'Journal', href: `${base}/journal`, icon: BookOpen }] : []),
      ...(nav.cashBook ? [{ label: 'Cash Book', href: `${base}/cash-book`, icon: Wallet }] : []),
    ]});

    const registerItems: NavItem[] = [];
    if (nav.purchaseRegister !== 'never') registerItems.push({ label: 'Purchase', href: `${base}/purchase-register`, icon: ClipboardList });
    if (nav.salesRegister !== 'never') registerItems.push({ label: 'Sales', href: `${base}/sales-register`, icon: ClipboardList });
    if (nav.purchaseReturns !== 'never') registerItems.push({ label: 'Purchase Returns', href: `${base}/purchase-returns`, icon: ClipboardMinus });
    if (nav.salesReturns !== 'never') registerItems.push({ label: 'Sales Returns', href: `${base}/sales-returns`, icon: ClipboardMinus });
    if (nav.billsReceivable) registerItems.push({ label: 'Bills Receivable', href: `${base}/bills-receivable`, icon: FileText });
    if (nav.billsPayable) registerItems.push({ label: 'Bills Payable', href: `${base}/bills-payable`, icon: FileText });
    if (registerItems.length > 0) g.push({ heading: 'REGISTERS', items: registerItems });

    const ledgerItems: NavItem[] = [];
    if (nav.ledger) ledgerItems.push({ label: 'Ledger Accounts', href: `${base}/ledger`, icon: BookOpen });
    if (nav.debtors) ledgerItems.push({ label: 'Debtors', href: `${base}/debtors`, icon: Users });
    if (nav.creditors) ledgerItems.push({ label: 'Creditors', href: `${base}/creditors`, icon: Users });
    if (ledgerItems.length > 0) g.push({ heading: 'LEDGERS', items: ledgerItems });

    const fsItems: NavItem[] = [];
    if (nav.trialBalance) fsItems.push({ label: 'Trial Balance', href: `${base}/trial-balance`, icon: Scale });
    if (nav.tradingAccount !== 'never') {
      fsItems.push({ label: 'Trading Account', href: `${base}/trading-account`, icon: TrendingUp });
    }
    if (nav.profitLoss) fsItems.push({ label: 'Profit & Loss', href: `${base}/profit-loss`, icon: BarChart3 });
    if (nav.plAppropriation) fsItems.push({ label: 'P&L Appropriation', href: `${base}/pl-appropriation`, icon: BarChart3 });
    if (nav.balanceSheet) {
      fsItems.push({ label: 'Balance Sheet', href: `${base}/balance-sheet`, icon: Building2 });
      if (nav.bsNotes) fsItems.push({ label: 'Balance Sheet Notes', href: `${base}/bs-notes`, icon: FileText });
    }
    if (nav.cashFlowStatement !== 'never') fsItems.push({ label: 'Cash Flow Statement', href: `${base}/cash-flow`, icon: ArrowRightLeft });
    if (nav.fundsFlowStatement !== 'never') fsItems.push({ label: 'Funds Flow Statement', href: `${base}/funds-flow`, icon: ArrowRightLeft });
    if (nav.ratioAnalysis) fsItems.push({ label: 'Ratio Analysis', href: `${base}/ratio-analysis`, icon: BarChart3 });
    if (nav.incomeExpenditure) fsItems.push({ label: 'Income & Expenditure', href: `${base}/income-expenditure`, icon: Receipt });
    if (nav.receiptsPayments) fsItems.push({ label: 'Receipts & Payments', href: `${base}/receipts-payments`, icon: Receipt });
    // Tally — standalone viewer, placed above Financial Statements
    g.push({ heading: 'TALLY', items: [{ label: 'Tally', href: `${base}/tally`, icon: FileText }] });

    if (fsItems.length > 0) g.push({ heading: 'FINANCIAL STATEMENTS', items: fsItems });

    const specialItems: NavItem[] = [];
    if (nav.partnersCapital) specialItems.push({ label: "Partners' Capital", href: `${base}/partners-capital`, icon: Briefcase });
    if (nav.revaluation) specialItems.push({ label: 'Revaluation Account', href: `${base}/revaluation`, icon: RefreshCw });
    if (nav.realisation) specialItems.push({ label: 'Realisation Account', href: `${base}/realisation`, icon: FileText });
    if (nav.shareCapital) specialItems.push({ label: 'Share Capital', href: `${base}/share-capital`, icon: Landmark });
    if (nav.debentures !== 'never') specialItems.push({ label: 'Debentures', href: `${base}/debentures`, icon: ScrollText });
    if (nav.kartaCapital) specialItems.push({ label: "Karta's Capital", href: `${base}/karta-capital`, icon: Home });
    if (nav.fundAccounts) specialItems.push({ label: 'Fund Accounts', href: `${base}/fund-accounts`, icon: PiggyBank });
    if (nav.incompleteRecords) specialItems.push({ label: 'Incomplete Records', href: `${base}/incomplete-records`, icon: FileQuestion });
    if (nav.memberRegister) specialItems.push({ label: 'Member Register', href: `${base}/member-register`, icon: ClipboardCheck });
    if (specialItems.length > 0) g.push({ heading: 'SPECIAL ACCOUNTS', items: specialItems });

    const taxItems: NavItem[] = [];
    if (nav.gst !== 'never') taxItems.push({ label: 'GST', href: `${base}/gst`, icon: Receipt });
    if (nav.incomeTax || nav.taxComputation) taxItems.push({ label: nav.taxComputation ? 'Tax Computation' : 'Income Tax', href: `${base}/income-tax`, icon: Calculator });
    if (nav.tdsRegister !== 'never') taxItems.push({ label: 'TDS Register', href: `${base}/tds-register`, icon: FileSpreadsheet });
    if (nav.tcsRegister !== 'never') taxItems.push({ label: 'TCS Register', href: `${base}/tcs-register`, icon: FileSpreadsheet });
    if (nav.advanceTax) taxItems.push({ label: 'Advance Tax', href: `${base}/advance-tax`, icon: IndianRupee });
    if (nav.deferredTax) taxItems.push({ label: 'Deferred Tax', href: `${base}/deferred-tax`, icon: Clock });
    if (nav.brs) taxItems.push({ label: 'Bank Reconciliation', href: `${base}/brs`, icon: ArrowLeftRight });
    if (nav.bankImport) taxItems.push({ label: 'Bank Import', href: `${base}/bank-import`, icon: FileUp });
    if (nav.audit !== 'never') taxItems.push({ label: 'Audit', href: `${base}/audit`, icon: ShieldCheck });
    if (taxItems.length > 0) g.push({ heading: 'TAX & COMPLIANCE', items: taxItems });

    // AUDIT & REPORTS section removed

    if (nav.inventory !== 'never') {
      g.push({ heading: 'INVENTORY', items: [{ label: 'Inventory', href: `${base}/inventory`, icon: Package }] });
    }

    g.push({ heading: 'BULK WORKFLOW', items: [
      { label: 'Bank Statement Importer', href: `${base}/bulk-workspace`, icon: LayoutGrid },
    ]});

    return g;
  }, [config, companyId, company, mode]);

  // Filtered menu entries for the quick-search box (start-of-word matches first).
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q || !groups) return [];
    const seen = new Set<string>();
    const all = groups.flatMap((grp) => grp.items).filter((it) => {
      if (seen.has(it.href)) return false;
      seen.add(it.href);
      return true;
    });
    return all
      .filter((it) => it.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return aStart - bStart || a.label.localeCompare(b.label);
      });
  }, [q, groups]);

  if (loading || !groups) {
    return (
      <aside className="w-full bg-white border-r border-gray-200 h-full shrink-0 flex flex-col min-h-0">
        <div className="p-3 space-y-2 flex-1 overflow-y-auto min-h-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  const base = `/company/${companyId}`;

  return (
    <>
      <aside className="w-full bg-white border-r border-gray-200 h-full shrink-0 flex flex-col min-h-0">
        <nav className="py-2 flex-1 overflow-y-auto min-h-0">
          {/* Aleza button */}
          <div className="mb-2 px-1.5">
            <button
              onClick={onAlezaToggle}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 mx-0 rounded-lg text-[13px] font-medium transition-colors text-gray-600 hover:bg-blue-50 hover:text-blue-700 group"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-blue-600" />
              <span className="truncate">Aleza</span>
            </button>
          </div>

          {/* Quick search — type the start of an entry to float it to the top */}
          <div className="mb-2 px-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matches.length) { navigate(matches[0].href); setQuery(''); }
                  if (e.key === 'Escape') setQuery('');
                }}
                placeholder="Search menu…"
                className="w-full h-8 pl-8 pr-7 text-[13px] bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 transition-colors"
              />
              {query && (
                <button onClick={() => setQuery('')} title="Clear"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {q ? (
          /* ── Search results (matches float to the top) ── */
          <div className="mb-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-3 py-1.5 mt-1">
              Results{matches.length ? ` (${matches.length})` : ''}
            </p>
            {matches.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-4 py-1 italic">No matching menu items</p>
            ) : matches.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setQuery('')}
                  className={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
          ) : (
          <>
          {/* Nav groups */}
          {groups.map((group) => (
            <div key={group.heading} className="mb-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-3 py-1.5 mt-1">
                {group.heading}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-blue-600 text-white shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* WORKSPACE — file tree (hidden in Business mode) */}
          {mode !== 'business' && (
          <div className="mb-1" onContextMenu={openWorkspaceBg}>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-3 py-1.5 mt-1 flex items-center justify-between">
              <span>WORKSPACE</span>
              <button
                onClick={handleNewFile}
                title="New file"
                className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <FilePlus className="h-3 w-3" />
              </button>
            </p>

            {wsFiles.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-4 py-1 italic">
                No files yet
              </p>
            ) : (
              wsFiles.map((f) => {
                const Icon = fileIcon(f.type);
                const fileHref = `${base}/folders?file=${f.id}`;
                const isActive = pathname.includes('/folders') && pathname.includes(f.id) ||
                  (typeof window !== 'undefined' && window.location.search.includes(f.id));

                return (
                  <div key={f.id} className="relative" onContextMenu={(e) => openFileCtx(e, f)}>
                    {renaming === f.id ? (
                      <div className="flex items-center gap-1 px-3 py-1 mx-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          onBlur={commitRename}
                          className="flex-1 text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none"
                        />
                        <button onClick={commitRename} className="text-green-500 hover:text-green-700"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setRenaming(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <Link
                        to={fileHref}
                        className={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                          isActive ? 'bg-blue-600 text-white shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className="truncate text-xs">{f.name}</span>
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
          )}
          </>
          )}
        </nav>

        {/* Settings */}
        <div className="border-t border-gray-200 mt-1 pt-1 pb-2 shrink-0">
          <Link
            to={`${base}/settings`}
            className={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              pathname === `${base}/settings` ? 'bg-blue-600 text-white shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Settings className={`h-3.5 w-3.5 shrink-0 ${pathname === `${base}/settings` ? 'text-white' : 'text-gray-400'}`} />
            <span>Settings</span>
          </Link>
          {isSupabaseConfigured && (
            <button
              onClick={async () => { try { await supabase?.auth.signOut(); } catch { /* ignore */ } navigate('/auth'); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-[13px] font-medium transition-colors text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Custom context menu */}
      {ctx && (
        <div
          ref={ctxRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px] text-sm overflow-hidden"
        >
          {ctx.kind === 'workspace-bg' && (
            <>
              <CtxItem icon={<FilePlus className="h-3.5 w-3.5" />} label="New File" onClick={handleNewFile} />
            </>
          )}
          {ctx.kind === 'file' && ctx.file && (
            <>
              <CtxItem icon={<Pencil className="h-3.5 w-3.5" />} label="Rename" onClick={() => startRename(ctx.file!)} />
              <div className="my-1 border-t border-gray-100" />
              <CtxItem icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={() => handleDeleteFile(ctx.file!)} danger />
            </>
          )}
        </div>
      )}
    </>
  );
});

function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors text-left ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
