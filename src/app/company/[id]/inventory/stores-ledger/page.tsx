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
import type { StoresLedgerRow } from '@/lib/accounting/inventoryCompute';
import type { EntityType } from '@/types/company';

function computeStoresLedger(entries: JournalEntry[], itemName: string): StoresLedgerRow[] {
  const rows: StoresLedgerRow[] = [];
  let balanceValue = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.account_name !== itemName) continue;
      const receivedValue = line.debit || 0;
      const issuedValue = line.credit || 0;
      if (receivedValue > 0 || issuedValue > 0) {
        balanceValue += receivedValue - issuedValue;
        rows.push({
          date: entry.entry_date,
          particulars: entry.narration || entry.voucher_type,
          receivedQty: 0, receivedRate: 0, receivedValue,
          issuedQty: 0, issuedRate: 0, issuedValue,
          balanceQty: 0, balanceRate: 0, balanceValue: Math.max(0, balanceValue),
        });
      }
    }
  }

  return rows;
}

function getStockItems(entries: JournalEntry[]): string[] {
  const items = new Set<string>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.account_group === 'Inventories' || line.account_group === 'Stock-in-Trade') items.add(line.account_name);
    }
  }
  return Array.from(items).sort();
}

export default function StoresLedgerPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [selectedItem, setSelectedItem] = useState('');

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const stockItems = useMemo(() => getStockItems(entries), [entries]);
  const ledger = useMemo(() => selectedItem ? computeStoresLedger(entries, selectedItem) : [], [entries, selectedItem]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Received (₹)', key: 'receivedValue', align: 'right' as const, isMono: true },
    { header: 'Issued (₹)', key: 'issuedValue', align: 'right' as const, isMono: true },
    { header: 'Balance (₹)', key: 'balanceValue', align: 'right' as const, isMono: true },
  ];

  return (
    <div>
      <PageHeader title="Stores Ledger" description="Quantity and value ledger for each stock item">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          {ledger.length > 0 && (
            <ExportButtons title={`Stores Ledger - ${selectedItem}`} companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={ledger} />
          )}
        </div>
      </PageHeader>

      <div className="mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <label className="text-sm font-medium text-gray-700 block mb-1">Select Item:</label>
        {loading ? (
          <p className="text-sm text-gray-400">Loading items...</p>
        ) : stockItems.length === 0 ? (
          <p className="text-sm text-gray-400">No stock items found. Create journal entries with Stock-in-Trade accounts.</p>
        ) : (
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select an item —</option>
            {stockItems.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
      </div>

      {selectedItem && ledger.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No movements found for {selectedItem}.</p>
        </div>
      )}

      {selectedItem && ledger.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Stores Ledger — {selectedItem}</h3>
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
                {ledger.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 text-gray-700">{r.particulars}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.receivedValue > 0 ? formatIndianCurrency(r.receivedValue) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{r.issuedValue > 0 ? formatIndianCurrency(r.issuedValue) : ''}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.balanceValue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(ledger.reduce((s, r) => s + r.receivedValue, 0))}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(ledger.reduce((s, r) => s + r.issuedValue, 0))}</td>
                  <td className="px-3 py-2 text-right font-mono">{ledger.length > 0 ? formatIndianCurrency(ledger[ledger.length - 1].balanceValue) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
