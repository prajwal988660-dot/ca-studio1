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

export default function FundAccountsPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Find fund accounts (e.g., Building Fund, Endowment Fund, Prize Fund, Sports Fund, etc.)
  const fundAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_name.toLowerCase().includes('fund') ||
      b.account_name.toLowerCase().includes('corpus') ||
      b.account_name.toLowerCase().includes('endowment') ||
      b.account_name.toLowerCase().includes('donation') ||
      b.account_group.toLowerCase().includes('fund')
    ), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Detail view
  if (selectedFund) {
    const ledgerRows = computeLedger(entries, selectedFund);
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
        <PageHeader title={selectedFund} description="Fund account detail">
          <div className="flex flex-col gap-2 items-end">
            <button onClick={() => setSelectedFund(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-blue-50/30 transition-colors">Back to Fund Accounts</button>
            <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
            <ExportButtons title={selectedFund} companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={runningColumns} data={runningData} />
          </div>
        </PageHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <RegisterFormat title={`${selectedFund} — Ledger`} subtitle={`${fromDate} to ${toDate}`} companyName={company.name} columns={runningColumns} data={runningData} totals={{ debit: totalDebit, credit: totalCredit }} emptyMessage="No transactions found." />
        )}
      </div>
    );
  }

  // Summary
  const summaryColumns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Fund Name', key: 'account_name' },
    { header: 'Account Group', key: 'account_group' },
    { header: 'Debit (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const summaryData = fundAccounts.map((b, i) => ({
    sno: i + 1,
    account_name: b.account_name,
    account_group: b.account_group,
    total_debit: b.total_debit,
    total_credit: b.total_credit,
    balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
  }));

  const totalFundBalance = fundAccounts.reduce((s, b) => s + b.balance, 0);

  return (
    <div>
      <PageHeader title="Fund Accounts" description="Corpus, endowment, and earmarked funds">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Fund Accounts" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={summaryColumns} data={summaryData} />
        </div>
      </PageHeader>

      {!loading && fundAccounts.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <p className="text-sm font-medium text-blue-700">Total Fund Balance: {formatIndianCurrency(totalFundBalance)}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : fundAccounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No fund accounts found. Create journal entries with Fund accounts to see this page.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Fund Accounts</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">S.No</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fund Name</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Group</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {fundAccounts.map((b, i) => (
                  <tr
                    key={b.account_name}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedFund(b.account_name)}
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
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={5}>Total Fund Balance</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalFundBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
