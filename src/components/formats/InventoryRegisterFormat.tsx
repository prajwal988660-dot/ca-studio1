'use client';

import { Link } from 'react-router-dom';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import type { InventoryRegisterRow } from '@/lib/accounting/inventoryRegisterCompute';

interface InventoryRegisterFormatProps {
  title: string;
  subtitle?: string;
  companyName: string;
  data: InventoryRegisterRow[];
  totals: {
    qty: number;
    grossAmount: number;
    discountAmount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    finalAmount: number;
  };
  emptyMessage?: string;
  /** Optional: URL builder to make the J.F. column clickable to open the journal. */
  getJfHref?: (jf: string) => string;
}

function TwoLineMoneyPercent({
  amount,
  percent,
}: {
  amount: number;
  percent: number;
}) {
  return (
    <div className="text-center leading-tight">
      <div className="font-mono">{formatIndianCurrency(amount)}</div>
      <div className="text-[11px] text-gray-500">{percent.toFixed(2)}%</div>
    </div>
  );
}

export function InventoryRegisterFormat({
  title,
  subtitle,
  companyName,
  data,
  totals,
  emptyMessage = 'No entries found.',
  getJfHref,
}: InventoryRegisterFormatProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 text-center">
        <p className="text-xs text-gray-500">{companyName}</p>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_th]:border-r [&_th]:border-gray-200 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-gray-200 [&_td:last-child]:border-r-0">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Date</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">J.F.</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Particulars</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">Rate</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">Discount</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">Taxable Amount</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">CGST</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">SGST</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">IGST</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">Final Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={`${row.jf}-${row.particulars}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-1.5 text-center font-mono whitespace-nowrap" title={row.jf}>
                    {getJfHref && row.jf ? (
                      <Link
                        to={getJfHref(row.jf)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {row.jf}
                      </Link>
                    ) : (
                      row.jf
                    )}
                  </td>
                  <td className="px-3 py-1.5">{row.particulars}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{row.qty.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatIndianCurrency(row.rate)}</td>
                  <td className="px-3 py-1.5">
                    <TwoLineMoneyPercent amount={row.discountAmount} percent={row.discountPercent} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatIndianCurrency(row.taxableAmount)}</td>
                  <td className="px-3 py-1.5">
                    <TwoLineMoneyPercent amount={row.cgstAmount} percent={row.cgstPercent} />
                  </td>
                  <td className="px-3 py-1.5">
                    <TwoLineMoneyPercent amount={row.sgstAmount} percent={row.sgstPercent} />
                  </td>
                  <td className="px-3 py-1.5">
                    <TwoLineMoneyPercent amount={row.igstAmount} percent={row.igstPercent} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">{formatIndianCurrency(row.finalAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td className="px-3 py-2" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right font-mono">{totals.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.grossAmount)}</td>
                <td className="px-3 py-2 text-center">
                  <div className="font-mono">{formatIndianCurrency(totals.discountAmount)}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.taxableAmount)}</td>
                <td className="px-3 py-2 text-center">
                  <div className="font-mono">{formatIndianCurrency(totals.cgstAmount)}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="font-mono">{formatIndianCurrency(totals.sgstAmount)}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="font-mono">{formatIndianCurrency(totals.igstAmount)}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totals.finalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

