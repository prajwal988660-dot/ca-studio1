'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { TAccountFormat } from '@/components/formats/TAccountFormat';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { exportElementAsImagePDF } from '@/components/export/exportUtils';
import { ManualEntryDialog } from '@/components/entries/ManualEntryDialog';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger, computeLedgerTFormat } from '@/lib/accounting/ledgerCompute';
import type { AccountBalance } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';
import { listJournalEntries, deleteJournalEntry, updateAccountGroupInAllEntries, updateJournalEntry, getCustomAccounts } from '@/lib/offlineDb';
import { LEDGER_GROUPS } from '@/lib/coa';
import type { PrimaryGroup } from '@/lib/coa';

// ── Edit Group Dialog ────────────────────────────────────────────────────────

const PG_ORDER: PrimaryGroup[] = ['Capital & Liabilities', 'Assets', 'Income', 'Expenses'];

function EditGroupDialog({ accountName, currentGroup, companyId, onClose }: {
  accountName: string; currentGroup: string; companyId: string; onClose: () => void;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(
    LEDGER_GROUPS.find(g => g.scheduleIII === currentGroup)?.id || ''
  );
  const [activePG, setActivePG] = useState<PrimaryGroup>(
    LEDGER_GROUPS.find(g => g.scheduleIII === currentGroup)?.primaryGroup || 'Assets'
  );

  const handleSave = () => {
    const group = LEDGER_GROUPS.find(g => g.id === selectedGroupId);
    if (!group) return;
    updateAccountGroupInAllEntries(companyId, accountName, group.scheduleIII, group.nature);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edit Account Group</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 truncate max-w-sm">{accountName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5">
          {/* PG tabs */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {PG_ORDER.map(pg => (
              <button key={pg} type="button" onClick={() => { setActivePG(pg); setSelectedGroupId(''); }}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-colors ${activePG === pg ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {pg}
              </button>
            ))}
          </div>
          {/* Group cards */}
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {LEDGER_GROUPS.filter(g => g.primaryGroup === activePG).map(group => (
              <button key={group.id} type="button" onClick={() => setSelectedGroupId(group.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${selectedGroupId === group.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                <p className="text-[11px] font-bold text-gray-800 mb-0.5">{group.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{group.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 h-8 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!selectedGroupId}
            className="flex-1 h-8 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Save Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Move Transaction Dialog ───────────────────────────────────────────────────

function MoveTxDialog({ entryId, fromAccount, companyId, onClose }: {
  entryId: string; fromAccount: string; companyId: string; onClose: () => void;
}) {
  const [newAccount, setNewAccount] = useState('');
  const all = useMemo(() => {
    const entries = listJournalEntries(companyId);
    const names = new Set<string>();
    for (const e of entries) for (const l of e.lines) if (l.account_name) names.add(l.account_name);
    return [...names].sort();
  }, [companyId]);

  const handleMove = () => {
    if (!newAccount.trim()) return;
    const entries = listJournalEntries(companyId);
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const updatedLines = entry.lines.map(l =>
      l.account_name === fromAccount ? { ...l, account_name: newAccount } : l
    );
    updateJournalEntry(entryId, { lines: updatedLines });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Move Transaction</p>
            <p className="text-xs text-gray-600 mt-0.5">From: <span className="font-semibold text-gray-900">{fromAccount}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Move Line To</label>
          <select
            value={newAccount}
            onChange={e => setNewAccount(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="">Select account…</option>
            {all.filter(n => n !== fromAccount).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-[11px] text-amber-600">This will change the account on this line of the journal entry. The debit/credit side is preserved.</p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 h-8 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleMove} disabled={!newAccount}
            className="flex-1 h-8 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Account Dialog ─────────────────────────────────────────────────────

function RenameAccountDialog({ accountName, companyId, onClose }: {
  accountName: string; companyId: string; onClose: () => void;
}) {
  const [newName, setNewName] = useState(accountName);

  const handleRename = () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === accountName) return;
    const entries = listJournalEntries(companyId);
    for (const entry of entries) {
      if (!entry.lines.some(l => l.account_name === accountName)) continue;
      const updatedLines = entry.lines.map(l =>
        l.account_name === accountName ? { ...l, account_name: trimmed } : l
      );
      updateJournalEntry(entry.id, { lines: updatedLines });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rename Account</p>
            <p className="text-xs text-gray-600 mt-0.5">Current: <span className="font-semibold text-gray-900">{accountName}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Name</label>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') onClose(); }}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
          <p className="text-[11px] text-amber-600 mt-2">Updates this account name in all journal entries.</p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 h-8 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleRename} disabled={!newName.trim() || newName.trim() === accountName}
            className="flex-1 h-8 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Move Dialog ──────────────────────────────────────────────────────────

function BulkMoveTxDialog({ count, fromAccount, companyId, onMove, onClose }: {
  count: number; fromAccount: string; companyId: string;
  onMove: (newAccount: string) => void; onClose: () => void;
}) {
  const [newAccount, setNewAccount] = useState('');
  const all = useMemo(() => {
    const entries = listJournalEntries(companyId);
    const names = new Set<string>();
    for (const e of entries) for (const l of e.lines) if (l.account_name) names.add(l.account_name);
    return [...names].sort();
  }, [companyId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Move {count} Transactions</p>
            <p className="text-xs text-gray-600 mt-0.5">From: <span className="font-semibold text-gray-900">{fromAccount}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Move Lines To</label>
          <select value={newAccount} onChange={e => setNewAccount(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40">
            <option value="">Select account…</option>
            {all.filter(n => n !== fromAccount).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <p className="text-[11px] text-amber-600">Moves the <strong>{fromAccount}</strong> line in each of the {count} selected journal entries to the new account. Debit/credit side is preserved.</p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 h-8 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => newAccount && onMove(newAccount)} disabled={!newAccount}
            className="flex-1 h-8 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Move All
          </button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'list' | 'running' | 'tformat';

type TRow = {
  date: string;
  particulars: string;
  jf: string;
  amount: number | '';
  _rowClass?: string;
};

export default function LedgerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const initialAccount = searchParams.get('account');
  const viewParam = searchParams.get('view') as ViewMode | null;

  // Map URL to initial view:
  // - No account => list
  // - account + view=running/tformat => that view
  // - account with no/invalid view => tformat
  const initialView: ViewMode =
    !initialAccount ? 'list' : viewParam === 'running' || viewParam === 'tformat' ? viewParam : 'running';

  const [selectedAccount, setSelectedAccount] = useState<string | null>(initialAccount);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReturnType<typeof listJournalEntries>[0] | null>(null);
  const [acctCtxMenu, setAcctCtxMenu] = useState<{ x: number; y: number; accountName: string } | null>(null);
  const [txCtxMenu, setTxCtxMenu] = useState<{ x: number; y: number; entryId: string; entryCode: string } | null>(null);
  const [editGroupDialog, setEditGroupDialog] = useState<{ accountName: string; currentGroup: string } | null>(null);
  const [moveTxDialog, setMoveTxDialog] = useState<{ entryId: string; accountName: string } | null>(null);
  const [bulkMoveDialog, setBulkMoveDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ accountName: string } | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const lastSelectedIdxRef = useRef<number | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const rawBalances = useMemo(() => computeAllBalances(entries), [entries]);

  // Merge in custom-registered accounts with 0 balance so they survive JE deletion
  const balances = useMemo((): AccountBalance[] => {
    if (!companyId) return rawBalances;
    const existingNames = new Set(rawBalances.map(b => b.account_name.toLowerCase()));
    const extras: AccountBalance[] = getCustomAccounts(companyId)
      .filter(a => !existingNames.has(a.name.toLowerCase()))
      .map(a => ({ account_name: a.name, account_group: a.account_group, nature: a.nature, total_debit: 0, total_credit: 0, balance: 0, balance_type: 'Dr' as const }));
    return [...rawBalances, ...extras];
  }, [rawBalances, companyId, entries]);

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => a.account_name.localeCompare(b.account_name)),
    [balances]
  );

  const allRange = useMemo(() => {
    if (!companyId) return null;
    const all = listJournalEntries(companyId);
    if (!all.length) return null;
    const dates = all.map((e) => e.entry_date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [companyId, entries]);

  // Auto-expand date range so entries outside default FY are visible
  const rangeExpanded = useRef(false);
  useEffect(() => {
    if (!allRange || rangeExpanded.current) return;
    let changed = false;
    if (allRange.from < fromDate) { setFromDate(allRange.from); changed = true; }
    if (allRange.to > toDate) { setToDate(allRange.to); changed = true; }
    if (changed) rangeExpanded.current = true;
  }, [allRange, fromDate, toDate]);

  // Always compute these (hooks must not be conditional)
  const ledgerRows = useMemo(
    () => (selectedAccount ? computeLedger(entries, selectedAccount) : []),
    [entries, selectedAccount]
  );
  const tFormat = useMemo(
    () => (selectedAccount ? computeLedgerTFormat(entries, selectedAccount) : { debitSide: [], creditSide: [] }),
    [entries, selectedAccount]
  );

  const toMonthKey = (isoDate: string) => isoDate.slice(0, 7); // YYYY-MM
  const listMonthsInRange = (startIso: string, endIso: string, fallbackRows: { date: string }[]): string[] => {
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const set = new Set<string>();
      fallbackRows.forEach((r) => set.add(toMonthKey(r.date)));
      return [...set].sort();
    }
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const out: string[] = [];
    while (cur <= endMonth) {
      out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  };

  const monthlyT = useMemo((): { leftData: TRow[]; rightData: TRow[] } => {
    if (!selectedAccount) return { leftData: [], rightData: [] };

    const months = listMonthsInRange(fromDate, toDate, ledgerRows);
    const isSingleMonthRange = months.length === 1;
    let opening = 0; // Dr positive, Cr negative
    const leftAll: TRow[] = [];
    const rightAll: TRow[] = [];

    const blankRow = (): TRow => ({ date: '', particulars: '\u00A0', jf: '', amount: '' });

    for (const ym of months) {
      const [yy, mm] = ym.split('-').map((x) => parseInt(x, 10));
      const openingDate = `${ym}-01`;
      const lastDay = yy && mm ? new Date(yy, mm, 0).getDate() : 28;
      const closingDate = `${ym}-${String(lastDay).padStart(2, '0')}`;

      const monthDebits = tFormat.debitSide.filter((r) => toMonthKey(r.date) === ym);
      const monthCredits = tFormat.creditSide.filter((r) => toMonthKey(r.date) === ym);

      const monthDebitTotal = monthDebits.reduce((s, r) => s + (r.debit || 0), 0);
      const monthCreditTotal = monthCredits.reduce((s, r) => s + (r.credit || 0), 0);
      const closing = opening + monthDebitTotal - monthCreditTotal;

      // Skip visually empty months with no postings and unchanged balance
      // when viewing a multi-month range. For a single-month filter, still show
      // the month with b/d and c/d.
      if (!isSingleMonthRange && monthDebitTotal === 0 && monthCreditTotal === 0 && opening === closing) {
        // Carry the same opening into next loop without rendering this month.
        opening = closing;
        continue;
      }

      const leftMonth: TRow[] = [];
      const rightMonth: TRow[] = [];

      // 1) Opening balance brought down (b/d)
      if (opening > 0) leftMonth.push({ date: openingDate, particulars: 'To Balance b/d', jf: '', amount: opening });
      else if (opening < 0) rightMonth.push({ date: openingDate, particulars: 'By Balance b/d', jf: '', amount: Math.abs(opening) });

      // 2) Month transactions
      monthDebits.forEach((r) => leftMonth.push({ date: r.date, particulars: `To ${r.particulars}`, jf: r.entry_code, amount: r.debit || '' }));
      monthCredits.forEach((r) => rightMonth.push({ date: r.date, particulars: `By ${r.particulars}`, jf: r.entry_code, amount: r.credit || '' }));

      // Keep both sides row-aligned before c/d line
      const maxRows = Math.max(leftMonth.length, rightMonth.length);
      while (leftMonth.length < maxRows) leftMonth.push(blankRow());
      while (rightMonth.length < maxRows) rightMonth.push(blankRow());

      // 3) Balance carried down (c/d) on opposite side
      //    Debit closing => By Balance c/d on Cr side
      //    Credit closing => To Balance c/d on Dr side
      if (closing > 0) {
        rightMonth.push({ date: closingDate, particulars: 'By Balance c/d', jf: '', amount: closing });
        leftMonth.push(blankRow());
      } else if (closing < 0) {
        leftMonth.push({ date: closingDate, particulars: 'To Balance c/d', jf: '', amount: Math.abs(closing) });
        rightMonth.push(blankRow());
      } else {
        leftMonth.push(blankRow());
        rightMonth.push(blankRow());
      }

      // 4) Monthly total after c/d (must tally: Dr total = Cr total)
      const debitBeforeCd = (opening > 0 ? opening : 0) + monthDebitTotal;
      const creditBeforeCd = (opening < 0 ? Math.abs(opening) : 0) + monthCreditTotal;
      const equalTotal = Math.max(debitBeforeCd, creditBeforeCd);

      leftMonth.push({ date: '', particulars: 'Total', jf: '', amount: equalTotal, _rowClass: 'bg-gray-100 font-semibold' });
      rightMonth.push({ date: '', particulars: 'Total', jf: '', amount: equalTotal, _rowClass: 'bg-gray-100 font-semibold' });

      // Ensure both sides remain same length after total row
      const maxAfter = Math.max(leftMonth.length, rightMonth.length);
      while (leftMonth.length < maxAfter) leftMonth.push(blankRow());
      while (rightMonth.length < maxAfter) rightMonth.push(blankRow());

      leftAll.push(...leftMonth);
      rightAll.push(...rightMonth);
      opening = closing;
    }

    return { leftData: leftAll, rightData: rightAll };
  }, [selectedAccount, fromDate, toDate, ledgerRows, tFormat]);

  // Keep selectedAccount and viewMode in sync with URL if user edits it directly.
  useEffect(() => {
    const acc = searchParams.get('account');
    const v = searchParams.get('view') as ViewMode | null;

    if (!acc) {
      // No account in URL => list view
      setSelectedAccount(null);
      setViewMode('list');
      setSelectedTxIds(new Set());
      return;
    }

    setSelectedAccount(prev => { if (prev !== acc) setSelectedTxIds(new Set()); return acc; });
    if (v === 'running' || v === 'tformat') {
      setViewMode(v);
    } else {
      setViewMode('running');
    }
  }, [searchParams]);

  // Close context menus on outside click
  useEffect(() => {
    if (!acctCtxMenu && !txCtxMenu) return;
    const close = () => { setAcctCtxMenu(null); setTxCtxMenu(null); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [acctCtxMenu, txCtxMenu]);

  const handleDeleteTx = (entryId: string) => {
    const confirmed = window.confirm('Delete this transaction? The account will still exist in the ledger.');
    if (!confirmed) return;
    deleteJournalEntry(entryId);
  };

  const handleEditTx = (entryId: string) => {
    const allEntries = companyId ? listJournalEntries(companyId) : [];
    const entry = allEntries.find(e => e.id === entryId);
    if (entry) setEditingEntry(entry);
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedTxIds.size} selected transaction(s)? This cannot be undone.`)) return;
    selectedTxIds.forEach(id => deleteJournalEntry(id));
    setSelectedTxIds(new Set());
    lastSelectedIdxRef.current = null;
  };

  const handleBulkMove = (newAccount: string) => {
    if (!companyId || !selectedAccount) return;
    const allEntries = listJournalEntries(companyId);
    for (const id of selectedTxIds) {
      const entry = allEntries.find(e => e.id === id);
      if (!entry) continue;
      const updatedLines = entry.lines.map(l =>
        l.account_name === selectedAccount ? { ...l, account_name: newAccount } : l
      );
      updateJournalEntry(id, { lines: updatedLines });
    }
    setSelectedTxIds(new Set());
    lastSelectedIdxRef.current = null;
    setBulkMoveDialog(false);
  };

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const handleSave = async (entry: Parameters<typeof createEntry>[0]) => {
    const created = await createEntry(entry);
    // Expand date range so newly added future/back-dated entries are visible
    if (entry.entry_date < fromDate) setFromDate(entry.entry_date);
    if (entry.entry_date > toDate) setToDate(entry.entry_date);
    return created;
  };

  // List view: all account balances
  if (!selectedAccount) {
    const listColumns = [
      { header: 'S.No', key: 'sno', width: 'w-16' },
      { header: 'Account Name', key: 'account_name' },
      { header: 'Debit (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
      { header: 'Credit (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
      { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
    ];

    const listData = sortedBalances.map((b, i) => ({
      sno: i + 1,
      account_name: b.account_name,
      total_debit: b.total_debit,
      total_credit: b.total_credit,
      balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
    }));

    return (
      <div>
        <PageHeader title="Ledger" description="All ledger accounts">
          <div className="flex flex-col gap-2 items-end">
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
              allRange={allRange}
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New Entry
              </button>
              <ExportButtons title="Ledger Accounts" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={listColumns} data={listData} />
            </div>
          </div>
        </PageHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">Ledger Accounts</h3>
              <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
            </div>
            {balances.length === 0 ? (
              <div className="text-center py-14"><p className="text-sm text-gray-400">No ledger accounts found. Create journal entries first.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-14">S.No</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBalances.map((b, i) => (
                      <tr
                        key={b.account_name}
                        className={`border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                        onClick={() => {
                          setSelectedAccount(b.account_name);
                          setViewMode('running');
                          setSearchParams({ account: b.account_name, view: 'running' });
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setAcctCtxMenu({ x: e.clientX, y: e.clientY, accountName: b.account_name });
                        }}
                      >
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-blue-600 text-sm">{b.account_name}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-dr">{b.total_debit > 0 ? formatIndianCurrency(b.total_debit) : ''}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-cr">{b.total_credit > 0 ? formatIndianCurrency(b.total_credit) : ''}</td>
                        <td className={`px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold ${b.balance_type === 'Dr' ? 'text-dr' : 'text-cr'}`}>
                          {formatIndianCurrency(b.balance)} <span className="text-[10px] text-gray-400">{b.balance_type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <ManualEntryDialog
          open={showNewEntry}
          onOpenChange={setShowNewEntry}
          companyId={companyId || ''}
          onSave={handleSave}
        />

        {/* Account right-click context menu (list view) */}
        {acctCtxMenu && (
          <div className="fixed z-[80] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]"
            style={{ left: acctCtxMenu.x, top: acctCtxMenu.y }}
            onMouseDown={e => e.stopPropagation()}>
            <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[160px]">{acctCtxMenu.accountName}</p>
            </div>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
              onClick={() => {
                const bal = balances.find(b => b.account_name === acctCtxMenu.accountName);
                setEditGroupDialog({ accountName: acctCtxMenu.accountName, currentGroup: bal?.account_group || '' });
                setAcctCtxMenu(null);
              }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
              Edit Account Group
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
              onClick={() => { setRenameDialog({ accountName: acctCtxMenu.accountName }); setAcctCtxMenu(null); }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
              Rename Account
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
              onClick={() => {
                setSelectedAccount(acctCtxMenu.accountName);
                setViewMode('running');
                setSearchParams({ account: acctCtxMenu.accountName, view: 'running' });
                setAcctCtxMenu(null);
              }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
              View Transactions
            </button>
          </div>
        )}

        {editGroupDialog && (
          <EditGroupDialog accountName={editGroupDialog.accountName} currentGroup={editGroupDialog.currentGroup}
            companyId={companyId || ''} onClose={() => setEditGroupDialog(null)} />
        )}
        {renameDialog && (
          <RenameAccountDialog accountName={renameDialog.accountName} companyId={companyId || ''} onClose={() => setRenameDialog(null)} />
        )}
      </div>
    );
  }

  const runningColumns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Voucher No.', key: 'entry_code' },
    { header: 'Debit (₹)', key: 'debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const runningData = ledgerRows.map(r => ({
    ...r,
    balance_display: `${formatIndianCurrency(r.running_balance)} ${r.balance_type}`,
  }));

  const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);

  return (
    <div>
      <PageHeader title={`Ledger: ${selectedAccount}`} description="Account ledger detail">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedAccount(null);
                setViewMode('list');
                setSearchParams({});
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Back to List
            </button>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              {(['running', 'tformat'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    if (selectedAccount) {
                      setSearchParams({ account: selectedAccount, view: mode });
                    }
                  }}
                  className={`px-3 py-1.5 text-sm ${
                    viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'running' ? 'Running Balance' : 'T-Format'}
                </button>
              ))}
            </div>
          </div>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
            allRange={allRange}
          />
          <ExportButtons
            title={`Ledger - ${selectedAccount}`}
            companyName={company.name}
            entityType={entityLabel}
            dateRange={`${fromDate} to ${toDate}`}
            columns={runningColumns}
            data={runningData}
            onPdf={() =>
              exportElementAsImagePDF({
                element: detailRef.current,
                title: `Ledger - ${selectedAccount} (${viewMode === 'tformat' ? 'T-Format' : 'Running'})`,
                orientation: viewMode === 'tformat' ? 'landscape' : 'portrait',
              })
            }
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === 'tformat' ? (
        <div ref={detailRef}>
          <TAccountFormat
            title={`${selectedAccount} Account`}
            subtitle={`${fromDate} to ${toDate}`}
            companyName={company.name}
            leftLabel="Dr."
            rightLabel="Cr."
            leftColumns={[
              { header: 'Date', key: 'date', width: 'w-[20%]' },
              { header: 'Particulars', key: 'particulars', width: 'w-[42%]' },
              { header: 'J.F.', key: 'jf', width: 'w-[13%]' },
              { header: 'Amount (₹)', key: 'amount', align: 'right', width: 'w-[25%]' },
            ]}
            rightColumns={[
              { header: 'Date', key: 'date', width: 'w-[20%]' },
              { header: 'Particulars', key: 'particulars', width: 'w-[42%]' },
              { header: 'J.F.', key: 'jf', width: 'w-[13%]' },
              { header: 'Amount (₹)', key: 'amount', align: 'right', width: 'w-[25%]' },
            ]}
            leftData={monthlyT.leftData}
            rightData={monthlyT.rightData}
            leftTotal={totalDebit}
            rightTotal={totalCredit}
            showFooterTotals={false}
            linkColumnKey="jf"
            getRowHref={(row) =>
              row.jf && companyId ? `/company/${companyId}/journal?entryCode=${row.jf}` : '#'
            }
          />
        </div>
      ) : (
        <div ref={detailRef}>
          {/* Custom running-balance table with right-click support */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-2 border-b border-gray-200 bg-gray-50/50">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{company.name}</p>
              <h3 className="text-sm font-bold text-gray-900 mt-px">{selectedAccount} — Ledger</h3>
              <p className="text-[10px] text-gray-400 mt-px">{fromDate} to {toDate}</p>
            </div>
            {selectedTxIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100 flex-wrap">
                <span className="text-[11px] font-semibold text-blue-700 mr-1">{selectedTxIds.size} of {ledgerRows.length} selected</span>
                {ledgerRows.length > 0 && selectedTxIds.size < ledgerRows.length && (
                  <button onClick={() => { setSelectedTxIds(new Set(ledgerRows.map(r => r.entry_id))); }}
                    className="px-2 py-0.5 rounded text-[11px] text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200">
                    Select All ({ledgerRows.length})
                  </button>
                )}
                <button onClick={() => setBulkMoveDialog(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                  Move All
                </button>
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-red-600 hover:bg-red-100 transition-colors border border-red-200">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  Delete All
                </button>
                <button onClick={() => { setSelectedTxIds(new Set()); lastSelectedIdxRef.current = null; }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-500 hover:bg-gray-200 transition-colors ml-auto">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  Cancel
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {selectedTxIds.size > 0 && (
                      <th className="px-2 py-2 w-8">
                        <input type="checkbox"
                          checked={ledgerRows.length > 0 && ledgerRows.every(r => selectedTxIds.has(r.entry_id))}
                          onChange={() => {
                            if (ledgerRows.every(r => selectedTxIds.has(r.entry_id))) {
                              setSelectedTxIds(new Set()); lastSelectedIdxRef.current = null;
                            } else {
                              setSelectedTxIds(new Set(ledgerRows.map(r => r.entry_id)));
                            }
                          }}
                          className="h-3.5 w-3.5" />
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Voucher No.</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Debit (₹)</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Credit (₹)</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 ? (
                    <tr><td colSpan={selectedTxIds.size > 0 ? 7 : 6} className="px-4 py-10 text-center text-[11px] text-gray-400">No transactions found for this account.</td></tr>
                  ) : (
                    ledgerRows.map((r, i) => {
                      const isSelected = selectedTxIds.has(r.entry_id);
                      return (
                        <tr
                          key={i}
                          className={`border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100/60' : i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                          onClick={(e) => {
                            if (selectedTxIds.size > 0) {
                              if (e.shiftKey && lastSelectedIdxRef.current !== null) {
                                const lo = Math.min(lastSelectedIdxRef.current, i);
                                const hi = Math.max(lastSelectedIdxRef.current, i);
                                setSelectedTxIds(prev => {
                                  const n = new Set(prev);
                                  for (let j = lo; j <= hi; j++) n.add(ledgerRows[j].entry_id);
                                  return n;
                                });
                              } else {
                                setSelectedTxIds(prev => { const n = new Set(prev); if (n.has(r.entry_id)) n.delete(r.entry_id); else n.add(r.entry_id); return n; });
                                lastSelectedIdxRef.current = i;
                              }
                            } else {
                              handleEditTx(r.entry_id);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setTxCtxMenu({ x: e.clientX, y: e.clientY, entryId: r.entry_id, entryCode: r.entry_code });
                          }}
                        >
                          {selectedTxIds.size > 0 && (
                            <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => setSelectedTxIds(prev => { const n = new Set(prev); if (n.has(r.entry_id)) n.delete(r.entry_id); else n.add(r.entry_id); return n; })}
                                className="h-3.5 w-3.5"
                              />
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{r.date}</td>
                          <td className="px-2 py-1.5 text-gray-700 font-medium">{r.particulars}</td>
                          <td className="px-2 py-1.5 text-gray-500 font-mono whitespace-nowrap">{r.entry_code || `UN${String(i + 1).padStart(5, '0')}`}</td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-dr whitespace-nowrap">{r.debit > 0 ? formatIndianCurrency(r.debit) : ''}</td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-cr whitespace-nowrap">{r.credit > 0 ? formatIndianCurrency(r.credit) : ''}</td>
                          <td className={`px-2 py-1.5 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${r.balance_type === 'Dr' ? 'text-dr' : 'text-cr'}`}>
                            {formatIndianCurrency(r.running_balance)} <span className="text-[10px] text-gray-400">{r.balance_type}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={selectedTxIds.size > 0 ? 4 : 3} className="px-2 py-2 font-bold text-[11px] text-gray-800">Total</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-[11px] text-dr">{formatIndianCurrency(totalDebit)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-[11px] text-cr">{formatIndianCurrency(totalCredit)}</td>
                    <td className="px-2 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={handleSave}
      />

      {/* Edit entry dialog */}
      {editingEntry && (
        <ManualEntryDialog
          open={!!editingEntry}
          onOpenChange={(open) => { if (!open) setEditingEntry(null); }}
          companyId={companyId || ''}
          onSave={handleSave}
          initialEntry={editingEntry}
        />
      )}

      {/* Account right-click context menu */}
      {acctCtxMenu && (
        <div
          className="fixed z-[80] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]"
          style={{ left: acctCtxMenu.x, top: acctCtxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[160px]">{acctCtxMenu.accountName}</p>
          </div>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            onClick={() => {
              const bal = balances.find(b => b.account_name === acctCtxMenu.accountName);
              setEditGroupDialog({ accountName: acctCtxMenu.accountName, currentGroup: bal?.account_group || '' });
              setAcctCtxMenu(null);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
            Edit Account Group
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            onClick={() => {
              setRenameDialog({ accountName: acctCtxMenu.accountName });
              setAcctCtxMenu(null);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
            Rename Account
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            onClick={() => {
              setSelectedAccount(acctCtxMenu.accountName);
              setViewMode('running');
              setSearchParams({ account: acctCtxMenu.accountName, view: 'running' });
              setAcctCtxMenu(null);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
            View Transactions
          </button>
        </div>
      )}

      {/* Transaction right-click context menu */}
      {txCtxMenu && (
        <div
          className="fixed z-[80] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]"
          style={{ left: txCtxMenu.x, top: txCtxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            onClick={() => {
              setSelectedTxIds(prev => { const n = new Set(prev); n.add(txCtxMenu.entryId); return n; });
              setTxCtxMenu(null);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            Select
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            onClick={() => { handleEditTx(txCtxMenu.entryId); setTxCtxMenu(null); }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
            Edit Transaction
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center gap-2"
            onClick={() => {
              if (selectedAccount) setMoveTxDialog({ entryId: txCtxMenu.entryId, accountName: selectedAccount });
              setTxCtxMenu(null);
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
            Move to Another Account
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            onClick={() => { handleDeleteTx(txCtxMenu.entryId); setTxCtxMenu(null); }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            Delete Transaction
          </button>
        </div>
      )}

      {/* Edit account group dialog */}
      {editGroupDialog && (
        <EditGroupDialog
          accountName={editGroupDialog.accountName}
          currentGroup={editGroupDialog.currentGroup}
          companyId={companyId || ''}
          onClose={() => setEditGroupDialog(null)}
        />
      )}

      {/* Move transaction dialog */}
      {moveTxDialog && (
        <MoveTxDialog
          entryId={moveTxDialog.entryId}
          fromAccount={moveTxDialog.accountName}
          companyId={companyId || ''}
          onClose={() => setMoveTxDialog(null)}
        />
      )}

      {/* Bulk move dialog */}
      {bulkMoveDialog && selectedAccount && (
        <BulkMoveTxDialog
          count={selectedTxIds.size}
          fromAccount={selectedAccount}
          companyId={companyId || ''}
          onMove={handleBulkMove}
          onClose={() => setBulkMoveDialog(false)}
        />
      )}

      {/* Rename account dialog */}
      {renameDialog && (
        <RenameAccountDialog
          accountName={renameDialog.accountName}
          companyId={companyId || ''}
          onClose={() => setRenameDialog(null)}
        />
      )}
    </div>
  );
}
