'use client';

import type { AgeingRow } from '@/lib/accounting/ageingCompute';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  title: string;
  rows: AgeingRow[];
  asAt: string;
  nameHeader?: string;
  emptyText?: string;
}

/** Read-only Schedule III (2021) ageing table — < 6m / 6m-1y / 1-2y / 2-3y / > 3y. */
export function ScheduleIIIAgeingCard({ title, rows, asAt, nameHeader = 'Party Name', emptyText = 'No outstanding balances.' }: Props) {
  const sum = (key: string) =>
    rows.reduce((s, r) => s + ((r.scheduleIIIAgeing as any)?.[key] || 0), 0);
  const total = rows.reduce((s, r) => s + (r.scheduleIIIAgeing?.total || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <span className="text-[11px] text-gray-400">As at {asAt}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">{nameHeader}</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">&lt; 6 Months</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">6m - 1 Year</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">1 - 2 Years</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">2 - 3 Years</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">&gt; 3 Years</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">{emptyText}</td>
              </tr>
            ) : (
              <>
                {rows.map((row) => {
                  const s3 = row.scheduleIIIAgeing;
                  if (!s3) return null;
                  return (
                    <tr key={row.accountName} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
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
                <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-bold">
                  <td className="px-4 py-2.5 text-[11px] text-gray-700">Total</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(sum('lessThan6Months'))}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(sum('sixMonthsTo1Year'))}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(sum('oneYearTo2Years'))}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(sum('twoYearsTo3Years'))}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(sum('moreThan3Years'))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(total)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
