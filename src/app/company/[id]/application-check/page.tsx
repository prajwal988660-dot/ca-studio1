'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function ApplicationCheckPage() {
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

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Compute total income (revenue: Cr - Dr so refunds reduce income)
  const totalIncome = balances
    .filter(b => b.nature === 'revenue' || ['Sales', 'Indirect Income', 'Other Income', 'Non-Operating Income', 'Donations Received', 'Subscriptions', 'Grants'].includes(b.account_group))
    .reduce((s, b) => s + (b.total_credit - b.total_debit), 0);

  // Compute total expenditure (expense: Dr - Cr)
  const totalExpenditure = balances
    .filter(b => b.nature === 'expense' || ['Indirect Expenses', 'Office Expenses', 'Admin Expenses', 'Direct Expenses', 'Selling Expenses', 'Finance Costs', 'Depreciation', 'Purchases'].includes(b.account_group))
    .reduce((s, b) => s + (b.total_debit - b.total_credit), 0);

  // 85% application threshold
  const requiredApplication = totalIncome * 0.85;
  const applicationPercentage = totalIncome > 0 ? (totalExpenditure / totalIncome) * 100 : 0;
  const isCompliant = totalExpenditure >= requiredApplication;

  // Accumulation (15% allowed)
  const accumulationAllowed = totalIncome * 0.15;
  const actualAccumulation = totalIncome - totalExpenditure;

  const exportColumns = [
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
    { header: 'Percentage', key: 'percentage', align: 'right' as const },
  ];

  const exportData = [
    { label: 'Total Income', amount: totalIncome, percentage: '100%' },
    { label: 'Total Application/Expenditure', amount: totalExpenditure, percentage: `${applicationPercentage.toFixed(1)}%` },
    { label: 'Required Application (85%)', amount: requiredApplication, percentage: '85%' },
    { label: 'Shortfall / Excess', amount: totalExpenditure - requiredApplication, percentage: '' },
    { label: 'Accumulation Allowed (15%)', amount: accumulationAllowed, percentage: '15%' },
    { label: 'Actual Accumulation', amount: actualAccumulation, percentage: `${totalIncome > 0 ? ((actualAccumulation / totalIncome) * 100).toFixed(1) : 0}%` },
  ];

  return (
    <div>
      <PageHeader title="85% Application Check" description="Section 11 — Application of Income verification">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="85% Application Check" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to check 85% application compliance.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Compliance Status */}
          <div className={`px-6 py-4 rounded-xl border ${
            isCompliant
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`text-lg font-bold ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
              {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
            </h3>
            <p className={`text-sm ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
              {isCompliant
                ? `Application of ${applicationPercentage.toFixed(1)}% exceeds the required 85% threshold.`
                : `Application of ${applicationPercentage.toFixed(1)}% is below the required 85% threshold. Shortfall: ${formatIndianCurrency(requiredApplication - totalExpenditure)}`}
            </p>
          </div>

          {/* Computation Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Section 11 — 85% Application Check</h3>
            <p className="text-xs text-gray-400 mt-0.5">For the year ended {toDate}</p>
          </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700 font-medium">Total Income</td>
                    <td className="py-2.5 text-right font-mono font-semibold">{formatIndianCurrency(totalIncome)}</td>
                    <td className="py-2.5 text-right text-gray-500 w-20">100%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700">Required Application (85%)</td>
                    <td className="py-2.5 text-right font-mono">{formatIndianCurrency(requiredApplication)}</td>
                    <td className="py-2.5 text-right text-gray-500 w-20">85%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700 font-medium">Actual Application / Expenditure</td>
                    <td className="py-2.5 text-right font-mono font-semibold">{formatIndianCurrency(totalExpenditure)}</td>
                    <td className="py-2.5 text-right text-gray-500 w-20">{applicationPercentage.toFixed(1)}%</td>
                  </tr>
                  <tr className={`border-b border-gray-200 ${isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
                    <td className="py-2.5 font-bold">{isCompliant ? 'Excess Application' : 'Shortfall'}</td>
                    <td className={`py-2.5 text-right font-mono font-bold ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                      {formatIndianCurrency(Math.abs(totalExpenditure - requiredApplication))}
                    </td>
                    <td className="py-2.5" />
                  </tr>
                  <tr className="border-b border-gray-100 pt-4">
                    <td className="py-2.5 text-gray-700">Accumulation Allowed (15%)</td>
                    <td className="py-2.5 text-right font-mono">{formatIndianCurrency(accumulationAllowed)}</td>
                    <td className="py-2.5 text-right text-gray-500 w-20">15%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700">Actual Accumulation</td>
                    <td className="py-2.5 text-right font-mono">{formatIndianCurrency(actualAccumulation)}</td>
                    <td className="py-2.5 text-right text-gray-500 w-20">{totalIncome > 0 ? ((actualAccumulation / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">Section 11(1) — Application of Income</p>
            <p className="mt-1">A trust/institution must apply at least 85% of its income towards its objects during the previous year. The remaining 15% may be accumulated. Failure to apply may result in loss of exemption under Section 11.</p>
          </div>
        </div>
      )}
    </div>
  );
}
