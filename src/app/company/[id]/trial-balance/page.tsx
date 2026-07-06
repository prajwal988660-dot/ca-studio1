'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { RegisterFormat } from '@/components/formats/RegisterFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeTrialBalance } from '@/lib/accounting/trialBalanceCompute';
import type { EntityType } from '@/types/company';
import { listJournalEntries } from '@/lib/offlineDb';

export default function TrialBalancePage() {
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

  const trialBalance = useMemo(() => computeTrialBalance(entries), [entries]);

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
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Trial balance format: Particulars, L.F., Dr. Amount, Cr. Amount
  const columns = [
    { header: 'Particulars', key: 'account_name', width: 'w-[55%]' },
    { header: 'L.F.', key: 'lf', width: 'w-16', align: 'center' as const },
    { header: 'Dr. Amount (₹)', key: 'debit_balance', width: 'w-[20%]', align: 'right' as const, isMono: true },
    { header: 'Cr. Amount (₹)', key: 'credit_balance', width: 'w-[20%]', align: 'right' as const, isMono: true },
  ];

  // Use serial number as a simple, stable Ledger Folio reference for now.
  // This makes the L.F. column meaningful and consistent across reports.
  const tableData = trialBalance.rows.map(r => ({
    account_name: r.account_name,
    lf: String(r.sno),
    debit_balance: r.debit_balance || '',
    credit_balance: r.credit_balance || '',
  }));

  const totals = {
    debit_balance: trialBalance.totalDebit,
    credit_balance: trialBalance.totalCredit,
  };

  return (
    <div>
      <PageHeader title="Trial Balance" description="Statement of all account balances">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
            allRange={allRange}
          />
          <ExportButtons title="Trial Balance" companyName={company.name} entityType={entityLabel} dateRange={`As at ${toDate}`} columns={columns} data={tableData} />
        </div>
      </PageHeader>

      {/* Tally indicator */}
      {!loading && entries.length > 0 && (
        <div className={trialBalance.tallies ? 'tally-ok' : 'tally-err'}>
          {trialBalance.tallies
            ? '✓ Trial Balance tallies — Debit total equals Credit total.'
            : `⚠ Trial Balance does NOT tally — Difference: ₹${Math.abs(trialBalance.totalDebit - trialBalance.totalCredit).toFixed(2)}`}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <RegisterFormat
          title="Trial Balance"
          subtitle={`As at ${toDate}`}
          companyName={company.name}
          columns={columns}
          data={tableData}
          totals={totals}
          emptyMessage="No accounts to display. Create journal entries first."
          linkColumnKey="account_name"
          getRowHref={(row) =>
            `/company/${companyId}/ledger?account=${encodeURIComponent(row.account_name)}&view=tformat`
          }
        />
      )}
    </div>
  );
}
