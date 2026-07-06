'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { TAccountFormat } from '@/components/formats/TAccountFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function ReceiptsPaymentsPage() {
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

  // Compute receipts and payments from Cash/Bank entries
  const { receipts, payments, openingBalance, closingBalance } = useMemo(() => {
    const cashBankNames = ['cash', 'bank', 'cash in hand', 'cash at bank', 'petty cash'];
    const receiptMap: Record<string, number> = {};
    const paymentMap: Record<string, number> = {};
    let opening = 0;

    for (const entry of entries) {
      const isCashBankEntry = entry.lines?.some((l: any) =>
        cashBankNames.some(n => l.account_name?.toLowerCase().includes(n))
      );
      if (!isCashBankEntry) continue;

      for (const line of entry.lines || []) {
        const nameLC = line.account_name?.toLowerCase() || '';
        const isCashBank = cashBankNames.some(n => nameLC.includes(n));

        if (isCashBank) {
          // Cash/Bank debit = receipt, credit = payment
          if (line.debit > 0) {
            // This is a receipt — the other side tells us what was received
          }
        } else {
          // Non cash/bank account in a cash/bank entry
          if (line.credit > 0) {
            // Credit on non-cash means it's a source of receipt
            receiptMap[line.account_name] = (receiptMap[line.account_name] || 0) + line.credit;
          }
          if (line.debit > 0) {
            // Debit on non-cash means it's a payment destination
            paymentMap[line.account_name] = (paymentMap[line.account_name] || 0) + line.debit;
          }
        }
      }
    }

    // Get opening cash balance from balances
    const balances = computeAllBalances(entries);
    const cashBalances = balances.filter(b =>
      cashBankNames.some(n => b.account_name.toLowerCase().includes(n))
    );
    const closingBal = cashBalances.reduce((s, b) => s + b.balance, 0);

    const totalReceipts = Object.values(receiptMap).reduce((s, v) => s + v, 0);
    const totalPayments = Object.values(paymentMap).reduce((s, v) => s + v, 0);

    return {
      receipts: Object.entries(receiptMap).map(([name, amount]) => ({ name, amount })),
      payments: Object.entries(paymentMap).map(([name, amount]) => ({ name, amount })),
      openingBalance: 0, // Would need previous period data
      closingBalance: closingBal,
    };
  }, [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Build T-format
  const drItems = [
    { name: 'Opening Balance (Cash & Bank)', amount: openingBalance },
    ...receipts,
  ];

  const crItems = [
    ...payments,
    { name: 'Closing Balance (Cash & Bank)', amount: closingBalance },
  ];

  const balancedTotal = Math.max(
    drItems.reduce((s, i) => s + i.amount, 0),
    crItems.reduce((s, i) => s + i.amount, 0)
  );

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...drItems.map(i => ({ side: 'Receipts', name: i.name, amount: i.amount })),
    ...crItems.map(i => ({ side: 'Payments', name: i.name, amount: i.amount })),
  ];

  return (
    <div>
      <PageHeader title="Receipts & Payments Account" description="Summary of cash receipts and payments">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Receipts & Payments" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {!loading && entries.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <p className="text-sm font-medium text-blue-700">Closing Cash & Bank Balance: {formatIndianCurrency(closingBalance)}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate the Receipts & Payments Account.</p>
        </div>
      ) : (
        <TAccountFormat
          title="Receipts & Payments Account"
          subtitle={`For the year ended ${toDate}`}
          companyName={company.name}
          leftLabel="Receipts (Dr.)"
          rightLabel="Payments (Cr.)"
          leftColumns={[
            { header: 'Particulars', key: 'name' },
            { header: 'Amount (₹)', key: 'amount', align: 'right' },
          ]}
          rightColumns={[
            { header: 'Particulars', key: 'name' },
            { header: 'Amount (₹)', key: 'amount', align: 'right' },
          ]}
          leftData={drItems}
          rightData={crItems}
          leftTotal={balancedTotal}
          rightTotal={balancedTotal}
        />
      )}
    </div>
  );
}
