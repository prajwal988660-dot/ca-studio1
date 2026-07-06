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
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

interface EWayBillRow {
  date: string;
  voucherNumber: string;
  partyName: string;
  invoiceValue: number;
  goodsDescription: string;
  ewayBillRequired: boolean;
}

function computeEWayBillRegister(entries: JournalEntry[]): EWayBillRow[] {
  const rows: EWayBillRow[] = [];
  const salesEntries = entries.filter(e => e.voucher_type === 'SLS');

  for (const entry of salesEntries) {
    let invoiceValue = 0;
    let partyName = '';

    for (const line of entry.lines) {
      if (line.account_group === 'Trade Receivables' || line.account_group === 'Sundry Debtors') {
        partyName = line.account_name;
        invoiceValue += line.debit || 0;
      }
    }

    if (invoiceValue > 0) {
      rows.push({
        date: entry.entry_date,
        voucherNumber: entry.voucher_number || entry.entry_code,
        partyName,
        invoiceValue,
        goodsDescription: entry.narration || '',
        ewayBillRequired: invoiceValue >= 50000,
      });
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export default function EWayBillPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const rows = useMemo(() => computeEWayBillRegister(entries), [entries]);
  const required = rows.filter(r => r.ewayBillRequired);
  const notRequired = rows.filter(r => !r.ewayBillRequired);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Invoice No.', key: 'voucherNumber' },
    { header: 'Party Name', key: 'partyName' },
    { header: 'Invoice Value (₹)', key: 'invoiceValue', align: 'right' as const, isMono: true },
    { header: 'Description', key: 'goodsDescription' },
    { header: 'e-Way Bill Required', key: 'ewayBillRequired' },
  ];

  const data = rows.map((r, i) => ({ sno: i + 1, ...r, ewayBillRequired: r.ewayBillRequired ? 'Yes' : 'No' }));

  return (
    <div>
      <PageHeader title="e-Way Bill Register" description="Goods movement register — consignments requiring e-Way Bill (value > ₹50,000)">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="e-Way Bill Register" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
        </div>
      </PageHeader>

      {!loading && rows.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Consignments</p>
            <p className="text-lg font-bold text-blue-700">{rows.length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">e-Way Bill Required</p>
            <p className="text-lg font-bold text-red-700">{required.length}</p>
            <p className="text-xs text-gray-500 mt-1">{formatIndianCurrency(required.reduce((s, r) => s + r.invoiceValue, 0))} total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Below Threshold</p>
            <p className="text-lg font-bold text-green-700">{notRequired.length}</p>
            <p className="text-xs text-gray-500 mt-1">{formatIndianCurrency(notRequired.reduce((s, r) => s + r.invoiceValue, 0))} total</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No sales consignments found. Create SLS voucher type journal entries to populate the e-Way Bill register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{company.name} | GSTIN: {company.gst_details?.gstin || '—'}</p>
            <h3 className="text-sm font-bold text-gray-900">e-Way Bill Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Invoice Value (₹)</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">e-Way Bill</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${r.voucherNumber}-${i}`} className={`border-b border-gray-100 ${r.ewayBillRequired ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2">{r.voucherNumber}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.partyName || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.invoiceValue)}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{r.goodsDescription || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.ewayBillRequired ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.ewayBillRequired ? 'Required' : 'Not Required'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-blue-50 text-xs text-blue-700">
            <p className="font-medium">e-Way Bill Rules:</p>
            <p>Required for movement of goods with consignment value exceeding ₹50,000. Generate on the e-Way Bill portal before dispatch.</p>
          </div>
        </div>
      )}
    </div>
  );
}
