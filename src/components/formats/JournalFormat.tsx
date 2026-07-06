'use client';

import React, { useRef, useEffect, useState } from 'react';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { Package, X } from 'lucide-react';
import type { InventorySubLine } from '@/types/journal';
import { summarizeInventorySubLines, computeInventorySubLine } from '@/lib/accounting/inventoryJournal';

interface JournalEntryDisplayLine {
  accountName: string;
  isDebit: boolean;
  amount: number;
  inventorySubLines?: InventorySubLine[];
  tdsSection?: string;
  tdsRate?: number;
  tcsSection?: string;
  tcsRate?: number;
}
interface JournalEntryDisplay {
  entryCode: string;
  date: string;
  lines: JournalEntryDisplayLine[];
  narration: string;
  voucherType: string;
}

interface JournalFormatProps {
  companyName: string;
  period: string;
  entries: JournalEntryDisplay[];
  highlightEntryCode?: string;
  emptyMessage?: string;
  selectedCodes?: Set<string>;
  onSelectionChange?: (codes: Set<string>) => void;
  onDeleteEntry?: (entryCode: string) => void;
  onEditEntry?: (entryCode: string) => void;
}

const VTYPE_CLASS: Record<string, string> = {
  JRN: 'vtype-JRN', SLS: 'vtype-SLS', PUR: 'vtype-PUR',
  RCT: 'vtype-RCT', PMT: 'vtype-PMT', CNT: 'vtype-CNT',
  DN:  'vtype-DN',  CN:  'vtype-CN',  PAY: 'vtype-PAY',
};

const VTYPE_LABEL: Record<string, string> = {
  JRN: 'Journal', SLS: 'Sales', PUR: 'Purchase',
  RCT: 'Receipt', PMT: 'Payment', CNT: 'Contra',
  DN: 'Debit Note', CN: 'Credit Note', PAY: 'Payroll',
};

