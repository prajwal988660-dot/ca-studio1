'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ManualEntryDialog } from '@/components/entries/ManualEntryDialog';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function BRSPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [bankPassbookBalance, setBankPassbookBalance] = useState<string>('');
  const [showNewEntry, setShowNewEntry] = useState(false);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Find bank accounts
  const bankAccounts = useMemo(() =>
    balances.filter(b =>
      (b.account_group === 'Bank Balances' || b.account_group === 'Cash & Bank' || b.account_group === 'Suspense & Clearing') &&
      (b.account_name.toLowerCase().includes('bank') ||
       b.account_name.toLowerCase().includes('cash at bank'))
    ), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const cashBookBalance = bankAccounts.reduce((s, b) => s + b.balance, 0);
  const passbookBalance = parseFloat(bankPassbookBalance) || 0;
  const difference = cashBookBalance - passbookBalance;

  const columns = [
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const brsData = [
    { label: 'Balance as per Cash Book', amount: cashBookBalance },
    { label: 'Balance as per Bank Passbook / Statement', amount: passbookBalance },
    { label: 'Difference', amount: difference },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Bank Reconciliation Statement" description="Reconcile cash book balance with bank passbook" />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
          <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider mb-3">Under Modification</span>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Bank Reconciliation Statement — Coming Soon</h3>
        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">This module is currently under modification and will be unlocked with the trial version.</p>
      </div>
    </div>
  );
  // eslint-disable-next-line no-unreachable
  return (
    <div>
      <PageHeader title="Bank Reconciliation Statement" description="Reconcile cash book balance with bank passbook">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="BRS" companyName={company!.name} entityType={entityLabel} dateRange={`As at ${toDate}`} columns={columns} data={brsData} />
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {/* Bank Account Summary */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company!.name}</p>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">Bank Reconciliation Statement</h3>
              <p className="text-xs text-gray-400 mt-0.5">As at {toDate}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Cash Book Balance (from system) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Balance as per Cash Book</p>
                  <p className="text-xl font-bold font-mono text-blue-700">{formatIndianCurrency(cashBookBalance)}</p>
                  <p className="text-xs text-gray-500 mt-1">(Auto-computed from journal entries)</p>
                </div>
                <div className="border border-gray-200 rounded-xl px-4 py-3">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Balance as per Bank Passbook</label>
                  <input
                    type="number"
                    value={bankPassbookBalance}
                    onChange={e => setBankPassbookBalance(e.target.value)}
                    placeholder="Enter bank passbook balance"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-right font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Difference */}
              {bankPassbookBalance && (
                <div className={`px-4 py-3 rounded-xl border ${
                  Math.abs(difference) < 0.01
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className="text-sm font-medium">
                    {Math.abs(difference) < 0.01
                      ? 'Balances match — No reconciliation items.'
                      : `Difference: ${formatIndianCurrency(Math.abs(difference))} ${difference > 0 ? '(Cash Book > Passbook)' : '(Passbook > Cash Book)'}`}
                  </p>
                </div>
              )}

              {/* Bank Accounts Table */}
              {bankAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Bank Accounts in Cash Book</h4>
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.map(b => (
                        <tr key={b.account_name} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-medium">{b.account_name}</td>
                          <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_debit > 0 ? formatIndianCurrency(b.total_debit) : ''}</td>
                          <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{b.total_credit > 0 ? formatIndianCurrency(b.total_credit) : ''}</td>
                          <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(b.balance)} {b.balance_type}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2" colSpan={2} />
                        <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(cashBookBalance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {bankAccounts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No bank accounts found in the Cash Book. Create journal entries with Bank accounts to reconcile.</p>
                </div>
              )}

              {/* BRS Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <p className="font-medium">How to Reconcile:</p>
                <p className="mt-1">Common causes of difference: Cheques issued but not presented, cheques deposited but not credited, direct debits/credits by bank, bank charges, interest credited by bank.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={createEntry}
        defaultVoucherType="Contra"
      />
    </div>
  );
}
