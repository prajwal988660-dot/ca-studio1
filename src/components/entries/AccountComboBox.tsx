'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { searchAccounts, getMasterAccount, findExistingAccountName, normalizeAccountName } from '@/lib/chartOfAccounts';
import { registerCustomAccount } from '@/lib/offlineDb';
import { LEDGER_GROUPS, getGroupByScheduleIII } from '@/lib/coa';
import type { PrimaryGroup, JournalNature } from '@/lib/coa';

// ─── New Account Dialog ───────────────────────────────────────────────────────

interface NewAccountDialogProps {
  name: string;
  onConfirm: (name: string, primaryGroup: PrimaryGroup, subGroup: string) => void;
  onCancel: () => void;
}

const PG_ORDER: PrimaryGroup[] = ['Capital & Liabilities', 'Assets', 'Income', 'Expenses'];

const PG_COLORS: Record<PrimaryGroup, { card: string; badge: string; border: string }> = {
  'Capital & Liabilities': { card: 'hover:border-orange-300 hover:bg-orange-50', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-300 bg-orange-50' },
  'Assets':               { card: 'hover:border-blue-300 hover:bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-300 bg-blue-50' },
  'Income':               { card: 'hover:border-green-300 hover:bg-green-50', badge: 'bg-green-100 text-green-700', border: 'border-green-300 bg-green-50' },
  'Expenses':             { card: 'hover:border-red-300 hover:bg-red-50',     badge: 'bg-red-100 text-red-700',     border: 'border-red-300 bg-red-50' },
};

function NewAccountDialog({ name, onConfirm, onCancel }: NewAccountDialogProps) {
  const [accountName, setAccountName] = useState(name);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [activePG, setActivePG] = useState<PrimaryGroup>('Assets');
  const [error, setError] = useState('');

  const groupedOptions = useMemo(() =>
    PG_ORDER.map(pg => ({
      pg,
      groups: LEDGER_GROUPS.filter(g => g.primaryGroup === pg),
    })),
  []);

  const selectedGroup = LEDGER_GROUPS.find(g => g.id === selectedGroupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) { setError('Account name is required'); return; }
    if (!selectedGroupId || !selectedGroup) { setError('Please select an account group'); return; }
    onConfirm(accountName.trim(), selectedGroup.primaryGroup, selectedGroup.scheduleIII);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Create New Account</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Give this account a name and place it under the right group</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* Account name */}
            <div className="px-6 pt-5 pb-3">
              {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Account Name *</label>
              <input
                autoFocus
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. Ramesh Traders, Office Rent Expense, SBI Current Account"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              />
            </div>

            {/* Primary group tabs */}
            <div className="px-6 pb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Under Group *</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {PG_ORDER.map(pg => {
                  const colors = PG_COLORS[pg];
                  const isActive = activePG === pg;
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => { setActivePG(pg); setSelectedGroupId(''); }}
                      className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                        isActive
                          ? `${colors.badge} ring-1 ring-current`
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              {/* Groups for selected primary group */}
              <div className="grid grid-cols-2 gap-2">
                {groupedOptions.find(g => g.pg === activePG)?.groups.map(group => {
                  const colors = PG_COLORS[activePG];
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        isSelected
                          ? colors.border
                          : `border-gray-100 bg-gray-50/50 ${colors.card}`
                      }`}
                    >
                      <p className={`text-[11px] font-bold mb-0.5 ${isSelected ? '' : 'text-gray-700'}`}>{group.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{group.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected group indicator */}
            {selectedGroup && (
              <div className="mx-6 mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-[11px] text-blue-700">
                  <span className="font-semibold">{selectedGroup.label}</span>
                  <span className="text-blue-400 mx-1.5">·</span>
                  <span className="capitalize">{selectedGroup.nature}</span>
                  <span className="text-blue-400 mx-1.5">·</span>
                  <span>{selectedGroup.primaryGroup}</span>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
            <button type="button" onClick={onCancel} className="flex-1 h-9 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 bg-white">
              Cancel
            </button>
            <button type="submit" disabled={!selectedGroupId || !accountName.trim()} className="flex-1 h-9 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors font-semibold">
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── GST Shortcut Accounts ────────────────────────────────────────────────────

const GST_SHORTCUTS: Array<{
  name: string;
  subGroup: string;
  primaryGroup: PrimaryGroup;
  nature: JournalNature;
  badge: string;
  desc: string;
  itemColor: string;
  badgeColor: string;
}> = [
  {
    name: 'Intra GST Input',
    subGroup: 'GST_INTRA_INPUT',
    primaryGroup: 'Assets',
    nature: 'asset',
    badge: 'CGST + SGST',
    desc: 'Purchase · Dr CGST & SGST Input Tax Credit',
    itemColor: 'text-blue-700 hover:bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-600',
  },
  {
    name: 'Intra GST Output',
    subGroup: 'GST_INTRA_OUTPUT',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    badge: 'CGST + SGST',
    desc: 'Sales · Cr CGST & SGST Output Tax',
    itemColor: 'text-green-700 hover:bg-green-50',
    badgeColor: 'bg-green-100 text-green-600',
  },
  {
    name: 'Inter GST Input (IGST)',
    subGroup: 'GST_INTER_INPUT',
    primaryGroup: 'Assets',
    nature: 'asset',
    badge: 'IGST',
    desc: 'Purchase · Dr IGST Input Tax Credit',
    itemColor: 'text-indigo-700 hover:bg-indigo-50',
    badgeColor: 'bg-indigo-100 text-indigo-600',
  },
  {
    name: 'Inter GST Output (IGST)',
    subGroup: 'GST_INTER_OUTPUT',
    primaryGroup: 'Capital & Liabilities',
    nature: 'liability',
    badge: 'IGST',
    desc: 'Sales · Cr IGST Output Tax',
    itemColor: 'text-violet-700 hover:bg-violet-50',
    badgeColor: 'bg-violet-100 text-violet-600',
  },
];

// ─── AccountComboBox ──────────────────────────────────────────────────────────

interface AccountComboBoxProps {
  companyId: string;
  value: string;
  onChange: (name: string, meta?: { primaryGroup: PrimaryGroup; subGroup: string; nature: JournalNature }) => void;
  placeholder?: string;
  className?: string;
}

export function AccountComboBox({
  companyId,
  value,
  onChange,
  placeholder = 'Account name...',
  className = '',
}: AccountComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [pendingNew, setPendingNew] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { basic, extended, isNew } = useMemo(
    () => searchAccounts(companyId, search),
    [companyId, search]
  );

  // Merge basic + extended into one flat alphabetical list, no duplicates
  const allVisible = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const n of [...basic, ...extended]) {
      const k = n.toLowerCase();
      if (!seen.has(k)) { seen.add(k); merged.push(n); }
    }
    return merged.sort((a, b) => a.localeCompare(b));
  }, [basic, extended]);

  // Space+case insensitive: "Sudhir " == "sudhir" == " SUDHIR"
  const normalizedSearch = useMemo(() => normalizeAccountName(search).toLowerCase(), [search]);
  const existingMatch = useMemo(() => {
    if (!normalizedSearch) return null;
    return allVisible.find(n => normalizeAccountName(n).toLowerCase() === normalizedSearch) ?? null;
  }, [normalizedSearch, allVisible]);

  const hasQuery = search.trim().length > 0;
  // Always show "Create" row when there is a non-empty query
  const hasNewRow = hasQuery;

  // GST shortcut items — visible when query matches any part of their name
  const visibleGstShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return GST_SHORTCUTS.filter(s => s.name.toLowerCase().includes(q));
  }, [search]);

  const showDropdown = open && (allVisible.length > 0 || hasNewRow || visibleGstShortcuts.length > 0);

  useEffect(() => { setSearch(value); }, [value]);
  useEffect(() => { setHighlightIdx(-1); }, [search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectName = (name: string) => {
    const master = getMasterAccount(name);
    if (master) {
      onChange(name, { primaryGroup: master.primaryGroup, subGroup: master.subGroup, nature: master.nature });
    } else {
      onChange(name);
    }
    setSearch(name);
    setOpen(false);
  };

  const handleNewAccount = (name: string, pg: PrimaryGroup, sg: string) => {
    const normalized = normalizeAccountName(name);
    const existing = findExistingAccountName(companyId, normalized);
    if (existing) { selectName(existing); setPendingNew(null); return; }
    const group = getGroupByScheduleIII(sg);
    const nature: JournalNature = group?.nature ?? 'expense';
    // Persist account so it survives JE deletion
    registerCustomAccount(companyId, normalized, sg, nature);
    onChange(normalized, { primaryGroup: pg, subGroup: sg, nature });
    setSearch(normalized);
    setPendingNew(null);
    setOpen(false);
  };

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            const optionCount = allVisible.length + (hasNewRow ? 1 : 0);
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlightIdx(p => Math.min(p + 1, optionCount - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(p => Math.max(p - 1, -1)); }
            else if (e.key === 'Enter') {
              e.preventDefault();
              if (highlightIdx >= 0 && highlightIdx < optionCount) {
                if (hasNewRow && highlightIdx === 0) {
                  if (existingMatch) {
                    selectName(existingMatch);
                  } else {
                    const normalized = normalizeAccountName(search);
                    const existing = findExistingAccountName(companyId, normalized);
                    if (existing) { selectName(existing); }
                    else { setPendingNew(normalized); }
                  }
                  setOpen(false);
                } else {
                  const idx = highlightIdx - (hasNewRow ? 1 : 0);
                  if (idx >= 0 && idx < allVisible.length) { selectName(allVisible[idx]); setOpen(false); }
                }
              }
            }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          className={`w-full border border-gray-200 rounded-lg px-2.5 pr-7 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />

        {showDropdown && (
          <div
            ref={listRef}
            className="absolute z-50 top-full left-0 right-0 mt-0.5 max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg"
          >
            {/* GST Shortcut Items */}
            {visibleGstShortcuts.length > 0 && (
              <div className="border-b border-gray-100">
                <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">GST Shortcuts</p>
                {visibleGstShortcuts.map(sc => (
                  <div
                    key={sc.subGroup}
                    onMouseDown={e => {
                      e.preventDefault();
                      onChange(sc.name, { primaryGroup: sc.primaryGroup, subGroup: sc.subGroup, nature: sc.nature });
                      setSearch(sc.name);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer ${sc.itemColor}`}
                  >
                    <div>
                      <p className="text-xs font-semibold">{sc.name}</p>
                      <p className="text-[10px] opacity-60">{sc.desc}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${sc.badgeColor}`}>{sc.badge}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Create / duplicate indicator */}
            {hasNewRow && (
              <div
                onMouseDown={e => {
                  e.preventDefault();
                  if (existingMatch) {
                    // Duplicate: just select the existing account
                    selectName(existingMatch);
                  } else {
                    const normalized = normalizeAccountName(search);
                    const existing = findExistingAccountName(companyId, normalized);
                    if (existing) { selectName(existing); }
                    else { setPendingNew(normalized); setOpen(false); }
                  }
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 ${existingMatch ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50'} ${highlightIdx === 0 ? 'brightness-95' : ''}`}
              >
                <span className="text-xs font-medium">
                  {existingMatch
                    ? <>Already exists: <span className="font-bold">{existingMatch}</span> — click to select</>
                    : <>+ Create "<span className="font-bold">{search.trim()}</span>"</>
                  }
                </span>
              </div>
            )}

            {/* Flat alphabetical list */}
            {allVisible.map((name, i) => {
              const idx = i + (hasNewRow ? 1 : 0);
              return (
                <div
                  key={name}
                  onMouseDown={e => { e.preventDefault(); selectName(name); }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`px-3 py-1.5 cursor-pointer text-sm truncate ${
                    idx === highlightIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingNew && (
        <NewAccountDialog
          name={pendingNew}
          onConfirm={handleNewAccount}
          onCancel={() => setPendingNew(null)}
        />
      )}
    </>
  );
}
