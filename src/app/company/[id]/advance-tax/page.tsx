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

interface AdvanceTaxPayment {
  date: string;
  narration: string;
  amount: number;
  quarter: string;
}

interface QuarterSummary {
  label: string;
  deadline: string;
  cumPercent: string;
  paid: number;
  count: number;
}

function getQuarter(date: string, fyStartMonth: number = 4): string {
  const month = new Date(date).getMonth() + 1; // 1-12
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4'; // Jan-Mar
}

function computeAdvanceTax(entries: JournalEntry[]): AdvanceTaxPayment[] {
  const payments: AdvanceTaxPayment[] = [];

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (
        (line.account_name.toLowerCase().includes('advance tax') ||
         line.account_name.toLowerCase().includes('advance income tax')) &&
        line.debit > 0
      ) {
        payments.push({
          date: entry.entry_date,
          narration: entry.narration || '',
          amount: line.debit,
          quarter: getQuarter(entry.entry_date),
        });
      }
    }
  }

  return payments.sort((a, b) => a.date.localeCompare(b.date));
}

export default function AdvanceTaxPage() {
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

  const payments = useMemo(() => computeAdvanceTax(entries), [entries]);

  const quarterSummaries = useMemo((): QuarterSummary[] => {
    const quarters: QuarterSummary[] = [
      { label: 'Q1 (Apr–Jun)', deadline: 'June 15', cumPercent: '15%', paid: 0, count: 0 },
      { label: 'Q2 (Jul–Sep)', deadline: 'September 15', cumPercent: '45%', paid: 0, count: 0 },
      { label: 'Q3 (Oct–Dec)', deadline: 'December 15', cumPercent: '75%', paid: 0, count: 0 },
      { label: 'Q4 (Jan–Mar)', deadline: 'March 15', cumPercent: '100%', paid: 0, count: 0 },
    ];
    for (const p of payments) {
      const qIdx = p.quarter === 'Q1' ? 0 : p.quarter === 'Q2' ? 1 : p.quarter === 'Q3' ? 2 : 3;
      quarters[qIdx].paid += p.amount;
      quarters[qIdx].count += 1;
    }
    return quarters;
  }, [payments]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const totalPaid = payments.reduce((s, r) => s + r.amount, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Quarter', key: 'quarter' },
    { header: 'Narration / Challan Ref', key: 'narration' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const data = payments.map((r, i) => ({ sno: i + 1, ...r }));

  return (
    <div>
      <PageHeader title="Advance Tax Register" description="Quarterly advance tax payments under Sec 208–211">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="Advance Tax Register" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {/* Quarter-wise summary cards */}
      {!loading && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quarterSummaries.map(q => (
            <div key={q.label} className={`border rounded-xl px-4 py-3 ${q.paid > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{q.label}</p>
              <p className={`text-lg font-bold font-mono ${q.paid > 0 ? 'text-green-700' : 'text-gray-400'}`}>{formatIndianCurrency(q.paid)}</p>
              <p className="text-xs text-gray-500 mt-1">Due: {q.deadline} ({q.cumPercent} cum.)</p>
            </div>
          ))}
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Advance Tax Paid</p>
          <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalPaid)}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No advance tax payments found. Create journal entries debiting &quot;Advance Tax&quot; / &quot;Advance Income Tax&quot; account to populate this register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Advance Tax Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">FY {fromDate} to {toDate}</p>
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
                {payments.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2">{r.quarter}</td>
                    <td className="px-3 py-2 text-gray-700">{r.narration || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={4}>Total Advance Tax Paid</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalPaid)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Interest u/s 234B/234C note */}
          <div className="px-4 py-3 border-t border-gray-200 bg-blue-50">
            <p className="text-sm text-blue-700 font-medium">Note on Interest:</p>
            <p className="text-xs text-blue-600 mt-1">
              Sec 234B: Interest @ 1% p.m. if advance tax paid &lt; 90% of assessed tax.
              Sec 234C: Interest @ 1% p.m. for deferment/shortfall in quarterly instalments.
            </p>
          </div>
        </div>
      )}

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={createEntry}
        defaultVoucherType="Payment"
      />
    </div>
  );
}
