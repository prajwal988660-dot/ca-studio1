'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

export default function PettyCashPage() {
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

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Filter petty cash entries (where Petty Cash A/c appears)
  const pettyCashEntries = entries.filter(e =>
    e.lines.some(l =>
      l.account_name.toLowerCase().includes('petty cash')
    )
  );

  const tableData = pettyCashEntries.map(e => {
    const pettyCashLine = e.lines.find(l => l.account_name.toLowerCase().includes('petty cash'));
    const otherLines = e.lines.filter(l => !l.account_name.toLowerCase().includes('petty cash'));
    const isReceipt = pettyCashLine && (pettyCashLine.debit || 0) > 0;

    return {
      date: e.entry_date,
      particulars: otherLines.map(l => l.account_name).join(', '),
      voucher_type: e.voucher_type,
      received: isReceipt ? pettyCashLine?.debit || 0 : 0,
      spent: !isReceipt ? pettyCashLine?.credit || 0 : 0,
      narration: e.narration,
    };
  });

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Type', key: 'voucher_type', align: 'center' as const },
    { header: 'Received (₹)', key: 'received', align: 'right' as const, isMono: true },
    { header: 'Spent (₹)', key: 'spent', align: 'right' as const, isMono: true },
    { header: 'Narration', key: 'narration' },
  ];

  const totals = {
    received: tableData.reduce((s, r) => s + r.received, 0),
    spent: tableData.reduce((s, r) => s + r.spent, 0),
  };

  return (
    <div>
      <PageHeader title="Petty Cash Book" description="Imprest system petty cash transactions">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(from, to) => { setFromDate(from); setToDate(to); }}
          />
          <ExportButtons
            title="Petty Cash Book"
            companyName={company.name}
            entityType={entityLabel}
            dateRange={`${fromDate} to ${toDate}`}
            columns={columns}
            data={tableData}
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RegisterFormat
          title="Petty Cash Book"
          subtitle={`${fromDate} to ${toDate}`}
          companyName={company.name}
          columns={columns}
          data={tableData}
          totals={totals}
          emptyMessage="No petty cash transactions found for this period."
        />
      )}
    </div>
  );
}
