'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface Segment {
  name: string;
  revenue: string;
  expenses: string;
  assets: string;
  liabilities: string;
}

export default function SegmentReportingPage() {
  const { company, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  const [segments, setSegments] = useState<Segment[]>([
    { name: 'Segment A', revenue: '', expenses: '', assets: '', liabilities: '' },
    { name: 'Segment B', revenue: '', expenses: '', assets: '', liabilities: '' },
  ]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const p = (v: string) => parseFloat(v) || 0;

  const updateSegment = (index: number, field: keyof Segment, value: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
  };

  const totalRevenue = segments.reduce((s, seg) => s + p(seg.revenue), 0);
  const totalExpenses = segments.reduce((s, seg) => s + p(seg.expenses), 0);
  const totalAssets = segments.reduce((s, seg) => s + p(seg.assets), 0);
  const totalLiabilities = segments.reduce((s, seg) => s + p(seg.liabilities), 0);

  const exportColumns = [
    { header: 'Segment', key: 'name' },
    { header: 'Revenue (₹)', key: 'revenue', align: 'right' as const, isMono: true },
    { header: 'Expenses (₹)', key: 'expenses', align: 'right' as const, isMono: true },
    { header: 'Result (₹)', key: 'result', align: 'right' as const, isMono: true },
    { header: 'Assets (₹)', key: 'assets', align: 'right' as const, isMono: true },
    { header: 'Liabilities (₹)', key: 'liabilities', align: 'right' as const, isMono: true },
  ];

  const exportData = segments.map(seg => ({
    name: seg.name,
    revenue: p(seg.revenue),
    expenses: p(seg.expenses),
    result: p(seg.revenue) - p(seg.expenses),
    assets: p(seg.assets),
    liabilities: p(seg.liabilities),
  }));

  return (
    <div>
      <PageHeader title="Segment Reporting (AS-17)" description="Business and geographical segment disclosure">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Segment Reporting" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Segment Reporting (AS-17)</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Revenue (₹)</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Expenses (₹)</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Result (₹)</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Assets (₹)</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Liabilities (₹)</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <input type="text" value={seg.name} onChange={e => updateSegment(i, 'name', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  {(['revenue', 'expenses'] as const).map(field => (
                    <td key={field} className="px-3 py-2">
                      <input type="number" value={seg[field]} onChange={e => updateSegment(i, field, e.target.value)} className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(p(seg.revenue) - p(seg.expenses))}</td>
                  {(['assets', 'liabilities'] as const).map(field => (
                    <td key={field} className="px-3 py-2">
                      <input type="number" value={seg[field]} onChange={e => updateSegment(i, field, e.target.value)} className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalRevenue)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalExpenses)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalRevenue - totalExpenses)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalAssets)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalLiabilities)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-200">
          <button onClick={() => setSegments([...segments, { name: `Segment ${String.fromCharCode(65 + segments.length)}`, revenue: '', expenses: '', assets: '', liabilities: '' }])} className="text-xs text-blue-600 hover:underline">+ Add segment</button>
        </div>
      </div>
    </div>
  );
}
