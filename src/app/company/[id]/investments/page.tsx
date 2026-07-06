'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ManualEntryDialog } from '@/components/entries/ManualEntryDialog';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import type { EntityType } from '@/types/company';

export default function InvestmentsPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);
  const investmentAccounts = useMemo(() =>
    balances.filter(b => ['Non-current Investments', 'Current Investments', 'Investments'].includes(b.account_group) || b.account_name.toLowerCase().includes('investment')), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  if (selectedAccount) {
    const ledgerRows = computeLedger(entries, selectedAccount);
    const columns = [
      { header: 'Date', key: 'date' },
      { header: 'Particulars', key: 'particulars' },
      { header: 'Voucher Type', key: 'voucher_type' },
      { header: 'Debit (₹)', key: 'debit', align: 'right' as const, isMono: true },
      { header: 'Credit (₹)', key: 'credit', align: 'right' as const, isMono: true },
      { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
    ];
    const data = ledgerRows.map(r => ({ ...r, balance_display: `${formatIndianCurrency(r.running_balance)} ${r.balance_type}` }));
    const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);

    return (
      <div>
        <PageHeader title={selectedAccount} description="Investment account detail">
          <div className="flex flex-col gap-2 items-end">
            <button onClick={() => setSelectedAccount(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-blue-50/30 transition-colors">Back to Investments</button>
            <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
            <ExportButtons title={selectedAccount} companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </PageHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <RegisterFormat title={`${selectedAccount} — Ledger`} subtitle={`${fromDate} to ${toDate}`} companyName={company.name} columns={columns} data={data} totals={{ debit: totalDebit, credit: totalCredit }} emptyMessage="No transactions found." />
        )}
      </div>
    );
  }

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Investment Name', key: 'account_name' },
    { header: 'Purchases (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
    { header: 'Sales (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const data = investmentAccounts.map((b, i) => ({
    sno: i + 1,
    account_name: b.account_name,
    total_debit: b.total_debit,
    total_credit: b.total_credit,
    balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
  }));

  const totalValue = investmentAccounts.reduce((s, b) => s + b.balance, 0);

  return (
    <div>
      <PageHeader title="Investment Register" description="Register of all investments">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="Investments" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {!loading && investmentAccounts.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <p className="text-sm font-medium text-blue-700">Total Investments: {formatIndianCurrency(totalValue)}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : investmentAccounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No investment accounts found. Create journal entries with Investment accounts to see this register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Investment Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map(col => (
                    <th key={col.key} className={`px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investmentAccounts.map((b, i) => (
                  <tr key={b.account_name} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer" onClick={() => setSelectedAccount(b.account_name)}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-blue-600">{b.account_name}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_debit > 0 ? formatIndianCurrency(b.total_debit) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_credit > 0 ? formatIndianCurrency(b.total_credit) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(b.balance)} {b.balance_type}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={4}>Total Investments</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={createEntry}
      />
    </div>
  );
}
