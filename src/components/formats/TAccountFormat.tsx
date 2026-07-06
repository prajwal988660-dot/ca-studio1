'use client';

import { Link } from 'react-router-dom';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

interface TAccountCol {
  header: string;
  key: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface TAccountProps {
  title: string;
  subtitle?: string;
  leftLabel: string;
  rightLabel: string;
  leftColumns: TAccountCol[];
  rightColumns: TAccountCol[];
  leftData: Record<string, any>[];
  rightData: Record<string, any>[];
  leftTotal: number;
  rightTotal: number;
  companyName: string;
  showFooterTotals?: boolean;
  hideSideLabels?: boolean;
  linkColumnKey?: string;
  getRowHref?: (row: Record<string, any>) => string;
}

export function TAccountFormat({
  title, subtitle, leftLabel, rightLabel,
  leftColumns, rightColumns,
  leftData, rightData,
  leftTotal, rightTotal,
  companyName,
  showFooterTotals = true,
  hideSideLabels = false,
  linkColumnKey,
  getRowHref,
}: TAccountProps) {

  const maxRows = Math.max(leftData.length, rightData.length);

  const renderCell = (value: any, col: TAccountCol, row: Record<string, any>) => {
    const isNum = typeof value === 'number';
    const content = isNum
      ? <span className="font-mono text-[13px] tabular-nums">{formatIndianCurrency(value)}</span>
      : <span className="truncate">{value ?? ''}</span>;

    if (linkColumnKey && col.key === linkColumnKey && getRowHref && value) {
      return <Link to={getRowHref(row)} className="text-blue-600 hover:underline font-medium">{content}</Link>;
    }
    return content;
  };

  const SideTable = ({
    columns, data, total, label,
  }: { columns: TAccountCol[]; data: Record<string, any>[]; total: number; label: string }) => (
    <div className="flex flex-col">
      {/* Side label */}
      {!hideSideLabels && (
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
      )}
      {/* Column headers */}
      <div className="border-b border-gray-200">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.width || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      {/* Rows */}
      <div className="flex-1">
        <table className="w-full table-fixed">
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/20 transition-colors ${row?._rowClass || ''}`}>
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 text-sm text-gray-700 overflow-hidden ${
                      col.align === 'right' ? 'text-right' : ''
                    } ${col.width || ''}`}
                  >
                    {renderCell(row[col.key], col, row)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Padding rows to equalise heights */}
            {Array.from({ length: maxRows - data.length }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-b border-gray-100">
                {columns.map(col => (
                  <td key={col.key} className={`px-3 py-2 ${col.width || ''}`}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
          {showFooterTotals && (
            <tfoot>
              <tr className="border-t-2 border-gray-400 bg-gray-50">
                <td className="px-3 py-2.5 font-bold text-gray-900 text-sm" colSpan={columns.length - 1}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 text-[13px]">
                  {formatIndianCurrency(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Title */}
      <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">{companyName}</p>
        <h3 className="text-base font-bold text-gray-900 mt-0.5">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* T-split */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <SideTable columns={leftColumns} data={leftData} total={leftTotal} label={leftLabel} />
        <SideTable columns={rightColumns} data={rightData} total={rightTotal} label={rightLabel} />
      </div>
    </div>
  );
}
