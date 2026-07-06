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

interface PayrollRow {
  date: string;
  employeeName: string;
  grossSalary: number;
  pf: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  netPayable: number;
}

function computePayroll(entries: JournalEntry[]): PayrollRow[] {
  const rows: PayrollRow[] = [];

  for (const entry of entries) {
    let grossSalary = 0, pf = 0, esi = 0, tds = 0, otherDeductions = 0;
    let employeeName = '';

    for (const line of entry.lines) {
      const name = line.account_name.toLowerCase();
      if (name.includes('salary') || name.includes('wages')) {
        grossSalary += line.debit || 0;
      } else if (name.includes('pf') || name.includes('provident fund')) {
        pf += line.credit || 0;
      } else if (name.includes('esi') || name.includes('esic')) {
        esi += line.credit || 0;
      } else if (name.includes('tds') && name.includes('salary')) {
        tds += line.credit || 0;
      } else if ((line.account_group === 'Trade Payables' || line.account_group === 'Sundry Creditors' || line.account_group === 'Other Current Liabilities') && line.credit > 0) {
        employeeName = line.account_name;
      }
    }

    if (grossSalary > 0) {
      const netPayable = grossSalary - pf - esi - tds - otherDeductions;
      rows.push({ date: entry.entry_date, employeeName: employeeName || entry.narration || '—', grossSalary, pf, esi, tds, otherDeductions, netPayable });
    }
  }

  return rows;
}

export default function PayrollPage() {
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

  const payrollRows = useMemo(() => computePayroll(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const totalGross = payrollRows.reduce((s, r) => s + r.grossSalary, 0);
  const totalPF = payrollRows.reduce((s, r) => s + r.pf, 0);
  const totalESI = payrollRows.reduce((s, r) => s + r.esi, 0);
  const totalTDS = payrollRows.reduce((s, r) => s + r.tds, 0);
  const totalNet = payrollRows.reduce((s, r) => s + r.netPayable, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Employee / Narration', key: 'employeeName' },
    { header: 'Gross Salary (₹)', key: 'grossSalary', align: 'right' as const, isMono: true },
    { header: 'PF (₹)', key: 'pf', align: 'right' as const, isMono: true },
    { header: 'ESI (₹)', key: 'esi', align: 'right' as const, isMono: true },
    { header: 'TDS (₹)', key: 'tds', align: 'right' as const, isMono: true },
    { header: 'Net Payable (₹)', key: 'netPayable', align: 'right' as const, isMono: true },
  ];

  const data = payrollRows.map((r, i) => ({ sno: i + 1, ...r }));

  return (
    <div>
      <PageHeader title="Payroll / Salary Register" description="Employee salary payments with statutory deductions">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="Payroll Register" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {!loading && payrollRows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Gross Salary</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalGross)}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">PF + ESI</p>
            <p className="text-lg font-bold font-mono text-yellow-700">{formatIndianCurrency(totalPF + totalESI)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">TDS on Salary</p>
            <p className="text-lg font-bold font-mono text-red-700">{formatIndianCurrency(totalTDS)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Net Payable</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalNet)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : payrollRows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No salary entries found. Create journal entries debiting Salary/Wages accounts to populate the payroll register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Payroll / Salary Register</h3>
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
                {payrollRows.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.employeeName}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.grossSalary)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.pf > 0 ? formatIndianCurrency(r.pf) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.esi > 0 ? formatIndianCurrency(r.esi) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.tds > 0 ? formatIndianCurrency(r.tds) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.netPayable)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalGross)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalPF)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalESI)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalTDS)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalNet)}</td>
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
        defaultVoucherType="Payment"
      />
    </div>
  );
}
