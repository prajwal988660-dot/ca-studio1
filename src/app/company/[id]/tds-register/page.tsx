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
import { computeTDSRegister } from '@/lib/accounting/tdsCompute';
import type { EntityType } from '@/types/company';

export default function TDSRegisterPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [showNewEntry, setShowNewEntry] = useState(false);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const tdsRows = useMemo(() => computeTDSRegister(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const totalTDS = tdsRows.reduce((s, r) => s + r.tdsAmount, 0);
  const totalGross = tdsRows.reduce((s, r) => s + r.amount, 0);
  const deposited = tdsRows.filter(r => r.status === 'deposited');
  const pending = tdsRows.filter(r => r.status !== 'deposited');
  const totalDeposited = deposited.reduce((s, r) => s + r.tdsAmount, 0);
  const totalPending = pending.reduce((s, r) => s + r.tdsAmount, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Deductee Name', key: 'deducteeName' },
    { header: 'PAN', key: 'pan' },
    { header: 'Section', key: 'section' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
    { header: 'TDS Rate (%)', key: 'tdsRate', align: 'right' as const },
    { header: 'TDS Amount (₹)', key: 'tdsAmount', align: 'right' as const, isMono: true },
    { header: 'Net Payment (₹)', key: 'netPayment', align: 'right' as const, isMono: true },
    { header: 'Status', key: 'status' },
  ];

  const data = tdsRows.map((r, i) => ({ sno: i + 1, ...r }));

  return (
    <div className="space-y-4">
      <PageHeader title="TDS Register" description="Tax Deducted at Source — register of all TDS deductions" />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-5">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Access Restricted</h3>
        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">For security reasons, this register is currently not accessible. It will be enabled in a future update.</p>
      </div>
    </div>
  );
  /* eslint-disable no-unreachable */
  return (
    <div>
      <PageHeader title="TDS Register" description="Tax Deducted at Source — register of all TDS deductions">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="TDS Register" companyName={company!.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {!loading && tdsRows.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total TDS Deducted</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalTDS)}</p>
            <p className="text-xs text-gray-500 mt-1">on {formatIndianCurrency(totalGross)} gross</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">TDS Deposited</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalDeposited)}</p>
            <p className="text-xs text-gray-500 mt-1">{deposited.length} transaction{deposited.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">TDS Pending Deposit</p>
            <p className="text-lg font-bold font-mono text-yellow-700">{formatIndianCurrency(totalPending)}</p>
            <p className="text-xs text-gray-500 mt-1">{pending.length} transaction{pending.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : tdsRows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No TDS deductions found. Create journal entries with TDS payable accounts (under Duties & Taxes) to populate this register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company!.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">TDS Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map(col => (
                    <th key={col.key} className={`px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tdsRows.map((r, i) => (
                  <tr key={`${r.date}-${r.deducteeName}-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.deducteeName || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.pan || '—'}</td>
                    <td className="px-3 py-2">{r.section || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.amount)}</td>
                    <td className="px-3 py-2 text-right">{r.tdsRate}%</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.tdsAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.netPayment)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'deposited' ? 'bg-green-100 text-green-700' :
                        r.status === 'deducted' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={5}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalGross)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalTDS)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalGross - totalTDS)}</td>
                  <td className="px-3 py-2" />
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
