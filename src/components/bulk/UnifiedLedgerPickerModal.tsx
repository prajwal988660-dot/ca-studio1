/**
 * UnifiedLedgerPickerModal — Bulk workspace account picker.
 *
 * Literally embeds AccountComboBox — the same component the manual journal entry
 * dialog uses. Same COA, same NewAccountDialog UI, same registerCustomAccount storage.
 * One electricity source, two wiring points.
 *
 * When the user selects (or creates) an account here, the page calls createLedger()
 * to auto-create / find the BulkLedgerAccount in bulk_data_v1, then moveIdsToLedger().
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AccountComboBox } from '@/components/entries/AccountComboBox';
import type { PrimaryGroup, JournalNature } from '@/lib/coa';

interface Props {
  companyId: string;
  rowCount: number;
  /** Called with the resolved account name + scheduleIII group + nature. */
  onPick: (name: string, scheduleIII: string, accountType: string) => void;
  onClose: () => void;
}

export function UnifiedLedgerPickerModal({ companyId, rowCount, onPick, onClose }: Props) {
  const [accountValue, setAccountValue] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<{
    subGroup: string;
    accountType: string;
  } | null>(null);

  const handleAccountChange = (
    name: string,
    meta?: { primaryGroup: PrimaryGroup; subGroup: string; nature: JournalNature },
  ) => {
    setAccountValue(name);
    // meta is only provided when user properly selects/creates from the dropdown
    if (meta) {
      setSelectedMeta({ subGroup: meta.subGroup, accountType: meta.nature });
    } else {
      // User is typing — clear selection until they pick from the list
      setSelectedMeta(null);
    }
  };

  const handleMove = () => {
    if (!selectedMeta || !accountValue.trim()) return;
    onPick(accountValue.trim(), selectedMeta.subGroup, selectedMeta.accountType);
  };

  const canMove = !!selectedMeta && accountValue.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Move to Account</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {rowCount} row{rowCount !== 1 ? 's' : ''} selected · same accounts as journal entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account picker — exact same AccountComboBox as the journal entry dialog */}
        <div className="px-6 py-5" style={{ minHeight: 280 }}>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Account *
          </label>
          <AccountComboBox
            companyId={companyId}
            value={accountValue}
            onChange={handleAccountChange}
            placeholder="Search or create account (Salaries, SBI Bank, Office Rent…)"
            className="h-10 text-sm"
          />
          <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
            Type to search. Includes accounts you have used before and all standard COA accounts.
            <br />
            If the account doesn&apos;t exist, type the name and click <strong>+ Create</strong> — same flow as the journal entry dialog.
          </p>

          {selectedMeta && accountValue && (
            <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[11px] text-green-700">
              ✓ <strong>{accountValue}</strong>
              <span className="text-green-400 mx-1.5">·</span>
              {selectedMeta.subGroup}
              <span className="text-green-400 mx-1.5">·</span>
              <span className="capitalize">{selectedMeta.accountType}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 h-10 text-sm text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canMove}
            onClick={handleMove}
            className="flex-1 h-10 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            Move {rowCount} row{rowCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
