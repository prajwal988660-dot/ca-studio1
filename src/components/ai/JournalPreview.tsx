'use client';

import { Check, Pencil, X } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import type { ProposedEntry } from '@/lib/ai/responseParser';

interface JournalPreviewProps {
  entry: ProposedEntry;
  entryCode?: string;
  autoCreated?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function JournalPreview({
  entry, entryCode, autoCreated, onConfirm, onEdit, onCancel, disabled,
}: JournalPreviewProps) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-blue-600">{entryCode || 'New Entry'}</span>
        <span className="text-xs text-gray-500">{fmtDate(entry.date)}</span>
      </div>

      <div className="space-y-1 font-mono text-sm">
        {entry.lines.map((line, i) => (
          <div key={i} className="flex justify-between items-baseline">
            {line.debit > 0 ? (
              <>
                <span className="text-gray-900">{/a\/c\.?$/i.test(line.account.trim()) ? line.account : `${line.account} A/c`} <span className="text-gray-400 text-xs">Dr.</span></span>
                <span className="font-semibold text-dr tabular-nums">{formatIndianCurrency(line.debit)}</span>
              </>
            ) : (
              <>
                <span className="text-gray-600 pl-5">To {/a\/c\.?$/i.test(line.account.trim()) ? line.account : `${line.account} A/c`}</span>
                <span className="font-semibold text-cr tabular-nums">{formatIndianCurrency(line.credit)}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {entry.narration && (
        <p className="text-xs text-gray-400 italic">({entry.narration})</p>
      )}

      <div className="flex gap-2 pt-1 items-center">
        {autoCreated ? (
          <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
            <Check className="h-4 w-4" /> Created in Journal
          </span>
        ) : (
          <>
            <button onClick={onConfirm} disabled={disabled}
              className="inline-flex items-center gap-1 h-7 px-3 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              <Check className="h-3 w-3" /> Confirm
            </button>
            {onEdit && (
              <button onClick={onEdit} disabled={disabled}
                className="inline-flex items-center gap-1 h-7 px-3 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button onClick={onCancel} disabled={disabled}
              className="inline-flex items-center gap-1 h-7 px-3 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors">
              <X className="h-3 w-3" /> Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
