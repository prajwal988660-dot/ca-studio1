'use client';

import { useMemo, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { computeCreditorAgeing } from '@/lib/accounting/ageingCompute';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Extract voucher numbers from journal entries for a specific party. */
function getPartyInvoices(
  entries: ReturnType<typeof useJournalEntries>['entries'],
  partyName: string,
): { voucherNo: string; date: string; amount: number; type: string }[] {
  const invoices: { voucherNo: string; date: string; amount: number; type: string }[] = [];
  for (const e of entries) {
    for (const line of e.lines) {
      if (line.account_name !== partyName) continue;
      if (!['Trade Payables', 'Sundry Creditors'].includes(line.account_group)) continue;
      const net = (line.credit || 0) - (line.debit || 0);
      if (net !== 0) {
        invoices.push({
          voucherNo: e.voucher_number || e.entry_code,
          date: e.entry_date,
          amount: net,
          type: e.voucher_type,
        });
      }
    }
  }
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
}

export default function CreditorsPage() {
  const { company, companyId, loading } = useCompany();
  const { entries, loading: entriesLoading } = useJournalEntries({ companyId: companyId || '', enabled: !!companyId });
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const ageingRows = useMemo(() => {
    if (!entries.length) return [];
    return computeCreditorAgeing(entries, today, 'schedule_iii')
      .sort((a, b) => b.ageing.total - a.ageing.total);
  }, [entries, today]);

  const totalOutstanding = ageingRows.reduce((s, r) => s + r.ageing.total, 0);
  const partyCount = ageingRows.length;
  const over6m = ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing ? r.scheduleIIIAgeing.total - r.scheduleIIIAgeing.lessThan6Months : r.ageing.days_over_180), 0);

  const selectedRow = ageingRows.find((r) => r.accountName === selectedParty) || null;
  const selectedInvoices = useMemo(() => {
    if (!selectedParty) return [];
    return getPartyInvoices(entries, selectedParty);
  }, [entries, selectedParty]);

  if (loading || entriesLoading || !company || !companyId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Creditors" description="Trade payables — per-party outstanding and ageing" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Payable</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900">
            <span className="text-sm text-gray-400">&#8377;</span>{inr(totalOutstanding)}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">{partyCount} part{partyCount !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Over 6 Months</p>
          <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${over6m > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            <span className="text-sm text-gray-400">&#8377;</span>{inr(over6m)}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">Long outstanding</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suppliers</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900">{partyCount}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">With outstanding balance</p>
        </div>
      </div>

      {/* Ageing Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h3 className="text-sm font-bold text-gray-800">Creditors Ageing (Schedule III)</h3>
          <span className="text-[11px] text-gray-400">As at {today}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Party Name</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">&lt; 6 Months</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">6m - 1 Year</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">1 - 2 Years</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">2 - 3 Years</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">&gt; 3 Years</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {ageingRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                    No outstanding creditors. All payables are settled.
                  </td>
                </tr>
              ) : (
                <>
                  {ageingRows.map((row) => {
                    const s3 = row.scheduleIIIAgeing!;
                    return (
                      <tr
                        key={row.accountName}
                        onClick={() => setSelectedParty(row.accountName)}
                        className={`cursor-pointer border-t border-gray-50 transition-colors ${selectedParty === row.accountName ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}
                      >
                        <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-800 max-w-[200px] truncate">{row.accountName}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700">{s3.lessThan6Months ? inr(s3.lessThan6Months) : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700">{s3.sixMonthsTo1Year ? inr(s3.sixMonthsTo1Year) : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700">{s3.oneYearTo2Years ? inr(s3.oneYearTo2Years) : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700">{s3.twoYearsTo3Years ? inr(s3.twoYearsTo3Years) : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700">{s3.moreThan3Years ? inr(s3.moreThan3Years) : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(s3.total)}</td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-bold">
                    <td className="px-4 py-2.5 text-[11px] text-gray-700">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">
                      {inr(ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing?.lessThan6Months || 0), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">
                      {inr(ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing?.sixMonthsTo1Year || 0), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">
                      {inr(ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing?.oneYearTo2Years || 0), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">
                      {inr(ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing?.twoYearsTo3Years || 0), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">
                      {inr(ageingRows.reduce((s, r) => s + (r.scheduleIIIAgeing?.moreThan3Years || 0), 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(totalOutstanding)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Out Drawer — party detail */}
      {selectedRow && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedParty(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Creditor Details</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900 max-w-[280px] truncate">{selectedRow.accountName}</p>
              </div>
              <button
                onClick={() => setSelectedParty(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Outstanding summary */}
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700">Total Payable</span>
                  <span className="font-mono text-sm font-bold text-gray-900">{inr(selectedRow.ageing.total)}</span>
                </div>
              </div>

              {/* Ageing breakdown */}
              {selectedRow.scheduleIIIAgeing && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Ageing Breakdown</p>
                  <div className="space-y-1.5">
                    {[
                      { label: '< 6 Months', value: selectedRow.scheduleIIIAgeing.lessThan6Months },
                      { label: '6m - 1 Year', value: selectedRow.scheduleIIIAgeing.sixMonthsTo1Year },
                      { label: '1 - 2 Years', value: selectedRow.scheduleIIIAgeing.oneYearTo2Years },
                      { label: '2 - 3 Years', value: selectedRow.scheduleIIIAgeing.twoYearsTo3Years },
                      { label: '> 3 Years', value: selectedRow.scheduleIIIAgeing.moreThan3Years },
                    ].filter((b) => b.value > 0).map((b) => (
                      <div key={b.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{b.label}</span>
                        <span className="font-mono text-[11px] font-semibold text-gray-700">{inr(b.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Transactions ({selectedInvoices.length})
                </p>
                {selectedInvoices.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No transactions found</p>
                ) : (
                  <div className="space-y-1">
                    {selectedInvoices.map((inv, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div>
                          <p className="font-mono text-[11px] font-semibold text-gray-800">{inv.voucherNo}</p>
                          <p className="text-[10px] text-gray-400">{inv.date} &middot; {inv.type}</p>
                        </div>
                        <span className={`font-mono text-[11px] font-bold ${inv.amount > 0 ? 'text-gray-900' : 'text-emerald-600'}`}>
                          {inv.amount > 0 ? '' : '-'}{inr(Math.abs(inv.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
