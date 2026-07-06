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
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

interface TCSRegisterRow {
  date: string;
  buyerName: string;
  pan: string;
  section: string;
  saleAmount: number;
  tcsRate: number;
  tcsAmount: number;
  status: 'collected' | 'deposited' | 'pending';
}

function computeTCSRegister(entries: JournalEntry[]): TCSRegisterRow[] {
  const rows: TCSRegisterRow[] = [];

  for (const entry of entries) {
    let tcsAmount = 0;
    let buyerName = '';
    let saleAmount = 0;

    for (const line of entry.lines) {
      if (line.account_name.toLowerCase().includes('tcs') && (line.account_group === 'Statutory Liabilities' || line.account_group === 'Duties & Taxes')) {
        tcsAmount += line.credit || 0;
      } else if (line.debit > 0 && (line.account_group === 'Trade Receivables' || line.account_group === 'Sundry Debtors')) {
        buyerName = line.account_name;
        saleAmount += line.debit;
      } else if (line.credit > 0 && (line.account_group === 'Revenue from Operations' || line.account_group === 'Sales' || line.account_group === 'Revenue')) {
        saleAmount += line.credit;
      }
    }

    if (tcsAmount > 0) {
      const grossSale = saleAmount > tcsAmount ? saleAmount - tcsAmount : saleAmount;
      const rate = grossSale > 0 ? (tcsAmount / grossSale) * 100 : 0;
      rows.push({
        date: entry.entry_date,
        buyerName,
        pan: '',
        section: '',
        saleAmount: grossSale,
        tcsRate: Math.round(rate * 100) / 100,
        tcsAmount,
        status: 'collected',
      });
    }
  }

  return rows;
}

export default function TCSRegisterPage() {
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

  const tcsRows = useMemo(() => computeTCSRegister(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const totalTCS = tcsRows.reduce((s, r) => s + r.tcsAmount, 0);
  const totalSales = tcsRows.reduce((s, r) => s + r.saleAmount, 0);
  const deposited = tcsRows.filter(r => r.status === 'deposited');
  const pending = tcsRows.filter(r => r.status !== 'deposited');
  const totalDeposited = deposited.reduce((s, r) => s + r.tcsAmount, 0);
  const totalPending = pending.reduce((s, r) => s + r.tcsAmount, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Buyer Name', key: 'buyerName' },
    { header: 'PAN', key: 'pan' },
    { header: 'Section', key: 'section' },
    { header: 'Sale Amount (₹)', key: 'saleAmount', align: 'right' as const, isMono: true },
    { header: 'TCS Rate (%)', key: 'tcsRate', align: 'right' as const },
    { header: 'TCS Amount (₹)', key: 'tcsAmount', align: 'right' as const, isMono: true },
    { header: 'Status', key: 'status' },
  ];

  const data = tcsRows.map((r, i) => ({ sno: i + 1, ...r }));

  return (
    <div className="space-y-4">
      <PageHeader title="TCS Register" description="Tax Collected at Source — register of all TCS collections" />
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
  // eslint-disable-next-line no-unreachable
  return (
    <div>
      <PageHeader title="TCS Register" description="Tax Collected at Source — register of all TCS collections">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="TCS Register" companyName={company!.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {!loading && tcsRows.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total TCS Collected</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalTCS)}</p>
            <p className="text-xs text-gray-500 mt-1">on {formatIndianCurrency(totalSales)} sales</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">TCS Deposited</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalDeposited)}</p>
            <p className="text-xs text-gray-500 mt-1">{deposited.length} transaction{deposited.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">TCS Pending Deposit</p>
            <p className="text-lg font-bold font-mono text-yellow-700">{formatIndianCurrency(totalPending)}</p>
            <p className="text-xs text-gray-500 mt-1">{pending.length} transaction{pending.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : tcsRows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No TCS collections found. Create journal entries with TCS payable accounts (under Duties & Taxes) to populate this register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company!.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">TCS Register</h3>
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
                {tcsRows.map((r, i) => (
                  <tr key={`${r.date}-${r.buyerName}-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.buyerName || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.pan || '—'}</td>
                    <td className="px-3 py-2">{r.section || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.saleAmount)}</td>
                    <td className="px-3 py-2 text-right">{r.tcsRate}%</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.tcsAmount)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'deposited' ? 'bg-green-100 text-green-700' :
                        r.status === 'collected' ? 'bg-blue-100 text-blue-700' :
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
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalSales)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalTCS)}</td>
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
