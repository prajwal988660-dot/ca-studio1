'use client';

import { Link } from 'react-router-dom';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

interface RegisterColumn {
  header: string;
  key: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  isMono?: boolean;
}

interface RegisterFormatProps {
  title: string;
  subtitle?: string;
  companyName: string;
  columns: RegisterColumn[];
  data: Record<string, any>[];
  totals?: Record<string, number>;
  emptyMessage?: string;
  linkColumnKey?: string;
  getRowHref?: (row: Record<string, any>) => string;
  linkColumns?: { key: string; getHref: (row: Record<string, any>) => string }[];
}

export function RegisterFormat({
  title, subtitle, companyName, columns, data,
  totals, emptyMessage = 'No data available.',
  linkColumnKey, getRowHref, linkColumns,
}: RegisterFormatProps) {

  const renderCell = (value: any, col: RegisterColumn, row: Record<string, any>) => {
    const formatted =
      typeof value === 'number'
        ? formatIndianCurrency(value)
        : (value ?? '');

    const isLinked =
      (linkColumns?.find(lc => lc.key === col.key)) ||
      (linkColumnKey && col.key === linkColumnKey && getRowHref);

    if (isLinked) {
      const href = linkColumns?.find(lc => lc.key === col.key)?.getHref(row)
        ?? (getRowHref ? getRowHref(row) : '#');
      return (
        <Link to={href} className="text-blue-600 hover:underline font-medium">
          {formatted}
        </Link>
      );
    }
    return formatted;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">{companyName}</p>
        <h3 className="text-base font-bold text-gray-900 mt-0.5">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-100 last:border-r-0 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.width || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/20 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-gray-700 border-r border-gray-100 last:border-r-0 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                      } ${col.isMono || typeof row[col.key] === 'number' ? 'font-mono text-[13px]' : ''}`}
                    >
                      {renderCell(row[col.key], col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 font-bold text-gray-900 border-r border-gray-100 last:border-r-0 ${
                        col.align === 'right' ? 'text-right' : ''
                      } ${totals[col.key] !== undefined ? 'font-mono' : ''}`}
                    >
                      {i === 0
                        ? 'Total'
                        : totals[col.key] !== undefined
                          ? formatIndianCurrency(totals[col.key])
                          : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
