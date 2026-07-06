/**
 * BulkDataGrid — Excel-style spreadsheet grid for suspense transactions.
 *
 * Features:
 * - Click to select row; Shift+click for range; Ctrl+click for multi
 * - Right-click context menu: Move to Ledger, Create & Move, Flag
 * - Status colour coding: white=unallocated, green=allocated, amber=flagged
 * - Column sorting, keyword filter, status filter
 * - Keyboard: Arrow keys to navigate, Space to toggle selection, Esc to clear
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, Search, Filter, Layers, Check } from 'lucide-react';
import type { SuspenseTransaction, BulkLedgerAccount } from '@/lib/bulk/types';

interface CtxMenuState {
  x: number;
  y: number;
  selectedIds: string[];
}

interface Props {
  transactions: SuspenseTransaction[];
  ledgerAccounts: BulkLedgerAccount[];
  onMoveToLedger: (selectedIds: string[]) => void;
  onCreateAndMove: (selectedIds: string[]) => void;
  onFlagRows: (selectedIds: string[]) => void;
  onDeleteRows: (selectedIds: string[]) => void;
  onUnallocateRows: (selectedIds: string[]) => void;
  onCreateNewLedger?: () => void;
}

type SortKey = 'txnDate' | 'narration' | 'amount' | 'direction' | 'status';
type SortDir = 'asc' | 'desc';

function formatAmount(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return d;
  }
}

function rowBg(status: SuspenseTransaction['status'], selected: boolean): string {
  if (selected) return 'bg-blue-100';
  if (status === 'ALLOCATED') return 'bg-green-50';
  if (status === 'FLAGGED') return 'bg-amber-50';
  return '';
}

const PAGE_SIZE = 1000;
const MAX_BULK_ACTION = 300;

export function BulkDataGrid({ transactions, ledgerAccounts, onMoveToLedger, onCreateAndMove, onFlagRows, onDeleteRows, onUnallocateRows, onCreateNewLedger }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxMenuState | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('txnDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SuspenseTransaction['status']>('ALL');
  const [isCollageMode, setIsCollageMode] = useState(false);
  const [page, setPage] = useState(0);

  const ctxRef = useRef<HTMLDivElement>(null);

  const statusBadge = (t: SuspenseTransaction) => {
    if (t.status === 'UNALLOCATED') {
      return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">Pending</span>;
    }
    if (t.status === 'ALLOCATED') {
      const ledger = t.allocatedLedgerId ? ledgerAccounts.find((l) => l.id === t.allocatedLedgerId) : null;
      const ledgerName = ledger ? ledger.name : 'Allocated';
      return (
        <span 
          className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium border border-green-200 flex items-center gap-1 justify-center max-w-[140px] truncate mx-auto"
          title={ledgerName}
        >
          <Check className="h-3 w-3 shrink-0" />
          <span className="truncate">{ledgerName}</span>
        </span>
      );
    }
    if (t.status === 'FLAGGED') {
      return <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-medium border border-orange-200">Flagged</span>;
    }
    return null;
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [ctx]);

  const extractPayee = useCallback((narration: string) => {
    const parts = narration.split('/');
    if (parts.length >= 2 && ['UPI', 'NEFT', 'IMPS', 'RTGS'].some(p => narration.toUpperCase().startsWith(p))) {
      return parts[1].trim().toUpperCase();
    }
    // Fallback: first 3 words
    return narration.split(' ').slice(0, 3).join(' ').trim().toUpperCase();
  }, []);

  const filtered = useMemo(() => {
    let rows = transactions;
    if (statusFilter !== 'ALL') rows = rows.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.narration.toLowerCase().includes(q) ||
          t.referenceNo.toLowerCase().includes(q),
      );
    }
    
    if (isCollageMode) {
      const payeeStats = new Map<string, { count: number; totalAmt: number }>();
      rows.forEach(t => {
        const p = extractPayee(t.narration);
        const stats = payeeStats.get(p) || { count: 0, totalAmt: 0 };
        stats.count += 1;
        stats.totalAmt += t.amount;
        payeeStats.set(p, stats);
      });

      const collageSorted = [...rows].sort((a, b) => {
        const pA = extractPayee(a.narration);
        const pB = extractPayee(b.narration);
        if (pA !== pB) {
          const sA = payeeStats.get(pA)!;
          const sB = payeeStats.get(pB)!;
          if (sA.count !== sB.count) return sB.count - sA.count;
          if (sA.totalAmt !== sB.totalAmt) return sB.totalAmt - sA.totalAmt;
          return pA.localeCompare(pB);
        }
        if (a.direction !== b.direction) return a.direction.localeCompare(b.direction);
        const dateCmp = (a.txnDate ?? '').localeCompare(b.txnDate ?? '');
        if (dateCmp === 0) return a.originalRowNumber - b.originalRowNumber;
        return dateCmp;
      });

      if (statusFilter === 'ALL') {
        return [...collageSorted.filter(t => t.status !== 'ALLOCATED'), ...collageSorted.filter(t => t.status === 'ALLOCATED')];
      }
      return collageSorted;
    }

    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'txnDate') cmp = (a.txnDate ?? '').localeCompare(b.txnDate ?? '');
      else if (sortKey === 'narration') cmp = a.narration.localeCompare(b.narration);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'direction') cmp = a.direction.localeCompare(b.direction);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);

      // Secondary sort by originalRowNumber to prevent jumbled transactions on the same day
      if (cmp === 0) {
        return a.originalRowNumber - b.originalRowNumber;
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Push ALLOCATED rows to the bottom (only when showing all statuses)
    if (statusFilter === 'ALL') {
      const unalloc = sorted.filter(t => t.status !== 'ALLOCATED');
      const alloc = sorted.filter(t => t.status === 'ALLOCATED');
      return [...unalloc, ...alloc];
    }
    return sorted;
  }, [transactions, statusFilter, search, sortKey, sortDir, isCollageMode, extractPayee]);

  const paged = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const handleInteraction = useCallback(
    (e: React.MouseEvent, id: string, isCheckbox: boolean) => {
      if (!isCheckbox) {
        e.preventDefault();
      }
      e.stopPropagation();

      const newSel = new Set(selected);

      if (e.shiftKey && lastSelected) {
        // Range select (always adds to current selection)
        const ids = paged.map((t) => t.id);
        const from = ids.indexOf(lastSelected);
        const to = ids.indexOf(id);
        if (from >= 0 && to >= 0) {
          const [lo, hi] = from < to ? [from, to] : [to, from];
          for (let i = lo; i <= hi; i++) newSel.add(ids[i]);
        }
      } else if (isCheckbox || e.ctrlKey || e.metaKey) {
        // Toggle specific row
        if (newSel.has(id)) newSel.delete(id);
        else newSel.add(id);
      } else {
        // Exclusive single select
        newSel.clear();
        newSel.add(id);
      }

      setSelected(newSel);
      setLastSelected(id);
    },
    [selected, lastSelected, paged],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      // Include right-clicked row in selection if not already
      let ids = [...selected];
      if (!selected.has(id)) {
        setSelected(new Set([id]));
        ids = [id];
      }
      setCtx({ x: e.clientX, y: e.clientY, selectedIds: ids });
    },
    [selected],
  );

  const handleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((t) => t.id)));
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-500" />
      : <ChevronDown className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 bg-white border border-gray-200 rounded-md px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Filter by narration or reference..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(0); }}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
          >
            <option value="ALL">All status</option>
            <option value="UNALLOCATED">Pending</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="FLAGGED">Flagged</option>
          </select>
        </div>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          onClick={() => { setIsCollageMode(!isCollageMode); setPage(0); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors border ${
            isCollageMode 
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
          title="Group by Payee (Highest transaction count first)"
        >
          <Layers className={`h-3.5 w-3.5 ${isCollageMode ? 'text-blue-600' : 'text-gray-400'}`} />
          Collage by Payee
        </button>

        <span className="text-xs text-gray-500">
          {filtered.length.toLocaleString()} rows
          {selected.size > 0 && <span className="text-blue-600 font-medium"> · {selected.size} selected</span>}
        </span>

        <div className="flex-1" />

        {onCreateNewLedger && (
          <button
            onClick={onCreateNewLedger}
            className="px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium transition-colors border border-blue-200"
          >
            + New Ledger
          </button>
        )}

        {selected.size > 0 && (
          <button
            onClick={() => {
              if (selected.size < 1) return;
              if (selected.size > MAX_BULK_ACTION) {
                alert(`Too many rows selected for Move to Ledger (${selected.size}). Maximum is ${MAX_BULK_ACTION} at a time.\n\nTip: Delete has no limit — you can delete all rows at once.`);
                return;
              }
              onMoveToLedger([...selected]);
            }}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              selected.size > MAX_BULK_ACTION
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={selected.size > MAX_BULK_ACTION ? `Select at most ${MAX_BULK_ACTION} rows to move (${selected.size} selected)` : undefined}
          >
            Move to Ledger{selected.size > MAX_BULK_ACTION ? ` (max ${MAX_BULK_ACTION})` : ''}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && selected.size === paged.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              {([
                ['txnDate', 'Date'],
                ['narration', 'Narration'],
                ['referenceNo', 'Reference'],
                ['amount', 'Amount'],
                ['direction', 'Dir.'],
                ['status', 'Status'],
              ] as const).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => key !== 'referenceNo' && toggleSort(key as SortKey)}
                  className={`px-3 py-1.5 text-left font-semibold text-gray-600 tracking-wide whitespace-nowrap ${
                    key !== 'referenceNo' ? 'cursor-pointer hover:bg-gray-200 select-none' : ''
                  } ${key === 'amount' ? 'text-right' : ''}`}
                >
                  <span className="flex items-center gap-1 justify-start">
                    {label}
                    {key !== 'referenceNo' && <SortIcon col={key as SortKey} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">
                  {transactions.length === 0
                    ? 'No transactions yet — import a bank statement to begin.'
                    : 'No rows match the current filter.'}
                </td>
              </tr>
            ) : (
              paged.map((t, i) => {
                const isNewGroup = isCollageMode && i > 0 && extractPayee(t.narration) !== extractPayee(paged[i - 1].narration);
                return (
                  <React.Fragment key={t.id}>
                    {isNewGroup && (
                      <tr>
                        <td colSpan={7} className="h-3 bg-gray-50 border-y border-gray-200 shadow-inner"></td>
                      </tr>
                    )}
                    <tr
                      className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${rowBg(t.status, selected.has(t.id))}`}
                      onClick={(e) => handleInteraction(e, t.id, false)}
                      onContextMenu={(e) => handleContextMenu(e, t.id)}
                    >
                  <td className="px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      readOnly
                      className="rounded border-gray-300 cursor-pointer"
                      onClick={(e) => handleInteraction(e, t.id, true)}
                    />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap text-gray-600">{formatDate(t.txnDate)}</td>
                  <td className="px-3 py-1 text-gray-800 break-words">{t.narration}</td>
                  <td className="px-3 py-1 text-gray-500 max-w-[120px] truncate">{t.referenceNo || '—'}</td>
                  <td className={`px-3 py-1 text-right font-mono tabular-nums whitespace-nowrap ${
                    t.direction === 'PAYMENT' ? 'text-red-600' : 'text-green-700'
                  }`}>
                    {t.direction === 'PAYMENT' ? '−' : '+'}₹{formatAmount(t.amount)}
                  </td>
                  <td className="px-3 py-1 text-center">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                      t.direction === 'PAYMENT' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {t.direction === 'PAYMENT' ? 'Pay' : 'Rcpt'}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center">{statusBadge(t)}</td>
                </tr>
                </React.Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages} · Showing {paged.length} of {filtered.length} rows
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {ctx && (() => {
        const ctxIds = ctx.selectedIds;
        const allAllocated = ctxIds.every(id => transactions.find(t => t.id === id)?.status === 'ALLOCATED');
        // Guard for ledger-allocation actions only (max 300). Delete is unlimited.
        const guardMove = (fn: () => void) => () => {
          if (ctxIds.length > MAX_BULK_ACTION) {
            alert(`Too many rows selected for this action (${ctxIds.length}). Maximum is ${MAX_BULK_ACTION} at a time.\n\nTip: Delete has no limit — you can delete all rows at once.`);
            setCtx(null);
            return;
          }
          fn();
        };
        return (
          <div
            ref={ctxRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px] text-sm"
          >
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-3 py-1">
              {ctxIds.length} row{ctxIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="my-1 border-t border-gray-100" />
            {allAllocated ? (
              <>
                <CtxItem
                  label="Unallocate"
                  sub="Reset to unallocated (pending)"
                  onClick={() => { setCtx(null); onUnallocateRows(ctxIds); }}
                />
                <CtxItem
                  label="Alter / Move"
                  sub="Re-classify to a different ledger"
                  onClick={guardMove(() => { setCtx(null); onMoveToLedger(ctxIds); })}
                />
              </>
            ) : (
              <>
                <CtxItem
                  label="Move to Ledger"
                  sub={`Select an existing ledger${ctxIds.length > MAX_BULK_ACTION ? ` (max ${MAX_BULK_ACTION})` : ''}`}
                  onClick={guardMove(() => { setCtx(null); onMoveToLedger(ctxIds); })}
                />
                <CtxItem
                  label="Create Ledger & Move"
                  sub="Create a new ledger inline"
                  onClick={guardMove(() => { setCtx(null); onCreateAndMove(ctxIds); })}
                />
                <div className="my-1 border-t border-gray-100" />
                <CtxItem
                  label="Flag for Review"
                  sub="Mark as needs review"
                  onClick={() => { setCtx(null); onFlagRows(ctxIds); }}
                />
              </>
            )}
            <div className="my-1 border-t border-gray-100" />
            <CtxItem
              label="Delete Rows"
              sub={`Permanently remove ${ctxIds.length.toLocaleString()} row${ctxIds.length !== 1 ? 's' : ''}`}
              onClick={() => { setCtx(null); onDeleteRows(ctxIds); }}
              danger
            />
          </div>
        );
      })()}
    </div>
  );
}

function CtxItem({
  label,
  sub,
  onClick,
  danger,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col items-start px-3 py-2 text-left transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span className="text-[11px] text-gray-400 mt-0.5">{sub}</span>
    </button>
  );
}