// ── Inventory detail popup ────────────────────────────────────────────────────
function InventoryPopup({ subLines, onClose }: { subLines: InventorySubLine[]; onClose: () => void }) {
  const summary = summarizeInventorySubLines(subLines);
  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-blue-600" />
            <h3 className="text-xs md:text-sm font-bold text-gray-900">Inventory Items</h3>
            <span className="text-[10px] md:text-xs text-gray-400">{subLines.length} item{subLines.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] md:text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                {['Item / Description', 'HSN / SAC', 'Unit', 'Qty', 'Rate (₹)', 'Disc %', 'CGST %', 'SGST %', 'IGST %', 'Amount (₹)', 'Tax (₹)', 'Total (₹)'].map(h => (
                  <th key={h} className={`px-1.5 py-1 text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap ${h.endsWith('(₹)') || h === 'Qty' || h.endsWith('%') ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subLines.map((sub, i) => {
                const c = computeInventorySubLine(sub);
                const taxTotal = c.cgst_amount + c.sgst_amount + c.igst_amount;
                return (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-1.5 py-1 font-medium text-gray-900">{sub.inventory_name || '—'}</td>
                    <td className="px-1.5 py-1 font-mono text-gray-600 uppercase">{sub.hsn_sac || '—'}</td>
                    <td className="px-1.5 py-1 text-gray-600">{sub.unit || '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums">{sub.qty}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums">{formatIndianCurrency(sub.rate)}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums text-gray-500">{sub.discount_percent ? `${sub.discount_percent}%` : '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums text-gray-500">{sub.cgst_percent ? `${sub.cgst_percent}%` : '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums text-gray-500">{sub.sgst_percent ? `${sub.sgst_percent}%` : '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums text-gray-500">{sub.igst_percent ? `${sub.igst_percent}%` : '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums">{formatIndianCurrency(c.amount)}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums text-amber-600">{taxTotal > 0 ? formatIndianCurrency(taxTotal) : '—'}</td>
                    <td className="px-1.5 py-1 text-right font-mono tabular-nums font-semibold text-gray-900">{formatIndianCurrency(c.final_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={9} className="px-1.5 py-1 text-[10px] md:text-xs font-semibold text-gray-600">Totals</td>
                <td className="px-1.5 py-1 text-right font-mono font-semibold tabular-nums">{formatIndianCurrency(summary.taxableTotal)}</td>
                <td className="px-1.5 py-1 text-right font-mono font-semibold tabular-nums text-amber-600">
                  {formatIndianCurrency(summary.cgstTotal + summary.sgstTotal + summary.igstTotal)}
                </td>
                <td className="px-1.5 py-1 text-right font-mono font-bold tabular-nums text-gray-900">{formatIndianCurrency(summary.finalTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export function JournalFormat({
  companyName, period, entries,
  highlightEntryCode, emptyMessage = 'No journal entries found for this period.',
  selectedCodes, onSelectionChange,
  onDeleteEntry, onEditEntry,
}: JournalFormatProps) {
  const [inventoryPopup, setInventoryPopup] = useState<InventorySubLine[] | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entryCode: string } | null>(null);

  // Close context menu on outside click / scroll
  React.useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('scroll', close, true); };
  }, [ctxMenu]);
  const scrollToRef = useRef<HTMLTableRowElement | null>(null);
  const lastClickedIndexRef = useRef<number>(-1);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const code = (highlightEntryCode ?? '').trim();
  const highlightIndex = code
    ? entries.findIndex(e => e.entryCode.includes(code))
    : -1;

  const isSelectable = !!onSelectionChange;
  const allSelected = isSelectable && entries.length > 0 && entries.every(e => selectedCodes?.has(e.entryCode));
  const someSelected = isSelectable && entries.some(e => selectedCodes?.has(e.entryCode));

  useEffect(() => {
    if (highlightIndex >= 0 && scrollToRef.current) {
      scrollToRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightIndex, code]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(entries.map(e => e.entryCode)));
    }
  };

  const handleEntryClick = (index: number, entryCode: string, isShift: boolean) => {
    if (!onSelectionChange || !selectedCodes) return;
    const newSet = new Set(selectedCodes);
    if (isShift && lastClickedIndexRef.current >= 0) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const selecting = !selectedCodes.has(entryCode);
      for (let i = start; i <= end; i++) {
        if (selecting) newSet.add(entries[i].entryCode);
        else newSet.delete(entries[i].entryCode);
      }
    } else {
      if (newSet.has(entryCode)) newSet.delete(entryCode);
      else newSet.add(entryCode);
      lastClickedIndexRef.current = index;
    }
    onSelectionChange(newSet);
  };

  // Build LF map
  const allAccounts = new Set<string>();
  for (const e of entries) for (const l of e.lines) allAccounts.add(l.accountName);
  const folioMap = new Map<string, number>();
  [...allAccounts].sort().forEach((acc, i) => folioMap.set(acc, i + 1));

  if (entries.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-xs md:text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  let totalDebit = 0, totalCredit = 0;
  for (const e of entries) for (const l of e.lines) {
    if (l.isDebit) totalDebit += l.amount; else totalCredit += l.amount;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="text-center py-2 border-b border-gray-200 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{companyName}</p>
        <h3 className="text-sm font-bold text-gray-900 mt-px">JOURNAL</h3>
        <p className="text-[10px] text-gray-400 mt-px">{period}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-[13px] min-w-[800px]">
          <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {isSelectable && (
              <th className="px-2 py-1.5 w-8 border-r border-gray-100 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                  title="Select all"
                />
              </th>
            )}
            <th className="px-2 py-1.5 text-left text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20 border-r border-gray-100">Date</th>
            <th className="px-2 py-1.5 text-left text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Particulars</th>
            <th className="px-2 py-1.5 text-center text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8 border-r border-gray-100">LF</th>
            <th className="px-2 py-1.5 text-right text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28 border-r border-gray-100">Debit (₹)</th>
            <th className="px-2 py-1.5 text-right text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Credit (₹)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, ei) => {
            const isHighlighted = ei === highlightIndex;
            const hlClass = isHighlighted ? 'bg-yellow-50' : '';

            return (
              <React.Fragment key={ei}>
                {entry.lines.map((line, li) => (
                  <tr
                    key={`${ei}-${li}`}
                    ref={isHighlighted && li === 0 ? scrollToRef : undefined}
                    className={`border-b border-gray-100 ${hlClass} hover:bg-blue-50/20 transition-colors`}
                    onContextMenu={(e) => {
                      if (!onDeleteEntry && !onEditEntry) return;
                      e.preventDefault();
                      setCtxMenu({ x: e.clientX, y: e.clientY, entryCode: entry.entryCode });
                    }}
                  >
                    {li === 0 && isSelectable && (
                      <td
                        className="px-2 py-1 align-top border-r border-gray-100 text-center"
                        rowSpan={entry.lines.length + 1}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCodes?.has(entry.entryCode) ?? false}
                          onChange={() => {}}
                          onClick={(e) => handleEntryClick(ei, entry.entryCode, e.shiftKey)}
                          className="h-4 w-4 accent-blue-600 cursor-pointer mt-0.5"
                        />
                      </td>
                    )}
                    {li === 0 && (
                      <td
                        className="px-2 py-1 align-top border-r border-gray-100"
                        rowSpan={entry.lines.length + 1}
                      >
                        <div className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">{entry.date}</div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-semibold ${VTYPE_CLASS[entry.voucherType] ?? 'vtype-JRN'}`}>
                            {VTYPE_LABEL[entry.voucherType] ?? entry.voucherType}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[8px] md:text-[9px] font-mono font-semibold text-blue-600">{entry.entryCode}</div>
                      </td>
                    )}
                    <td className={`px-2 py-1 border-r border-gray-100 ${!line.isDebit ? 'pl-6' : ''}`}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Inventory items button */}
                        {line.inventorySubLines && line.inventorySubLines.length > 0 && (
                          <button
                            onClick={() => setInventoryPopup(line.inventorySubLines!)}
                            className="inline-flex items-center gap-0.5 h-4 px-1.5 text-[8px] md:text-[9px] font-semibold rounded-full border border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
                            title="View inventory items"
                          >
                            <Package className="h-2.5 w-2.5" />
                            {line.inventorySubLines.length}
                          </button>
                        )}
                        {/* TDS badge */}
                        {line.tdsSection && (
                          <span className="inline-flex items-center h-4 px-1.5 text-[8px] md:text-[9px] font-semibold rounded-full border border-orange-300 text-orange-700 bg-orange-50 shrink-0" title={`TDS u/s ${line.tdsSection} @ ${line.tdsRate ?? '?'}%`}>
                            TDS {line.tdsSection}
                          </span>
                        )}
                        {/* TCS badge */}
                        {line.tcsSection && (
                          <span className="inline-flex items-center h-4 px-1.5 text-[8px] md:text-[9px] font-semibold rounded-full border border-purple-300 text-purple-700 bg-purple-50 shrink-0" title={`TCS u/s ${line.tcsSection} @ ${line.tcsRate ?? '?'}%`}>
                            TCS {line.tcsSection}
                          </span>
                        )}
                        {line.isDebit ? (
                          <span className="font-medium text-gray-900">
                            {/a\/c\.?$/i.test(line.accountName.trim()) ? line.accountName : `${line.accountName} A/c`}
                            <span className="ml-1 text-[9px] md:text-[10px] font-normal text-gray-400">Dr.</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            To {/a\/c\.?$/i.test(line.accountName.trim()) ? line.accountName : `${line.accountName} A/c`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center text-[9px] md:text-[10px] text-gray-400 border-r border-gray-100">
                      {folioMap.get(line.accountName) ?? ''}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-xs md:text-[13px] tabular-nums border-r border-gray-100 text-dr">
                      {line.isDebit ? formatIndianCurrency(line.amount) : ''}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-xs md:text-[13px] tabular-nums text-cr">
                      {!line.isDebit ? formatIndianCurrency(line.amount) : ''}
                    </td>
                  </tr>
                ))}
                {/* Narration row */}
                <tr className={`border-b-2 border-gray-200 ${hlClass}`}>
                  <td className="px-2 py-1.5 pl-6 text-[10px] md:text-xs text-gray-400 italic border-r border-gray-100" colSpan={4}>
                    ({entry.narration || 'No narration'})
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            {isSelectable && <td className="px-2 py-1.5 border-r border-gray-100" />}
            <td className="px-2 py-1.5 border-r border-gray-100" />
            <td className="px-2 py-1.5 font-bold text-gray-900 text-xs md:text-[13px] border-r border-gray-100">Total</td>
            <td className="px-2 py-1.5 border-r border-gray-100" />
            <td className="px-2 py-1.5 text-right font-mono font-bold text-xs md:text-[13px] text-dr border-r border-gray-100">
              {formatIndianCurrency(totalDebit)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono font-bold text-xs md:text-[13px] text-cr">
              {formatIndianCurrency(totalCredit)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {inventoryPopup && (
        <InventoryPopup subLines={inventoryPopup} onClose={() => setInventoryPopup(null)} />
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-[80] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          {onEditEntry && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
              onClick={() => { onEditEntry(ctxMenu.entryCode); setCtxMenu(null); }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
              Edit Entry
            </button>
          )}
          {onDeleteEntry && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              onClick={() => { onDeleteEntry(ctxMenu.entryCode); setCtxMenu(null); }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              Delete Entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
