import React, { useState, useMemo } from 'react';
import { X, Search, Plus } from 'lucide-react';
import type { BulkLedgerAccount } from '@/lib/bulk/types';

interface Props {
  ledgers: BulkLedgerAccount[];
  selectedIds: string[];
  onConfirm: (ledgerAccountId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
  /** Number of rows being moved */
  rowCount: number;
}

export function LedgerPickerModal({
  ledgers,
  selectedIds: _selectedIds,
  onConfirm,
  onCreateNew,
  onClose,
  rowCount,
}: Props) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return ledgers;
    const q = search.toLowerCase();
    return ledgers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.group.toLowerCase().includes(q),
    );
  }, [ledgers, search]);

  // Group by accountType for display
  const grouped = useMemo(() => {
    const map: Record<string, BulkLedgerAccount[]> = {};
    for (const l of filtered) {
      const key = l.group;
      (map[key] ??= []).push(l);
    }
    return map;
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Move to Ledger</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {rowCount} row{rowCount !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ledgers..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No ledgers found
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-2 py-1">
                  {group}
                </p>
                {items.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setPicked(l.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      picked === l.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{l.name}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 gap-2">
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Create new ledger
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!picked}
              onClick={() => picked && onConfirm(picked)}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
