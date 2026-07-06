'use client';

import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

interface NoteItem {
  label: string;
  currentYear: number;
  previousYear?: number;
  indent?: number;
  isBold?: boolean;
}

interface NoteFormatProps {
  noteNumber: string;
  title: string;
  items: NoteItem[];
  total: number;
  previousYearTotal?: number;
  showPreviousYear?: boolean;
}

export function NoteFormat({
  noteNumber,
  title,
  items,
  total,
  previousYearTotal,
  showPreviousYear = true,
}: NoteFormatProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">
          Note {noteNumber}: {title}
        </h4>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-2 text-left font-medium text-gray-600">Particulars</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600 w-36">Current Year (₹)</th>
            {showPreviousYear && (
              <th className="px-4 py-2 text-right font-medium text-gray-600 w-36">Previous Year (₹)</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td
                className={`px-4 py-1.5 ${item.isBold ? 'font-semibold' : ''}`}
                style={{ paddingLeft: `${(item.indent || 0) * 16 + 16}px` }}
              >
                {item.label}
              </td>
              <td className="px-4 py-1.5 text-right font-mono">
                {formatIndianCurrency(item.currentYear)}
              </td>
              {showPreviousYear && (
                <td className="px-4 py-1.5 text-right font-mono">
                  {item.previousYear !== undefined ? formatIndianCurrency(item.previousYear) : ''}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
            <td className="px-4 py-2">Total</td>
            <td className="px-4 py-2 text-right font-mono">{formatIndianCurrency(total)}</td>
            {showPreviousYear && (
              <td className="px-4 py-2 text-right font-mono">
                {previousYearTotal !== undefined ? formatIndianCurrency(previousYearTotal) : ''}
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
