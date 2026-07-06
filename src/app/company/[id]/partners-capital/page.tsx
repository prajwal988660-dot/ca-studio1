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
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import { AlertBanner } from '@/components/layout/AlertBanner';
import { detectPartnerChanges } from '@/lib/utils/edgeCases';
import type { EntityType } from '@/types/company';

type CapitalMethod = 'fixed' | 'fluctuating';

export default function PartnersCapitalPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [method, setMethod] = useState<CapitalMethod>('fluctuating');

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Find partner capital accounts
  const partnerCapitalAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_group === 'Share Capital' ||
      b.account_group === 'Partners Capital' ||
      b.account_group === 'Capital Account' ||
      b.account_name.toLowerCase().includes('capital a/c') ||
      b.account_name.toLowerCase().includes("capital account")
    ), [balances]);

  // Find partner current accounts (for fixed method)
  const partnerCurrentAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_name.toLowerCase().includes('current a/c') ||
      b.account_name.toLowerCase().includes('current account')
    ), [balances]);

  // Find partner drawings accounts
  const partnerDrawingsAccounts = useMemo(() =>
    balances.filter(b =>
      b.account_name.toLowerCase().includes('drawing')
    ), [balances]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Detect partner admission/retirement
  const partnerChanges = useMemo(() => detectPartnerChanges(entries, fromDate, toDate), [entries, fromDate, toDate]);

  // Build T-format data for each partner
  const allPartnerAccounts = method === 'fixed'
    ? [...partnerCapitalAccounts, ...partnerCurrentAccounts]
    : partnerCapitalAccounts;

  // Build summary table
  const summaryColumns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Partner / Account', key: 'account_name' },
    { header: 'Account Group', key: 'account_group' },
    { header: 'Debit (₹)', key: 'total_debit', align: 'right' as const, isMono: true },
    { header: 'Credit (₹)', key: 'total_credit', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balance_display', align: 'right' as const, isMono: true },
  ];

  const summaryData = allPartnerAccounts.map((b, i) => ({
    sno: i + 1,
    account_name: b.account_name,
    account_group: b.account_group,
    total_debit: b.total_debit,
    total_credit: b.total_credit,
    balance_display: `${formatIndianCurrency(b.balance)} ${b.balance_type}`,
  }));

  // Add drawings if any
  partnerDrawingsAccounts.forEach((d, i) => {
    summaryData.push({
      sno: allPartnerAccounts.length + i + 1,
      account_name: d.account_name,
      account_group: d.account_group,
      total_debit: d.total_debit,
      total_credit: d.total_credit,
      balance_display: `${formatIndianCurrency(d.balance)} ${d.balance_type}`,
    });
  });

  const exportColumns = summaryColumns;
  const exportData = summaryData;

  return (
    <div>
      <PageHeader title="Partners' Capital Account" description="Capital accounts of all partners">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {(['fluctuating', 'fixed'] as CapitalMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 text-sm ${method === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {m === 'fixed' ? 'Fixed Capital' : 'Fluctuating Capital'}
              </button>
            ))}
          </div>
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Partners Capital" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {partnerChanges.admissions.length > 0 && (
        <AlertBanner type="info" title="Partner Admission Detected" message={`New partner(s) admitted during this period: ${partnerChanges.admissions.join(', ')}. Ensure goodwill and revaluation entries are recorded.`} />
      )}
      {partnerChanges.retirements.length > 0 && (
        <AlertBanner type="warning" title="Partner Retirement Detected" message={`Partner(s) retired during this period: ${partnerChanges.retirements.join(', ')}. Ensure settlement, goodwill, and revaluation entries are recorded.`} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : allPartnerAccounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No partner capital accounts found. Create journal entries with partner capital accounts first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Partners&apos; Capital Account — {method === 'fixed' ? 'Fixed Method' : 'Fluctuating Method'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">S.No</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Partner / Account</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Group</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2 text-xs text-gray-400">{row.sno}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.account_name}</td>
                      <td className="px-3 py-2 text-gray-600">{row.account_group}</td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{row.total_debit > 0 ? formatIndianCurrency(row.total_debit) : ''}</td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{row.total_credit > 0 ? formatIndianCurrency(row.total_credit) : ''}</td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{row.balance_display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Partner Ledgers */}
          {allPartnerAccounts.map(account => {
            const ledgerRows = computeLedger(entries, account.account_name);
            return (
              <div key={account.account_name} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-900">{account.account_name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Balance: {formatIndianCurrency(account.balance)} {account.balance_type}</p>
                </div>
                {ledgerRows.length === 0 ? (
                  <div className="text-center py-8"><p className="text-gray-400">No transactions found.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Voucher Type</th>
                          <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                          <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                          <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-600">{r.date}</td>
                            <td className="px-3 py-2">{r.particulars}</td>
                            <td className="px-3 py-2 text-xs text-gray-400">{r.voucher_type}</td>
                            <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.debit > 0 ? formatIndianCurrency(r.debit) : ''}</td>
                            <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.credit > 0 ? formatIndianCurrency(r.credit) : ''}</td>
                            <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.running_balance)} {r.balance_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
