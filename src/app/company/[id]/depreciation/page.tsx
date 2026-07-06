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
import { computeDepreciation } from '@/lib/accounting/depreciationCompute';
import type { EntityType } from '@/types/company';

export default function DepreciationPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [method, setMethod] = useState<'SLM' | 'WDV'>('WDV');
  const [showNewEntry, setShowNewEntry] = useState(false);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const depreciation = useMemo(() => computeDepreciation(entries, method), [entries, method]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const totalDepreciation = depreciation.reduce((s, r) => s + r.depreciationAmount, 0);
  const totalWDV = depreciation.reduce((s, r) => s + r.wdv, 0);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Asset Name', key: 'assetName' },
    { header: 'Gross Value (₹)', key: 'grossValue', align: 'right' as const, isMono: true },
    { header: 'Rate (%)', key: 'rate', align: 'right' as const },
    { header: 'Depreciation (₹)', key: 'depreciationAmount', align: 'right' as const, isMono: true },
    { header: 'Acc. Dep (₹)', key: 'accumulatedDepreciation', align: 'right' as const, isMono: true },
    { header: 'WDV (₹)', key: 'wdv', align: 'right' as const, isMono: true },
  ];

  const data = depreciation.map((r, i) => ({
    sno: i + 1,
    ...r,
  }));

  return (
    <div>
      <PageHeader title="Depreciation Schedule" description="Asset depreciation computation">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {(['SLM', 'WDV'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 text-sm ${method === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {m === 'SLM' ? 'Straight Line' : 'Written Down Value'}
              </button>
            ))}
          </div>
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons title="Depreciation Schedule" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
          </div>
        </div>
      </PageHeader>

      {!loading && depreciation.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Depreciation ({method})</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalDepreciation)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total WDV after Depreciation</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalWDV)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : depreciation.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No fixed assets found. Create journal entries with Fixed Asset accounts to compute depreciation.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Depreciation Schedule — {method === 'SLM' ? 'Straight Line Method' : 'Written Down Value Method'}</h3>
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
                {depreciation.map((r, i) => (
                  <tr key={r.assetName} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.assetName}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.grossValue)}</td>
                    <td className="px-3 py-2 text-right">{r.rate}%</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.depreciationAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(r.accumulatedDepreciation)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(r.wdv)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={4}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalDepreciation)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalWDV)}</td>
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
