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
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import type { EntityType } from '@/types/company';

export default function ShareCapitalPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Find share capital related accounts
  const shareCapitalAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_group === 'Share Capital' ||
      b.account_name.toLowerCase().includes('share capital') ||
      b.account_name.toLowerCase().includes('share application') ||
      b.account_name.toLowerCase().includes('share allotment') ||
      b.account_name.toLowerCase().includes('calls in') ||
      b.account_name.toLowerCase().includes('share forfeiture') ||
      b.account_name.toLowerCase().includes('securities premium') ||
      b.account_name.toLowerCase().includes('share premium')
    ), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  return (
    <div className="space-y-4">
      <PageHeader title="Share Capital" description="Share capital accounts — issue, allotment, calls, forfeiture" />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
          <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider mb-3">Under Modification</span>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Share Capital — Coming Soon</h3>
        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">This module is currently under modification and will be unlocked with the trial version.</p>
      </div>
    </div>
  );
  // eslint-disable-next-line no-unreachable
  // Detail view for selected account
  if (selectedAccount) {
    const ledgerRows = computeLedger(entries, selectedAccount!);
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
    const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);

    return (
      <div>
        <PageHeader title={selectedAccount!} description="Share capital account detail">
          <div className="flex flex-col gap-2 items-end">
            <button onClick={() => setSelectedAccount(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-blue-50/30 transition-colors">Back to Share Capital</button>
            <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
            <ExportButtons title={selectedAccount!} companyName={company!.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={runningColumns} data={runningData} />
          </div>
        </PageHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <RegisterFormat title={`${selectedAccount} — Ledger`} subtitle={`${fromDate} to ${toDate}`} companyName={company!.name} columns={runningColumns} data={runningData} totals={{ debit: totalDebit, credit: totalCredit }} emptyMessage="No transactions found." />
        )}
      </div>
    );
  }

  // Summary view
  const summaryColumns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Account Name', key: 'account_name' },
    { header: 'Account Group', key: 'account_group' },
    { header: 'Debit (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const summaryData = shareCapitalAccounts.map((b, i) => ({
    sno: i + 1,
    account_name: b.account_name,
    account_group: b.account_group,
    total_debit: b.total_debit,
    total_credit: b.total_credit,
    balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
  }));

  const totalShareCapital = shareCapitalAccounts
    .filter(b => b.account_group === 'Share Capital')
    .reduce((s, b) => s + b.balance, 0);

  return (
    <div>
      <PageHeader title="Share Capital" description="Share capital accounts — issue, allotment, calls, forfeiture">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Share Capital" companyName={company!.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={summaryColumns} data={summaryData} />
        </div>
      </PageHeader>

      {!loading && shareCapitalAccounts.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <p className="text-sm font-medium text-blue-700">Total Share Capital: {formatIndianCurrency(totalShareCapital)} Cr</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : shareCapitalAccounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No share capital accounts found. Create journal entries with Share Capital accounts to see this page.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company!.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Share Capital Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">S.No</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Group</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {shareCapitalAccounts.map((b, i) => (
                  <tr
                    key={b.account_name}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedAccount(b.account_name)}
                  >
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-blue-600">{b.account_name}</td>
                    <td className="px-3 py-2 text-gray-600">{b.account_group}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_debit > 0 ? formatIndianCurrency(b.total_debit) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_credit > 0 ? formatIndianCurrency(b.total_credit) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(b.balance)} {b.balance_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
