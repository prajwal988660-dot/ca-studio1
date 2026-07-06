'use client';

import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import type { AgeingRow } from '@/lib/accounting/ageingCompute';

interface AgeingFormatProps {
  title: string;
  companyName: string;
  asAtDate: string;
  data: AgeingRow[];
  emptyMessage?: string;
}

export function AgeingFormat({
  title,
  companyName,
  asAtDate,
  data,
  emptyMessage = 'No outstanding balances found.',
}: AgeingFormatProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + row.ageing.current,
      days_0_30: acc.days_0_30 + row.ageing.days_0_30,
      days_31_60: acc.days_31_60 + row.ageing.days_31_60,
      days_61_90: acc.days_61_90 + row.ageing.days_61_90,
      days_91_180: acc.days_91_180 + row.ageing.days_91_180,
      days_over_180: acc.days_over_180 + row.ageing.days_over_180,
      total: acc.total + row.ageing.total,
    }),
    { current: 0, days_0_30: 0, days_31_60: 0, days_61_90: 0, days_91_180: 0, days_over_180: 0, total: 0 }
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-xs text-gray-500">{companyName}</p>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">As at {asAtDate}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">0-30 Days</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">31-60 Days</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">61-90 Days</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">91-180 Days</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">180+ Days</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 font-medium">{row.accountName}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.current > 0 ? formatIndianCurrency(row.ageing.current) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.days_0_30 > 0 ? formatIndianCurrency(row.ageing.days_0_30) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.days_31_60 > 0 ? formatIndianCurrency(row.ageing.days_31_60) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.days_61_90 > 0 ? formatIndianCurrency(row.ageing.days_61_90) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.days_91_180 > 0 ? formatIndianCurrency(row.ageing.days_91_180) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.ageing.days_over_180 > 0 ? formatIndianCurrency(row.ageing.days_over_180) : ''}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{formatIndianCurrency(row.ageing.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.current)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.days_0_30)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.days_31_60)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.days_61_90)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.days_91_180)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.days_over_180)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
