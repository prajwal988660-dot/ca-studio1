'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import type { EntityType } from '@/types/company';
import { listJournalEntries } from '@/lib/offlineDb';

export default function TradingAccountPage() {
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

  const allRange = useMemo(() => {
    if (!companyId) return null;
    const all = listJournalEntries(companyId);
    if (!all.length) return null;
    const dates = all.map((e) => e.entry_date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [companyId, entries]);

  // Auto-expand date range so entries outside default FY are visible
  const rangeExpanded = useRef(false);
  useEffect(() => {
    if (!allRange || rangeExpanded.current) return;
    let changed = false;
    if (allRange.from < fromDate) { setFromDate(allRange.from); changed = true; }
    if (allRange.to > toDate) { setToDate(allRange.to); changed = true; }
    if (changed) rangeExpanded.current = true;
  }, [allRange, fromDate, toDate]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const leftColumns = [
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const },
  ];

  const rightColumns = [
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const },
  ];

  // Export columns (flat format for CSV/Excel/PDF)
  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...tradingAccount.debitItems.map(i => ({ side: 'Dr', name: i.name, amount: i.amount })),
    ...tradingAccount.creditItems.map(i => ({ side: 'Cr', name: i.name, amount: i.amount })),
  ];

  const balancedTotal = Math.max(
    tradingAccount.debitItems.reduce((s, i) => s + i.amount, 0),
    tradingAccount.creditItems.reduce((s, i) => s + i.amount, 0)
  );

  return (
    <div>
      <PageHeader title="Trading Account" description="Gross Profit / Loss computation">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Trading Account" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {/* Gross Profit/Loss indicator */}
      {!loading && entries.length > 0 && (
        <div className={
          tradingAccount.grossProfit >= 0
             ? "tally-ok" : "tally-err"}>
          {tradingAccount.grossProfit >= 0
            ? `Gross Profit: ${formatIndianCurrency(tradingAccount.grossProfit)}`
            : `Gross Loss: ${formatIndianCurrency(Math.abs(tradingAccount.grossProfit))}`}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <TAccountFormat
          title="Trading Account"
          subtitle={`For the period ${fromDate} to ${toDate}`}
          companyName={company.name}
          leftLabel="Dr."
          rightLabel="Cr."
          hideSideLabels
          leftColumns={leftColumns}
          rightColumns={rightColumns}
          leftData={tradingAccount.debitItems}
          rightData={tradingAccount.creditItems}
          leftTotal={balancedTotal}
          rightTotal={balancedTotal}
        />
      )}
    </div>
  );
}
