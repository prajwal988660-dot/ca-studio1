'use client';

import React from 'react';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

export type CashFlowAs3Row = {
  label: string;
  subAmount?: number | null;
  total?: number | null;
  isHeading?: boolean;
  isBold?: boolean;
};

interface CashFlowAs3FormatProps {
  companyName: string;
  period: string;
  methodLabel: 'Direct Method' | 'Indirect Method';
  rows: CashFlowAs3Row[];
  schedule?: {
    title: string;
    items: Array<{ label: string; currentYear: number; previousYear?: number | null }>;
  };
}

export function CashFlowAs3Format({
  companyName,
  period,
  methodLabel,
  rows,
  schedule,
}: CashFlowAs3FormatProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="text-center py-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">{companyName}</h2>
        <h3 className="text-base font-semibold text-gray-800 mt-1">Cash Flow Statement</h3>
        <p className="text-sm text-gray-500">{period}</p>
        <p className="text-xs text-gray-500 mt-1">Prepared under {methodLabel} (AS 3)</p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-left font-medium text-gray-600">Particulars</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600 w-48">Sub-Amount (₹)</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600 w-48">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 ${
                r.isHeading ? 'bg-gray-50' : ''
              } ${r.isBold ? 'font-semibold' : ''}`}
            >
              <td className="px-4 py-1.5">{r.isHeading ? <span className="font-bold text-gray-900">{r.label}</span> : r.label}</td>
              <td className="px-4 py-1.5 text-right font-mono">
                {r.subAmount != null ? formatIndianCurrency(r.subAmount) : ''}
              </td>
              <td className="px-4 py-1.5 text-right font-mono">
                {r.total != null ? formatIndianCurrency(r.total) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {schedule && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">{schedule.title}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="px-4 py-2 text-left font-medium text-gray-600">Particulars</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 w-48">Current Year (₹)</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 w-48">Previous Year (₹)</th>
              </tr>
            </thead>
            <tbody>
              {schedule.items.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-4 py-1.5">{it.label}</td>
                  <td className="px-4 py-1.5 text-right font-mono">{formatIndianCurrency(it.currentYear)}</td>
                  <td className="px-4 py-1.5 text-right font-mono">
                    {it.previousYear != null ? formatIndianCurrency(it.previousYear) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

