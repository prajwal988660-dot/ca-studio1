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
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import type { EntityType } from '@/types/company';

export default function RevaluationPage() {
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

  // Find revaluation account transactions
  const revaluationLedger = useMemo(() => {
    // Look for any account named "Revaluation" or "Revaluation Account"
    const balances = computeAllBalances(entries);
    const revalAccount = balances.find(b =>
      b.account_name.toLowerCase().includes('revaluation')
    );
    if (!revalAccount) return null;
    return {
      accountName: revalAccount.account_name,
      ledger: computeLedger(entries, revalAccount.account_name),
      balance: revalAccount,
    };
  }, [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Build T-format from ledger entries
  const drItems: { name: string; amount: number }[] = [];
  const crItems: { name: string; amount: number }[] = [];

  if (revaluationLedger) {
    for (const row of revaluationLedger.ledger) {
      if (row.debit > 0) {
        drItems.push({ name: row.particulars, amount: row.debit });
      }
      if (row.credit > 0) {
        crItems.push({ name: row.particulars, amount: row.credit });
      }
    }

    // Add profit/loss on revaluation as balancing entry
    const totalDr = drItems.reduce((s, i) => s + i.amount, 0);
    const totalCr = crItems.reduce((s, i) => s + i.amount, 0);
    const diff = totalCr - totalDr;

    if (diff > 0) {
      drItems.push({ name: 'Profit on Revaluation (to Partners\' Capital in old ratio)', amount: diff });
    } else if (diff < 0) {
      crItems.push({ name: 'Loss on Revaluation (to Partners\' Capital in old ratio)', amount: Math.abs(diff) });
    }
  }

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
    ...drItems.map(i => ({ side: 'Dr', name: i.name, amount: i.amount })),
    ...crItems.map(i => ({ side: 'Cr', name: i.name, amount: i.amount })),
  ];

  return (
    <div>
      <PageHeader title="Revaluation Account" description="Asset & liability revaluation on reconstitution">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Revaluation Account" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {!loading && revaluationLedger && (
        <div className={`${
          drItems.find(i => i.name.includes('Profit'))
            ? 'tally-ok'
            : crItems.find(i => i.name.includes('Loss'))
            ? 'tally-err'
            : 'mb-4 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {drItems.find(i => i.name.includes('Profit'))
            ? `Profit on Revaluation: ${formatIndianCurrency(drItems.find(i => i.name.includes('Profit'))!.amount)}`
            : crItems.find(i => i.name.includes('Loss'))
            ? `Loss on Revaluation: ${formatIndianCurrency(crItems.find(i => i.name.includes('Loss'))!.amount)}`
            : 'Revaluation Account — No net gain or loss'}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !revaluationLedger || drItems.length === 0 && crItems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No revaluation entries found. Create journal entries with a Revaluation Account to see this statement.</p>
          <p className="text-xs text-gray-400 mt-2">Revaluation Account is prepared when reconstitution happens — admission, retirement, death, or change in PSR.</p>
        </div>
      ) : (
        <TAccountFormat
          title="Revaluation Account"
          subtitle={`For the period ${fromDate} to ${toDate}`}
          companyName={company.name}
          leftLabel="Dr."
          rightLabel="Cr."
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
