'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function FCRAPage() {
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

  // Find FCRA-related accounts
  const fcraAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_name.toLowerCase().includes('fcra') ||
      b.account_name.toLowerCase().includes('foreign contribution') ||
      b.account_name.toLowerCase().includes('foreign donation') ||
      b.account_name.toLowerCase().includes('fc bank') ||
      b.account_group.toLowerCase().includes('fcra')
    ), [balances]);

  // Compute FCRA summary from entries
  const fcraEntries = useMemo(() =>
    entries.filter(e =>
      e.lines?.some((l: any) =>
        l.account_name?.toLowerCase().includes('fcra') ||
        l.account_name?.toLowerCase().includes('foreign contribution') ||
        l.account_name?.toLowerCase().includes('foreign donation')
      )
    ), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const totalForeignReceived = fcraAccounts
    .filter(b => b.balance_type === 'Cr')
    .reduce((s, b) => s + b.balance, 0);

  const totalForeignUtilized = fcraAccounts
    .filter(b => b.balance_type === 'Dr')
    .reduce((s, b) => s + b.balance, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Account Name', key: 'account_name' },
    { header: 'Account Group', key: 'account_group' },
    { header: 'Debit (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const data = fcraAccounts.map((b, i) => ({
    sno: i + 1,
    account_name: b.account_name,
    account_group: b.account_group,
    total_debit: b.total_debit,
    total_credit: b.total_credit,
    balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
  }));

  return (
    <div>
      <PageHeader title="FCRA Register" description="Foreign Contribution (Regulation) Act register">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="FCRA Register" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
        </div>
      </PageHeader>

      {!loading && fcraAccounts.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Foreign Contribution Received</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalForeignReceived)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Utilization</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalForeignUtilized)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : fcraAccounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No FCRA accounts found. Create journal entries with FCRA/Foreign Contribution accounts to see this register.</p>
          <p className="text-xs text-gray-400 mt-2">FCRA applies to organizations receiving foreign contributions. Separate bank account and books must be maintained.</p>
        </div>
      ) : (
        <RegisterFormat
          title="FCRA — Foreign Contribution Register"
          subtitle={`${fromDate} to ${toDate}`}
          companyName={company.name}
          columns={columns}
          data={data}
          emptyMessage="No FCRA transactions found."
        />
      )}
    </div>
  );
}
