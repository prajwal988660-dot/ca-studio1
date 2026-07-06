 'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { computeRatioAnalysis } from '@/lib/accounting/ratioAnalysisCompute';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

export default function RatioAnalysisPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const ratioData = useMemo(() => computeRatioAnalysis(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const exportColumns = [
    { header: 'Category', key: 'category' },
    { header: 'Ratio', key: 'label' },
    { header: 'Formula', key: 'formula' },
    { header: 'Value', key: 'value', align: 'right' as const, isMono: true },
  ];

  const exportData = ratioData.ratios.map(r => ({
    category: r.category,
    label: r.label,
    formula: r.formula,
    value: r.value ?? '',
  }));

  const categories: { key: 'liquidity' | 'solvency' | 'profitability' | 'efficiency'; title: string; description: string }[] = [
    { key: 'liquidity', title: 'Liquidity Ratios', description: 'Short-term solvency and working capital strength.' },
    { key: 'solvency', title: 'Solvency Ratios', description: 'Long-term debt capacity and capital structure.' },
    { key: 'profitability', title: 'Profitability Ratios', description: 'Margins and returns generated from operations.' },
    { key: 'efficiency', title: 'Efficiency Ratios', description: 'Turnover and utilisation of assets and working capital.' },
  ];

  const formatValue = (label: string, value: number | null) => {
    if (value === null || Number.isNaN(value)) return '—';
    if (label.endsWith('(%)')) {
      return `${value.toFixed(2)} %`;
    }
    return value.toFixed(2);
  };

  return (
    <div>
      <PageHeader title="Ratio Analysis" description="Key financial ratios auto-computed from journal-only books">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
          />
          <ExportButtons
            title="Ratio Analysis"
            companyName={company.name}
            entityType={entityLabel}
            dateRange={`${fromDate} to ${toDate}`}
            columns={exportColumns}
            data={exportData}
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <SummaryCard
              title="Current Ratio"
              value={formatValue('Current Ratio', ratioData.ratios.find(r => r.label === 'Current Ratio')?.value ?? null)}
              subtitle="Ideal ~1.33 to 2.00"
            />
            <SummaryCard
              title="Debt-Equity Ratio"
              value={formatValue('Debt-Equity Ratio', ratioData.ratios.find(r => r.label === 'Debt-Equity Ratio')?.value ?? null)}
              subtitle="Long-term leverage"
            />
            <SummaryCard
              title="Net Profit Ratio (%)"
              value={formatValue('Net Profit Ratio (%)', ratioData.ratios.find(r => r.label === 'Net Profit Ratio (%)')?.value ?? null)}
              subtitle="Net margin on revenue"
            />
            <SummaryCard
              title="Return on Equity (%)"
              value={formatValue('Return on Equity (%)', ratioData.ratios.find(r => r.label === 'Return on Equity (%)')?.value ?? null)}
              subtitle="Return to shareholders"
            />
          </div>

          {/* Detail tables by category */}
          {categories.map(cat => {
            const rows = ratioData.ratios.filter(r => r.category === cat.key);
            if (rows.length === 0) return null;
            return (
              <div key={cat.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-800">{cat.title}</h3>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{cat.description}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ratio</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Formula</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.label} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-800">{r.label}</td>
                          <td className="px-3 py-1.5 text-xs text-gray-500">{r.formula}</td>
                          <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-sm">
                            {formatValue(r.label, r.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Key components footer for liquidity/solvency */ }
                {cat.key === 'liquidity' && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                    <span>Working Capital: </span>
                    <span className="font-mono font-semibold">
                      {formatIndianCurrency(ratioData.components.currentAssets - ratioData.components.currentLiabilities)}
                    </span>
                    <span className="ml-2 text-gray-400">(Current Assets − Current Liabilities)</span>
                  </div>
                )}
                {cat.key === 'solvency' && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                    <span>Total Debt: </span>
                    <span className="font-mono font-semibold">
                      {formatIndianCurrency(ratioData.components.longTermDebt + ratioData.components.currentLiabilities)}
                    </span>
                    <span className="ml-2 text-gray-400">(Long-term Borrowings + Current Liabilities)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{subtitle}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 text-xl font-bold font-mono text-blue-700">{value}</p>
    </div>
  );
}

