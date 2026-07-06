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
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeCogsWorking } from '@/lib/accounting/cogsWorkingCompute';
import type { EntityType } from '@/types/company';

export default function CogsWorkingPage() {
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
  const cogsWorking = useMemo(() => computeCogsWorking(entries), [entries]);

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const netSales = tradingAccount.creditItems
    .filter(i => i.name.toLowerCase().includes('sales'))
    .reduce((s, i) => s + i.amount, 0);
  const cogs = cogsWorking.cogs;

  const exportColumns = [
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    { label: 'Cost of Raw Materials Consumed (A)', amount: cogsWorking.rawMaterialsConsumed },
    { label: 'Net WIP Adjustment (B)', amount: cogsWorking.netWipAdjustment },
    { label: 'Total Manufacturing / Direct Expenses (C)', amount: cogsWorking.directManufacturingExpenses },
    { label: 'Cost of Production (A + B + C)', amount: cogsWorking.costOfProduction },
    { label: 'Opening Stock of Finished Goods', amount: cogsWorking.openingFinishedGoods },
    { label: 'Closing Stock of Finished Goods', amount: cogsWorking.closingFinishedGoods },
    { label: 'COST OF GOODS SOLD (COGS)', amount: cogsWorking.cogs },
  ];

  return (
    <div>
      <PageHeader
        title="COGS Working"
        description="Cost of Goods Sold working note derived from Trading Account"
      >
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => {
              setFromDate(f);
              setToDate(t);
            }}
          />
          <ExportButtons
            title="COGS Working"
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Cost of Goods Sold Working</h3>
            <p className="text-xs text-gray-400 mt-0.5">{`For the period ${fromDate} to ${toDate}`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">₹</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold">Cost of Raw Materials Consumed (A)</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.rawMaterialsConsumed)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">Net WIP Adjustment (B)</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.netWipAdjustment)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">Total Manufacturing / Direct Expenses (C)</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.directManufacturingExpenses)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="px-3 py-2 font-semibold">Cost of Production (A + B + C)</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.costOfProduction)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">Add: Opening Stock of Finished Goods</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.openingFinishedGoods)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">Less: Closing Stock of Finished Goods</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">
                    {formatIndianCurrency(cogsWorking.closingFinishedGoods)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 font-bold">COST OF GOODS SOLD (COGS)</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-bold">
                    {formatIndianCurrency(cogsWorking.cogs)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

