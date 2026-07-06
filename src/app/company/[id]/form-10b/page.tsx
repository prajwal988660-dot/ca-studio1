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

export default function Form10BPage() {
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

  // Compute key figures for Form 10B
  const totalIncome = balances
    .filter(b => b.nature === 'revenue' || ['Sales', 'Indirect Income', 'Other Income', 'Donations Received', 'Subscriptions', 'Grants'].includes(b.account_group))
    .reduce((s, b) => s + b.balance, 0);

  const totalExpenditure = balances
    .filter(b => b.nature === 'expense' || ['Indirect Expenses', 'Office Expenses', 'Admin Expenses', 'Direct Expenses'].includes(b.account_group))
    .reduce((s, b) => s + b.balance, 0);

  const totalAssets = balances
    .filter(b => b.nature === 'asset')
    .reduce((s, b) => s + b.balance, 0);

  const totalLiabilities = balances
    .filter(b => b.nature === 'liability')
    .reduce((s, b) => s + b.balance, 0);

  const surplus = totalIncome - totalExpenditure;
  const applicationPercentage = totalIncome > 0 ? (totalExpenditure / totalIncome) * 100 : 0;

  const clauses = [
    { no: '1', clause: 'Name of the Trust/Institution', value: company.name },
    { no: '2', clause: 'PAN of the Trust', value: company.entity_details?.pan || 'Not provided' },
    { no: '3', clause: 'Assessment Year', value: `${fy.start.slice(0, 4)}-${parseInt(fy.end.slice(0, 4)) + 1}` },
    { no: '4', clause: 'Total Income during the year', value: formatIndianCurrency(totalIncome) },
    { no: '5', clause: 'Total Expenditure / Application', value: formatIndianCurrency(totalExpenditure) },
    { no: '6', clause: 'Application Percentage', value: `${applicationPercentage.toFixed(1)}%` },
    { no: '7', clause: 'Surplus / (Deficit)', value: formatIndianCurrency(surplus) },
    { no: '8', clause: 'Whether 85% applied', value: applicationPercentage >= 85 ? 'Yes' : 'No' },
    { no: '9', clause: 'Total Assets', value: formatIndianCurrency(totalAssets) },
    { no: '10', clause: 'Total Liabilities', value: formatIndianCurrency(totalLiabilities) },
  ];

  const exportColumns = [
    { header: 'Sl.No', key: 'no' },
    { header: 'Clause / Particulars', key: 'clause' },
    { header: 'Details', key: 'value' },
  ];

  return (
    <div>
      <PageHeader title="Form 10B" description="Audit Report u/s 12A — Trust/Institution">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Form 10B" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={clauses} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate Form 10B data.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-200 text-center">
              <h2 className="text-sm font-bold text-gray-900">FORM NO. 10B</h2>
              <p className="text-sm text-gray-600">[See rule 17B]</p>
              <p className="text-xs text-gray-400 mt-0.5">Audit Report under Section 12A(1)(b) of the Income-tax Act, 1961</p>
              <p className="text-sm text-gray-500">in the case of {company.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">for the year ended {toDate}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">Sl.No</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Clause / Particulars</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-48">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {clauses.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-400">{c.no}</td>
                      <td className="px-3 py-2 text-gray-700">{c.clause}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{c.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="flex justify-between px-8 py-6 border-t border-gray-200">
              <div className="text-center">
                <div className="border-t border-gray-400 w-40 pt-1">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Trustee / Managing Committee</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 w-40 pt-1">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Chartered Accountant</p>
                  <p className="text-xs text-gray-400">FRN / Membership No.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">Note:</p>
            <p className="mt-1">This is a draft Form 10B generated from the accounting data. The actual filing must be done by a Chartered Accountant on the Income Tax e-filing portal.</p>
          </div>
        </div>
      )}
    </div>
  );
}
