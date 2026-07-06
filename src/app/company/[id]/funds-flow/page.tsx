'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { TAccountFormat } from '@/components/formats/TAccountFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeFundsFlow } from '@/lib/accounting/fundsFlowCompute';
import type { EntityType } from '@/types/company';

export default function FundsFlowPage() {
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

  const tradingAccount = useMemo(() => computeTradingAccount(entries), [entries]);
  const profitLoss = useMemo(() => computeProfitLoss(entries, tradingAccount.grossProfit), [entries, tradingAccount.grossProfit]);
  // Note: Funds flow requires previous year entries for comparison — using empty array as fallback
  const fundsFlow = useMemo(() => computeFundsFlow(entries, [], profitLoss.netProfit), [entries, profitLoss.netProfit]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const balancedTotal = Math.max(fundsFlow.totalSources, fundsFlow.totalApplications);

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...fundsFlow.sources.map(i => ({ side: 'Sources', label: i.label, amount: i.amount })),
    ...fundsFlow.applications.map(i => ({ side: 'Applications', label: i.label, amount: i.amount })),
  ];

  return (
    <div>
      <PageHeader title="Funds Flow Statement" description="Sources and Applications of Funds">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Funds Flow Statement" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {/* Net Working Capital Change indicator */}
      {!loading && entries.length > 0 && (
        <div className={
          fundsFlow.netWorkingCapitalChange >= 0
             ? "tally-ok" : "tally-err"}>
          Net Change in Working Capital: {formatIndianCurrency(Math.abs(fundsFlow.netWorkingCapitalChange))}
          {fundsFlow.netWorkingCapitalChange >= 0 ? ' (Increase)' : ' (Decrease)'}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate a Funds Flow Statement.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sources & Applications — T-format */}
          <TAccountFormat
            title="Statement of Sources & Applications of Funds"
            subtitle={`For the period ${fromDate} to ${toDate}`}
            companyName={company.name}
            leftLabel="Sources of Funds"
            rightLabel="Applications of Funds"
            leftColumns={[
              { header: 'Particulars', key: 'label' },
              { header: 'Amount (₹)', key: 'amount', align: 'right' },
            ]}
            rightColumns={[
              { header: 'Particulars', key: 'label' },
              { header: 'Amount (₹)', key: 'amount', align: 'right' },
            ]}
            leftData={fundsFlow.sources}
            rightData={fundsFlow.applications}
            leftTotal={balancedTotal}
            rightTotal={balancedTotal}
          />

          {/* Working Capital Changes */}
          {fundsFlow.workingCapitalChanges.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900">Statement of Changes in Working Capital</h3>
                <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current Year (₹)</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Previous Year (₹)</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Increase (₹)</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Decrease (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundsFlow.workingCapitalChanges.map((wc, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2">{wc.item}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(wc.currentYear)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(wc.previousYear)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-green-700">{wc.increase > 0 ? formatIndianCurrency(wc.increase) : ''}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-red-700">{wc.decrease > 0 ? formatIndianCurrency(wc.decrease) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                      <td className="px-3 py-2" colSpan={3}>Net Change in Working Capital</td>
                      <td className="px-3 py-2 text-right font-mono" colSpan={2}>
                        {formatIndianCurrency(Math.abs(fundsFlow.netWorkingCapitalChange))}
                        {fundsFlow.netWorkingCapitalChange >= 0 ? ' (Increase)' : ' (Decrease)'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
