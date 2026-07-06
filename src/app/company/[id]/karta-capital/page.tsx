'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { TAccountFormat } from '@/components/formats/TAccountFormat';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger, computeLedgerTFormat } from '@/lib/accounting/ledgerCompute';
import type { EntityType } from '@/types/company';

export default function KartaCapitalPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [viewMode, setViewMode] = useState<'running' | 'tformat'>('running');

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Find Karta Capital account
  const kartaAccount = useMemo(() =>
    balances.find(b =>
      b.account_name.toLowerCase().includes('karta') ||
      ((b.account_group === 'Share Capital' || b.account_group === 'Capital Account') && b.account_name.toLowerCase().includes('capital'))
    ), [balances]);

  // Also find drawings account
  const drawingsAccount = useMemo(() =>
    balances.find(b => b.account_name.toLowerCase().includes('drawing')), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const accountName = kartaAccount?.account_name || 'Karta Capital Account';

  const ledgerRows = kartaAccount ? computeLedger(entries, kartaAccount.account_name) : [];
  const tFormat = kartaAccount ? computeLedgerTFormat(entries, kartaAccount.account_name) : { debitSide: [], creditSide: [] };

  const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);

  const runningColumns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Voucher Type', key: 'voucher_type' },
    { header: 'Debit (₹)', key: 'debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const runningData = ledgerRows.map(r => ({
    ...r,
    balance_display: `${formatIndianCurrency(r.running_balance)} ${r.balance_type}`,
  }));

  return (
    <div>
      <PageHeader title="Karta's Capital Account" description="Capital account of the Karta (HUF)">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {(['running', 'tformat'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm ${viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {mode === 'running' ? 'Running Balance' : 'T-Format'}
              </button>
            ))}
          </div>
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Karta Capital" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={runningColumns} data={runningData} />
        </div>
      </PageHeader>

      {/* Capital summary */}
      {!loading && kartaAccount && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Capital Balance</p>
            <p className="text-lg font-bold font-mono text-gray-900">{formatIndianCurrency(kartaAccount.balance)} {kartaAccount.balance_type}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Capital Introduced</p>
            <p className="text-lg font-bold font-mono text-gray-900">{formatIndianCurrency(kartaAccount.total_credit)}</p>
          </div>
          {drawingsAccount && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Drawings</p>
              <p className="text-lg font-bold font-mono text-gray-900">{formatIndianCurrency(drawingsAccount.balance)}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !kartaAccount ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No Karta Capital Account found. Create journal entries with a Capital Account to see this statement.</p>
        </div>
      ) : viewMode === 'tformat' ? (
        <TAccountFormat
          title={`${accountName}`}
          subtitle={`${fromDate} to ${toDate}`}
          companyName={company.name}
          leftLabel="Dr."
          rightLabel="Cr."
          leftColumns={[
            { header: 'Date', key: 'date' },
            { header: 'Particulars', key: 'particulars' },
            { header: 'Amount (₹)', key: 'debit', align: 'right' },
          ]}
          rightColumns={[
            { header: 'Date', key: 'date' },
            { header: 'Particulars', key: 'particulars' },
            { header: 'Amount (₹)', key: 'credit', align: 'right' },
          ]}
          leftData={tFormat.debitSide}
          rightData={tFormat.creditSide}
          leftTotal={totalDebit}
          rightTotal={totalCredit}
        />
      ) : (
        <RegisterFormat
          title={`${accountName} — Ledger`}
          subtitle={`${fromDate} to ${toDate}`}
          companyName={company.name}
          columns={runningColumns}
          data={runningData}
          totals={{ debit: totalDebit, credit: totalCredit }}
          emptyMessage="No transactions found."
        />
      )}
    </div>
  );
}
