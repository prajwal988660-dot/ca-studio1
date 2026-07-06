'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { CashFlowAs3Format } from '@/components/formats/CashFlowAs3Format';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeCashFlow } from '@/lib/accounting/cashFlowCompute';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import type { EntityType } from '@/types/company';

const inr = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CashFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const initialFormat =
    (searchParams.get('method') as 'direct' | 'indirect' | null) ?? 'indirect';
  const [format, setFormat] = useState<'direct' | 'indirect'>(initialFormat);
  const [bankView, setBankView] = useState(''); // '' = All Bank/Cash (AS-3); else a specific account

  useEffect(() => {
    const urlFormat = (searchParams.get('method') as 'direct' | 'indirect' | null) ?? 'indirect';
    setFormat(urlFormat);
  }, [searchParams]);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const tradingAccount = useMemo(() => computeTradingAccount(entries), [entries]);
  const profitLoss = useMemo(() => computeProfitLoss(entries, tradingAccount.grossProfit), [entries, tradingAccount.grossProfit]);
  const cashFlow = useMemo(() => computeCashFlow(entries, profitLoss.netProfit), [entries, profitLoss.netProfit]);

  // Bank/cash accounts for the per-account selector (Note 2)
  const bankAccounts = useMemo(
    () => computeAllBalances(entries)
      .filter((b) => /bank|cash/.test((b.account_group + ' ' + b.account_name).toLowerCase()))
      .map((b) => b.account_name)
      .sort((a, b) => a.localeCompare(b)),
    [entries],
  );
  const bankLedger = useMemo(() => (bankView ? computeLedger(entries, bankView) : []), [entries, bankView]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const as3Rows = useMemo(() => {
    const r: Parameters<typeof CashFlowAs3Format>[0]['rows'] = [];
    if (format === 'direct') {
      // Presentation-only: direct method headings as per AS 3 format.
      r.push({ label: 'A. CASH FLOWS FROM OPERATING ACTIVITIES', isHeading: true });
      r.push({ label: 'Cash receipts from customers / sale of goods & services', subAmount: null, total: null });
      r.push({ label: 'Cash receipts from royalties, fees, commissions, etc.', subAmount: null, total: null });
      r.push({ label: 'Cash paid to suppliers for goods and services', subAmount: null, total: null });
      r.push({ label: 'Cash paid to and on behalf of employees', subAmount: null, total: null });
      r.push({ label: 'Cash generated from operations', total: cashFlow.operating.total, isBold: true });
      r.push({ label: 'Income taxes paid (net of refunds)', total: null });
      r.push({ label: 'NET CASH FROM / (USED IN) OPERATING ACTIVITIES (A)', total: cashFlow.operating.total, isBold: true });
    } else {
      r.push({ label: 'A. CASH FLOWS FROM OPERATING ACTIVITIES', isHeading: true });
      const netProfitRow = cashFlow.operating.items.find(i => i.label.toLowerCase().includes('net profit'));
      r.push({
        label: 'Net Profit / (Loss) before Tax and Extraordinary Items',
        total: netProfitRow?.amount ?? profitLoss.netProfit,
        isBold: true,
      });
      r.push({ label: 'Adjustments for non-cash / non-operating items:', isHeading: false, isBold: true });
      for (const it of cashFlow.operating.items) {
        if (it.label.toLowerCase().includes('net profit')) continue;
        r.push({ label: it.label, subAmount: it.amount });
      }
      r.push({ label: 'Cash Generated from Operations', total: cashFlow.operating.total, isBold: true });
      r.push({ label: 'NET CASH FROM / (USED IN) OPERATING ACTIVITIES (A)', total: cashFlow.operating.total, isBold: true });
    }

    r.push({ label: '', isHeading: false });
    r.push({ label: 'B. CASH FLOWS FROM INVESTING ACTIVITIES', isHeading: true });
    for (const it of cashFlow.investing.items) r.push({ label: it.label, subAmount: it.amount });
    r.push({ label: 'NET CASH FROM / (USED IN) INVESTING ACTIVITIES (B)', total: cashFlow.investing.total, isBold: true });

    r.push({ label: '', isHeading: false });
    r.push({ label: 'C. CASH FLOWS FROM FINANCING ACTIVITIES', isHeading: true });
    for (const it of cashFlow.financing.items) r.push({ label: it.label, subAmount: it.amount });
    r.push({ label: 'NET CASH FROM / (USED IN) FINANCING ACTIVITIES (C)', total: cashFlow.financing.total, isBold: true });

    r.push({ label: '', isHeading: false });
    r.push({ label: 'NET CHANGE IN CASH & CASH EQUIVALENTS (A+B+C)', total: cashFlow.netChange, isBold: true });
    r.push({ label: 'Net increase / (decrease) in Cash & Cash Equivalents', total: cashFlow.netChange, isBold: true });
    r.push({ label: 'Cash & Cash Equivalents — Opening Balance', total: cashFlow.openingCash });
    r.push({ label: 'CASH & CASH EQUIVALENTS — CLOSING BALANCE', total: cashFlow.closingCash, isBold: true });
    return r;
  }, [cashFlow, format, profitLoss.netProfit]);

  // Export reflects what's on screen: the per-account ledger when a bank is selected, else the AS-3 statement.
  const exportColumns = bankView
    ? [
        { header: 'Date', key: 'date' },
        { header: 'Particulars', key: 'particulars' },
        { header: 'Voucher', key: 'voucher_type' },
        { header: 'Inflow (₹)', key: 'debit', align: 'right' as const, isMono: true },
        { header: 'Outflow (₹)', key: 'credit', align: 'right' as const, isMono: true },
        { header: 'Balance (₹)', key: 'balance', align: 'right' as const, isMono: true },
      ]
    : [
        { header: 'Section', key: 'section' },
        { header: 'Particulars', key: 'label' },
        { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
      ];

  const exportData = bankView
    ? bankLedger.map((r) => ({ date: r.date, particulars: r.particulars, voucher_type: r.voucher_type, debit: r.debit, credit: r.credit, balance: r.running_balance }))
    : [
        ...cashFlow.operating.items.map(i => ({ section: 'Operating', label: i.label, amount: i.amount })),
        { section: 'Operating', label: 'Net Cash from Operating Activities', amount: cashFlow.operating.total },
        ...cashFlow.investing.items.map(i => ({ section: 'Investing', label: i.label, amount: i.amount })),
        { section: 'Investing', label: 'Net Cash from Investing Activities', amount: cashFlow.investing.total },
        ...cashFlow.financing.items.map(i => ({ section: 'Financing', label: i.label, amount: i.amount })),
        { section: 'Financing', label: 'Net Cash from Financing Activities', amount: cashFlow.financing.total },
        { section: 'Summary', label: 'Net Change in Cash', amount: cashFlow.netChange },
        { section: 'Summary', label: 'Opening Cash', amount: cashFlow.openingCash },
        { section: 'Summary', label: 'Closing Cash', amount: cashFlow.closingCash },
      ];

  return (
    <div>
      <PageHeader title="Cash Flow Statement" description="Cash flows from Operating, Investing & Financing activities">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <div className="flex items-center gap-2">
            <select value={bankView} onChange={(e) => setBankView(e.target.value)}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">All Bank / Cash</option>
              {bankAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className={`flex border border-gray-200 rounded-xl overflow-hidden text-xs ${bankView ? 'opacity-40 pointer-events-none' : ''}`}>
              {(['direct', 'indirect'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setFormat(m);
                    const next = new URLSearchParams(searchParams);
                    next.set('method', m);
                    setSearchParams(next);
                  }}
                  className={`px-3 py-1.5 ${
                    format === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m === 'direct' ? 'Format A – Direct' : 'Format B – Indirect'}
                </button>
              ))}
            </div>
          <ExportButtons title={bankView ? `${bankView} — Transactions` : 'Cash Flow Statement'} companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No entries found. Create journal entries to generate a Cash Flow Statement.</p>
        </div>
      ) : bankView ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-bold text-gray-800">{bankView} — Transactions</h3>
            <span className="text-[11px] text-gray-400">{fromDate} to {toDate}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Particulars</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Voucher</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Inflow (Dr)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Outflow (Cr)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</th>
                </tr>
              </thead>
              <tbody>
                {bankLedger.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No transactions for this account in the period.</td></tr>
                ) : bankLedger.map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-600">{r.date}</td>
                    <td className="px-4 py-2 text-[11px] text-gray-700 max-w-[260px] truncate">{r.particulars}</td>
                    <td className="px-4 py-2 text-[11px] text-gray-500">{r.voucher_type}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.debit ? inr(r.debit) : '-'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.credit ? inr(r.credit) : '-'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-gray-800">{inr(r.running_balance)} {r.balance_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CashFlowAs3Format
          companyName={company.name}
          period={`For the year ended ${toDate}`}
          methodLabel={format === 'direct' ? 'Direct Method' : 'Indirect Method'}
          rows={as3Rows}
          schedule={{
            title: 'SCHEDULE — Components of Cash & Cash Equivalents',
            items: [
              { label: 'Cash on hand', currentYear: cashFlow.cashComponents?.cashOnHand ?? 0, previousYear: null },
              { label: 'Balances with banks', currentYear: cashFlow.cashComponents?.bankBalances ?? 0, previousYear: null },
              { label: 'TOTAL Cash & Cash Equivalents', currentYear: cashFlow.closingCash, previousYear: null },
            ],
          }}
        />
      )}
    </div>
  );
}
