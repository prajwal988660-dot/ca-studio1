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
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeBalanceSheet } from '@/lib/accounting/balanceSheetCompute';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import type { EntityType } from '@/types/company';

export default function IncompleteRecordsPage() {
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
  const tradingAccount = useMemo(() => computeTradingAccount(entries), [entries]);
  const profitLoss = useMemo(() => computeProfitLoss(entries, tradingAccount.grossProfit), [entries, tradingAccount.grossProfit]);
  const bs = useMemo(() => computeBalanceSheet(entries, profitLoss.netProfit, 'traditional'), [entries, profitLoss.netProfit]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Statement of Affairs: Liabilities | Assets
  // Capital = Assets - Liabilities (balancing figure)
  const totalAssets = bs.totalAssets;
  const totalLiabilities = bs.totalLiabilities;

  // Find drawings and additional capital from balances
  const drawingsAccount = balances.find(b => b.account_name.toLowerCase().includes('drawing'));
  const drawings = drawingsAccount ? drawingsAccount.balance : 0;

  // Capital is the balancing figure
  const closingCapital = totalAssets - (totalLiabilities - bs.liabilities.filter(l => l.group === 'Capital Account' || l.group === 'Reserves & Surplus').reduce((s, l) => s + l.amount, 0));

  // For Statement of Affairs, we show liabilities (excluding capital) and assets
  const liabilitiesExclCapital = bs.liabilities.filter(l => l.group !== 'Capital Account' && l.group !== 'Reserves & Surplus');
  const liabilitiesForDisplay = [
    ...liabilitiesExclCapital,
    { name: 'Capital (Balancing Figure)', amount: closingCapital, group: 'Capital' },
  ];

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...liabilitiesForDisplay.map(i => ({ side: 'Liabilities', name: i.name, amount: i.amount })),
    ...bs.assets.map(i => ({ side: 'Assets', name: i.name, amount: i.amount })),
  ];

  const balancedTotal = Math.max(
    liabilitiesForDisplay.reduce((s, i) => s + i.amount, 0),
    totalAssets
  );

  return (
    <div>
      <PageHeader title="Incomplete Records" description="Statement of Affairs & Profit estimation">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Statement of Affairs" companyName={company.name} entityType={entityLabel} dateRange={`As at ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate a Statement of Affairs.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profit Summary */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900">Profit Estimation (from Statement of Affairs)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Capital = Total Assets − Total Liabilities (balancing figure)</p>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Closing Capital (as per Statement of Affairs)</td>
                    <td className="py-2 text-right font-mono font-semibold">{formatIndianCurrency(closingCapital)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Add: Drawings during the year</td>
                    <td className="py-2 text-right font-mono">{formatIndianCurrency(drawings)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50 font-bold">
                    <td className="py-2 text-gray-900">Estimated Profit / (Loss)</td>
                    <td className={`py-2 text-right font-mono ${profitLoss.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatIndianCurrency(Math.abs(profitLoss.netProfit))} {profitLoss.netProfit >= 0 ? '' : '(Loss)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Statement of Affairs - T format */}
          <TAccountFormat
            title="Statement of Affairs"
            subtitle={`As at ${toDate}`}
            companyName={company.name}
            leftLabel="Liabilities"
            rightLabel="Assets"
            leftColumns={[
              { header: 'Particulars', key: 'name' },
              { header: 'Amount (₹)', key: 'amount', align: 'right' },
            ]}
            rightColumns={[
              { header: 'Particulars', key: 'name' },
              { header: 'Amount (₹)', key: 'amount', align: 'right' },
            ]}
            leftData={liabilitiesForDisplay}
            rightData={bs.assets}
            leftTotal={balancedTotal}
            rightTotal={balancedTotal}
          />

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">Note on Incomplete Records:</p>
            <p className="mt-1">When complete double-entry books are not maintained, the Statement of Affairs method is used to estimate profit. Capital is computed as a balancing figure (Assets - Liabilities). The difference in opening and closing capital, adjusted for drawings and additional capital, gives the estimated profit.</p>
          </div>
        </div>
      )}
    </div>
  );
}
