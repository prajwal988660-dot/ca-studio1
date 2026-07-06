import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LEDGER_GROUPS } from '@/lib/coa';

interface Props {
  onConfirm: (name: string, group: string, accountType: string) => void;
  onClose: () => void;
}

export function CreateLedgerModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');        // scheduleIII value — stored in BulkLedgerAccount.group
  const [groupLabel, setGroupLabel] = useState(''); // Tally label — shown in dropdown
  const [accountType, setAccountType] = useState('');
  const [error, setError] = useState('');

  const uniqueGroups = LEDGER_GROUPS.map((g) => ({
    label: g.label,
    scheduleIII: g.scheduleIII,
    nature: g.nature,
  }));

  const handleGroupChange = (label: string) => {
    setGroupLabel(label);
    const found = LEDGER_GROUPS.find((g) => g.label === label);
    if (found) { setGroup(found.scheduleIII); setAccountType(found.nature); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Ledger name is required'); return; }
    if (!group) { setError('Please select a group'); return; }
    if (!accountType) { setError('Please select an account type'); return; }
    onConfirm(name.trim(), group, accountType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Create New Ledger</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ledger Name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Traders, Office Rent"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Under (Group) *
            </label>
            <select
              value={groupLabel}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select group...</option>
              {uniqueGroups.map((g) => (
                <option key={g.label} value={g.label}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Account Type *
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select type...</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="capital">Capital</option>
              <option value="revenue">Revenue (Income)</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
