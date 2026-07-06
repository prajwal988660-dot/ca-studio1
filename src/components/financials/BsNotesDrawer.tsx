'use client';

/**
 * BsNotesDrawer — Balance Sheet drill-down slide-over.
 *
 * Opened when the user clicks a particular in the Schedule III Balance Sheet.
 * Shows every account whose scheduleIII group feeds that line, with its balance.
 * Each account name navigates to /ledger?account=… (running balance view).
 */

import { useMemo } from 'react';
import { X, MoveRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

interface Props {
  companyId: string;
  /** The label shown in the BS (e.g. "Trade Receivables") */
  label: string;
  /** scheduleIII group strings whose accounts belong to this line */
  groups: string[];
  /** Journal entries for the current year filter */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entries: any[];
  onClose: () => void;
  /** Header section label — defaults to "Balance Sheet" */
  sectionLabel?: string;
}

export function BsNotesDrawer({ companyId, label, groups, entries, onClose, sectionLabel = 'Balance Sheet' }: Props) {
  const navigate = useNavigate();

  const accounts = useMemo(() => {
    const all = computeAllBalances(entries);
    return all
      .filter(b => groups.includes(b.account_group) && b.balance > 0)
      .sort((a, b) => a.account_name.localeCompare(b.account_name));
  }, [entries, groups]);

  /** Net signed total matching how computeScheduleIIIBalanceSheet sums this line */
  const total = useMemo(() =>
    accounts.reduce((sum, b) => {
      // Assets: Dr = positive contribution; Cr = negative (contra-asset)
      if (b.nature === 'asset') return sum + (b.balance_type === 'Dr' ? b.balance : -b.balance);
      // Liabilities / capital: Cr = positive
      return sum + (b.balance_type === 'Cr' ? b.balance : -b.balance);
    }, 0)
  , [accounts]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div className="relative bg-white w-full max-w-[420px] h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sectionLabel} · Notes</p>
            <h3 className="font-bold text-gray-900 text-sm mt-0.5">{label}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Click an account to open its ledger</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account table */}
        <div className="flex-1 overflow-y-auto">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 px-6 text-center">
              <p className="text-sm">No accounts posted under this head yet.</p>
              <p className="text-[11px] mt-1 text-gray-300">
                Groups: {groups.join(' · ')}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-44">
                    Balance (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(b => (
                  <tr
                    key={b.account_name}
                    className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(
                            `/company/${companyId}/ledger?account=${encodeURIComponent(b.account_name)}&view=running`
                          );
                        }}
                        className="text-blue-600 hover:text-blue-800 text-left font-medium flex items-center gap-1.5 group-hover:underline"
                      >
                        {b.account_name}
                        <MoveRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </button>
                      <p className="text-[10px] text-gray-400 mt-0.5">{b.account_group}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
                      <span className={b.balance_type === 'Dr' ? 'text-blue-700' : 'text-emerald-700'}>
                        {formatIndianCurrency(b.balance)}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">{b.balance_type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">
                    Total — {label}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[13px] tabular-nums text-gray-900">
                    {total < 0
                      ? `(${formatIndianCurrency(Math.abs(total))})`
                      : formatIndianCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
