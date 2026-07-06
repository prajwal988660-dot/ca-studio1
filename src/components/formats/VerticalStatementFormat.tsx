'use client';

import React from 'react';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

interface StatementItem {
  label: string;
  noteNo?: string;
  currentYear: number | null;
  previousYear: number | null;
  isBold?: boolean;
  isTotal?: boolean;
  indent?: number;
  /** If provided, renders an editable number input in the Current Year cell */
  editValue?: string;
  onEdit?: (value: string) => void;
}

interface StatementSection {
  heading: string;
  indent: number;
  items: StatementItem[];
}

interface VerticalStatementProps {
  title: string;
  companyName: string;
  cin?: string;
  period: string;
  sections: StatementSection[];
  showPreviousYear?: boolean;
  signatureBlock?: boolean;
  onItemClick?: (label: string, noteNo?: string) => void;
}

export function VerticalStatementFormat({
  title, companyName, cin, period,
  sections, showPreviousYear = true, signatureBlock = false, onItemClick,
}: VerticalStatementProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-200 bg-gray-50/50">
        <h2 className="text-base font-bold text-gray-900">{companyName}</h2>
        {cin && <p className="text-[11px] text-gray-400 mt-0.5">CIN: {cin}</p>}
        <h3 className="text-sm font-semibold text-gray-700 mt-1">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{period}</p>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">Note</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-44">
              Current Year (₹)
            </th>
            {showPreviousYear && (
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-44">
                Previous Year (₹)
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, si) => (
            <React.Fragment key={si}>
              {/* Section heading row */}
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <td className="px-4 py-2" />
                <td
                  className="px-4 py-2 font-bold text-gray-800 text-xs uppercase tracking-wide"
                  style={{ paddingLeft: `${(section.indent || 0) * 16 + 16}px` }}
                >
                  {section.heading}
                </td>
                <td className="px-4 py-2" />
                {showPreviousYear && <td className="px-4 py-2" />}
              </tr>

              {/* Items */}
              {section.items.map((item, ii) => (
                <tr
                  key={ii}
                  className={`border-b border-gray-100 ${
                    item.isTotal
                      ? 'bg-gray-50 border-t border-gray-300'
                      : 'hover:bg-blue-50/10 transition-colors'
                  }`}
                >
                  <td className="px-4 py-2 text-[11px] text-gray-400">{item.noteNo || ''}</td>
                  <td
                    className={`px-4 py-2 text-gray-700 ${item.isBold || item.isTotal ? 'font-semibold text-gray-900' : ''}`}
                    style={{ paddingLeft: `${((item.indent || 0) + (section.indent || 0)) * 16 + 16}px` }}
                  >
                    {onItemClick && !item.isTotal ? (
                      <button
                        onClick={() => onItemClick(item.label, item.noteNo)}
                        className="text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                      >
                        {item.label}
                      </button>
                    ) : (
                      item.label
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-[13px] tabular-nums ${item.isTotal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                    {item.onEdit ? (
                      <input
                        type="number"
                        min="0"
                        value={item.editValue ?? ''}
                        onChange={e => item.onEdit!(e.target.value)}
                        placeholder={item.currentYear !== null ? String(item.currentYear) : '0'}
                        className="w-full text-right bg-amber-50 border border-amber-200 rounded px-2 py-0.5 font-mono text-[13px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    ) : (
                      item.currentYear !== null ? formatIndianCurrency(item.currentYear) : ''
                    )}
                  </td>
                  {showPreviousYear && (
                    <td className="px-4 py-2 text-right font-mono text-[13px] tabular-nums text-gray-400">
                      {item.previousYear !== null ? formatIndianCurrency(item.previousYear) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Signature block */}
      {signatureBlock && (
        <div className="flex justify-between px-10 py-8 border-t border-gray-200 mt-2">
          {['Director', 'Director', 'Chartered Accountant'].map(role => (
            <div key={role} className="text-center">
              <div className="w-36 border-t border-gray-400 pt-1.5 mt-12">
                <p className="text-xs text-gray-500">{role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
