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
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function PLAppropriationPage() {
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

  const tradingAccount = useMemo(() => computeTradingAccount(entries), [entries]);
  const profitLoss = useMemo(() => computeProfitLoss(entries, tradingAccount.grossProfit), [entries, tradingAccount.grossProfit]);
  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const netProfit = profitLoss.netProfit;

  // Build appropriation items from journal entries
  // Dr side: Interest on Capital, Salary, Commission, Transfer to Reserve, Profit distribution
  // Cr side: Net Profit b/d, Interest on Drawings
  const drItems: { name: string; amount: number }[] = [];
  const crItems: { name: string; amount: number }[] = [];

  // Net Profit transferred from P&L
  if (netProfit > 0) {
    crItems.push({ name: 'Net Profit b/d (from P&L)', amount: netProfit });
  } else if (netProfit < 0) {
    drItems.push({ name: 'Net Loss b/d (from P&L)', amount: Math.abs(netProfit) });
  }

  // Find appropriation-related accounts from balances (signed: Dr items = debit balance, Cr items = credit balance)
  for (const b of balances) {
    const group = b.account_group.toLowerCase();
    const name = b.account_name.toLowerCase();
    const drAmount = b.balance_type === 'Dr' ? b.balance : -b.balance;
    const crAmount = b.balance_type === 'Cr' ? b.balance : -b.balance;

    if (group.includes('interest on capital') || name.includes('interest on capital')) {
      drItems.push({ name: b.account_name, amount: drAmount });
    } else if (group.includes('partner') && (name.includes('salary') || group.includes('salary'))) {
      drItems.push({ name: b.account_name, amount: drAmount });
    } else if (group.includes('commission') || name.includes('commission')) {
      drItems.push({ name: b.account_name, amount: drAmount });
    } else if (name.includes('reserve') && !name.includes('revaluation')) {
      drItems.push({ name: `Transfer to ${b.account_name}`, amount: drAmount });
    } else if (group.includes('interest on drawings') || name.includes('interest on drawings')) {
      crItems.push({ name: b.account_name, amount: crAmount });
    }
  }

  // Remaining profit distributed in PSR (balancing)
  const totalDr = drItems.reduce((s, i) => s + i.amount, 0);
  const totalCr = crItems.reduce((s, i) => s + i.amount, 0);
  const distributable = totalCr - totalDr;

  if (distributable > 0) {
    // Find partner capital/current accounts to show distribution
    const partnerAccounts = balances.filter(b =>
      (b.account_group === 'Share Capital' || b.account_group === 'Partners Capital' || b.account_group === 'Capital Account') &&
      b.account_name.toLowerCase().includes('capital')
    );
    if (partnerAccounts.length > 0) {
      const perPartner = distributable / partnerAccounts.length;
      partnerAccounts.forEach(p => {
        drItems.push({ name: `Profit Share — ${p.account_name.replace(/capital/i, '').trim()}`, amount: perPartner });
      });
    } else {
      drItems.push({ name: 'Profit Distributed (in PSR)', amount: distributable });
    }
  } else if (distributable < 0) {
    crItems.push({ name: 'Balance carried forward', amount: Math.abs(distributable) });
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
      <PageHeader title="P&L Appropriation Account" description="Distribution of profit among partners">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="P&L Appropriation" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
        </div>
      </PageHeader>

      {!loading && entries.length > 0 && (
        <div className={
          netProfit >= 0
             ? "tally-ok" : "tally-err"}>
          {netProfit >= 0
            ? `Net Profit for Appropriation: ${formatIndianCurrency(netProfit)}`
            : `Net Loss: ${formatIndianCurrency(Math.abs(netProfit))}`}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <TAccountFormat
          title="Profit & Loss Appropriation Account"
          subtitle={`For the period ${fromDate} to ${toDate}`}
          companyName={company.name}
          leftLabel="Dr. (Appropriations)"
          rightLabel="Cr. (Sources)"
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
