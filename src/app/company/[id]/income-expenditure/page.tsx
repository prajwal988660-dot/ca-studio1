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
import type { EntityType } from '@/types/company';

export default function IncomeExpenditurePage() {
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

  // Expenditure (Dr side): all expense accounts
  const expenditureGroups = ['Indirect Expenses', 'Office Expenses', 'Admin Expenses', 'Direct Expenses',
    'Selling Expenses', 'Finance Costs', 'Depreciation', 'Purchases'];
  // Income (Cr side): all income accounts
  const incomeGroups = ['Sales', 'Indirect Income', 'Other Income', 'Non-Operating Income',
    'Donations Received', 'Subscriptions', 'Grants'];

  const expenditureItems: { name: string; amount: number }[] = [];
  const incomeItems: { name: string; amount: number }[] = [];

  for (const b of balances) {
    if (expenditureGroups.includes(b.account_group) || b.nature === 'expense') {
      const amount = b.balance_type === 'Dr' ? b.balance : -b.balance;
      expenditureItems.push({ name: b.account_name, amount });
    } else if (incomeGroups.includes(b.account_group) || b.nature === 'revenue') {
      const amount = b.balance_type === 'Cr' ? b.balance : -b.balance;
      incomeItems.push({ name: b.account_name, amount });
    }
  }

  const totalExpenditure = expenditureItems.reduce((s, i) => s + i.amount, 0);
  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
  const surplus = totalIncome - totalExpenditure;

  if (surplus > 0) {
    expenditureItems.push({ name: 'Excess of Income over Expenditure', amount: surplus });
  } else if (surplus < 0) {
    incomeItems.push({ name: 'Excess of Expenditure over Income', amount: Math.abs(surplus) });
  }

  const balancedTotal = Math.max(
    expenditureItems.reduce((s, i) => s + i.amount, 0),
    incomeItems.reduce((s, i) => s + i.amount, 0)
  );

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...expenditureItems.map(i => ({ side: 'Expenditure', name: i.name, amount: i.amount })),
    ...incomeItems.map(i => ({ side: 'Income', name: i.name, amount: i.amount })),
  ];

  return (
    <div>
      <PageHeader title="Income & Expenditure Account" description="Revenue account for non-profit entities">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Income & Expenditure" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {!loading && entries.length > 0 && (
        <div className={
          surplus >= 0
             ? "tally-ok" : "tally-err"}>
          {surplus >= 0
            ? `Surplus (Excess of Income over Expenditure): ${formatIndianCurrency(surplus)}`
            : `Deficit (Excess of Expenditure over Income): ${formatIndianCurrency(Math.abs(surplus))}`}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate the Income & Expenditure Account.</p>
        </div>
      ) : (
        <TAccountFormat
          title="Income & Expenditure Account"
          subtitle={`For the year ended ${toDate}`}
          companyName={company.name}
          leftLabel="Expenditure"
          rightLabel="Income"
          leftColumns={[
            { header: 'Particulars', key: 'name' },
            { header: 'Amount (₹)', key: 'amount', align: 'right' },
          ]}
          rightColumns={[
            { header: 'Particulars', key: 'name' },
            { header: 'Amount (₹)', key: 'amount', align: 'right' },
          ]}
          leftData={expenditureItems}
          rightData={incomeItems}
          leftTotal={balancedTotal}
          rightTotal={balancedTotal}
        />
      )}
    </div>
  );
}
