'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useComputedData } from '@/hooks/useComputedData';
import { PageHeader } from '@/components/layout/PageHeader';
import { CashBookFormat } from '@/components/formats/CashBookFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { exportElementAsImagePDF } from '@/components/export/exportUtils';
import { ManualEntryDialog } from '@/components/entries/ManualEntryDialog';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { listJournalEntries } from '@/lib/offlineDb';

export default function CashBookPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [cbType, setCbType] = useState<'single' | 'double' | 'triple'>('double');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  const { entries, loading, createEntry } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const computed = useComputedData(entries);

  const allRange = useMemo(() => {
    if (!companyId) return null;
    const all = listJournalEntries(companyId);
    if (!all.length) return null;
    return { from: all[0].entry_date, to: all[all.length - 1].entry_date };
  }, [companyId, entries]);

  // Auto-expand date range so entries outside default FY are visible
  const rangeExpanded = useRef(false);
  useEffect(() => {
    if (!allRange || rangeExpanded.current) return;
    let changed = false;
    if (allRange.from < fromDate) { setFromDate(allRange.from); changed = true; }
    if (allRange.to > toDate) { setToDate(allRange.to); changed = true; }
    if (changed) rangeExpanded.current = true;
  }, [allRange, fromDate, toDate]);

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const cashBook = computed.getCashBook(cbType);

  const exportData = [
    ...cashBook.receipts.map((r: Record<string, unknown>) => ({
      ...r,
      side: 'Receipt',
      // Include JE code inside the Date column for downloads.
      date: `${String((r as any).date ?? '')} (${String((r as any).entry_code ?? '')})`,
    })),
    ...cashBook.payments.map((p: Record<string, unknown>) => ({
      ...p,
      side: 'Payment',
      // Include JE code inside the Date column for downloads.
      date: `${String((p as any).date ?? '')} (${String((p as any).entry_code ?? '')})`,
    })),
  ];

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Cash (₹)', key: 'cashAmount', align: 'right' as const },
    { header: 'Bank (₹)', key: 'bankAmount', align: 'right' as const },
  ];

  const handleSave = async (entry: Parameters<typeof createEntry>[0]) => {
    const created = await createEntry(entry);
    // Expand the viewed period so the new entry is visible
    if (entry.entry_date < fromDate) setFromDate(entry.entry_date);
    if (entry.entry_date > toDate) setToDate(entry.entry_date);
    return created;
  };

  return (
    <div>
      <PageHeader title="Cash Book" description="Cash and bank transactions">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(from, to) => { setFromDate(from); setToDate(to); }}
            allRange={allRange}
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
            <ExportButtons
              title="Cash Book"
              companyName={company.name}
              entityType={entityLabel}
              dateRange={`${fromDate} to ${toDate}`}
              columns={exportColumns}
              data={exportData}
              pdfOrientation="landscape"
              onPdf={() =>
                exportElementAsImagePDF({
                  element: printRef.current,
                  title: 'Cash Book',
                  orientation: 'landscape',
                })
              }
            />
          </div>
        </div>
      </PageHeader>

      <div className="flex items-center gap-1 mb-4">
        {(['single', 'double', 'triple'] as const).map(t => (
          <button
            key={t}
            onClick={() => setCbType(t)}
            className={`h-7 px-3 text-xs font-semibold rounded-lg border transition-all ${
              cbType === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t === 'single' ? 'Single Column' : t === 'double' ? 'Double Column' : 'Triple Column'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cashBook.receipts.length === 0 && cashBook.payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No cash/bank transactions found for this period.</p>
        </div>
      ) : (
        <div ref={printRef}>
          <CashBookFormat
            type={cbType}
            companyName={company.name}
            period={`${fromDate} to ${toDate}`}
            fromDate={fromDate}
            toDate={toDate}
            receipts={cashBook.receipts}
            payments={cashBook.payments}
            openingCash={cashBook.openingCash}
            openingBank={cashBook.openingBank}
            closingCash={cashBook.closingCash}
            closingBank={cashBook.closingBank}
            totalDiscountAllowed={cashBook.totalDiscountAllowed}
            totalDiscountReceived={cashBook.totalDiscountReceived}
          />
        </div>
      )}

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={handleSave}
        defaultVoucherType="Receipt"
      />
    </div>
  );
}
