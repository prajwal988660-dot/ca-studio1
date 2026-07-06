'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { TAccountFormat } from '@/components/formats/TAccountFormat';
import { VerticalStatementFormat } from '@/components/formats/VerticalStatementFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { getEntityConfig } from '@/lib/entityConfig';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { computeBalanceSheet, computeScheduleIIIBalanceSheet } from '@/lib/accounting/balanceSheetCompute';
import { BsNotesDrawer } from '@/components/financials/BsNotesDrawer';
import type { EntityType } from '@/types/company';
import { listJournalEntries } from '@/lib/offlineDb';

/** Maps each BS Schedule III label → scheduleIII group strings for the notes drawer */
const BS_NOTE_GROUPS: Record<string, string[]> = {
  'Share Capital':                      ['Share Capital'],
  'Reserves and Surplus':               ['Reserves & Surplus'],
  'Money received against share warrants': ['Money received against share warrants'],
  'Long-term Borrowings':               ['Long-term Borrowings'],
  'Deferred Tax Liabilities (Net)':     ['Deferred Tax Liability'],
  'Other Long-term Liabilities':        ['Other Long-term Liabilities'],
  'Long-term Provisions':               ['Long-term Provisions'],
  'Short-term Borrowings':              ['Short-term Borrowings'],
  'Trade Payables':                     ['Trade Payables'],
  'Other Current Liabilities':          ['Other Current Liabilities', 'Statutory Liabilities', 'GST — Output Tax', 'GST — RCM', 'GST — Advances'],
  'Short-term Provisions':              ['Short-term Provisions'],
  'Tangible Assets':                    ['Tangible Fixed Assets', 'Accumulated Depreciation'],
  'Intangible Assets':                  ['Intangible Assets', 'Accumulated Amortisation'],
  'Capital Work in Progress':           ['Capital Work in Progress'],
  'Deferred Tax Assets (Net)':          ['Deferred Tax Asset'],
  'Non-current Investments':            ['Non-current Investments'],
  'Long-term Loans and Advances':       ['Long-term Loans & Advances'],
  'Other Non-current Assets':           ['Other Non-current Assets'],
  'Current Investments':                ['Current Investments'],
  'Inventories':                        ['Inventories'],
  'Trade Receivables':                  ['Trade Receivables'],
  'Cash and Cash Equivalents':          ['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents'],
  'Short-term Loans and Advances':      ['Short-term Loans & Advances'],
  'Other Current Assets':               ['Other Current Assets', 'GST — Input Tax Credit', 'GST — Refund', 'GST — Reconciliation', 'GST — Legacy'],
};

/** Subtract 1 year from a YYYY-MM-DD date string */
function subtractOneYear(date: string): string {
  return `${parseInt(date.slice(0, 4)) - 1}${date.slice(4)}`;
}

export default function BalanceSheetPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  // Previous year date range (1 FY prior)
  const prevFromDate = subtractOneYear(fromDate);
  const prevToDate = subtractOneYear(toDate);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  // Previous year entries (for Balance Sheet prior-year column)
  const { entries: prevEntries } = useJournalEntries({
    companyId: companyId || '',
    fromDate: prevFromDate,
    toDate: prevToDate,
    enabled: !!companyId,
  });

  const tradingAccount = useMemo(() => computeTradingAccount(entries), [entries]);
  const profitLoss = useMemo(() => computeProfitLoss(entries, tradingAccount.grossProfit), [entries, tradingAccount.grossProfit]);

  // Previous year profit (for balance sheet retained earnings)
  const prevTradingAccount = useMemo(() => computeTradingAccount(prevEntries), [prevEntries]);
  const prevProfitLoss = useMemo(() => computeProfitLoss(prevEntries, prevTradingAccount.grossProfit), [prevEntries, prevTradingAccount.grossProfit]);

  const allRange = useMemo(() => {
    if (!companyId) return null;
    const all = listJournalEntries(companyId);
    if (!all.length) return null;
    const dates = all.map((e) => e.entry_date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
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
  const entityConfig = getEntityConfig(company.entity_type);
  const isScheduleIII = entityConfig.nav.balanceSheetFormat === 'schedule_iii';

  return (
    <div>
      <PageHeader title="Balance Sheet" description={isScheduleIII ? 'Balance Sheet (Schedule III)' : 'Traditional Balance Sheet'}>
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : isScheduleIII ? (
        <ScheduleIIIView
          companyId={companyId || ''}
          entries={entries}
          netProfit={profitLoss.netProfit}
          prevEntries={prevEntries}
          prevNetProfit={prevProfitLoss.netProfit}
          company={company}
          toDate={toDate}
          prevToDate={prevToDate}
          entityLabel={entityLabel}
        />
      ) : (
        <TraditionalView
          entries={entries}
          netProfit={profitLoss.netProfit}
          company={company}
          fromDate={fromDate}
          toDate={toDate}
          entityLabel={entityLabel}
        />
      )}
    </div>
  );
}

// Traditional T-format Balance Sheet (Liabilities | Assets)
function TraditionalView({
  entries,
  netProfit,
  company,
  fromDate,
  toDate,
  entityLabel,
}: {
  entries: any[];
  netProfit: number;
  company: any;
  fromDate: string;
  toDate: string;
  entityLabel: string;
}) {
  const bs = useMemo(() => computeBalanceSheet(entries, netProfit, 'traditional'), [entries, netProfit]);

  const leftColumns = [
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const },
  ];

  const rightColumns = [
    { header: 'Particulars', key: 'name' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const },
  ];

  const exportColumns = [
    { header: 'Side', key: 'side' },
    { header: 'Particulars', key: 'name' },
    { header: 'Group', key: 'group' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...bs.liabilities.map(i => ({ side: 'Liabilities', name: i.name, group: i.group, amount: i.amount })),
    ...bs.assets.map(i => ({ side: 'Assets', name: i.name, group: i.group, amount: i.amount })),
  ];

  const balancedTotal = Math.max(bs.totalLiabilities, bs.totalAssets);

  return (
    <>
      {entries.length > 0 && (
        <div className={
          bs.balanced
             ? "tally-ok" : "tally-err"}>
          {bs.balanced
            ? 'Balance Sheet is balanced — Liabilities equal Assets.'
            : `Balance Sheet does NOT balance — Difference: ${formatIndianCurrency(Math.abs(bs.totalLiabilities - bs.totalAssets))}`}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <ExportButtons title="Balance Sheet" companyName={company.name} entityType={entityLabel} dateRange={`As at ${toDate}`} columns={exportColumns} data={exportData} />
      </div>

      <TAccountFormat
        title="Balance Sheet"
        subtitle={`As at ${toDate}`}
        companyName={company.name}
        leftLabel="Liabilities"
        rightLabel="Assets"
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        leftData={bs.liabilities}
        rightData={bs.assets}
        leftTotal={balancedTotal}
        rightTotal={balancedTotal}
      />
    </>
  );
}

// Schedule III Vertical Balance Sheet with Previous Year column
function ScheduleIIIView({
  companyId,
  entries,
  netProfit,
  prevEntries,
  prevNetProfit,
  company,
  toDate,
  prevToDate,
  entityLabel,
}: {
  companyId: string;
  entries: any[];
  netProfit: number;
  prevEntries: any[];
  prevNetProfit: number;
  company: any;
  toDate: string;
  prevToDate: string;
  entityLabel: string;
}) {
  const [openNote, setOpenNote] = useState<{ label: string; groups: string[] } | null>(null);

  const handleItemClick = (label: string) => {
    const groups = BS_NOTE_GROUPS[label];
    if (groups) setOpenNote({ label, groups });
  };

  const bs = useMemo(
    () => computeScheduleIIIBalanceSheet(entries, netProfit, prevEntries),
    [entries, netProfit, prevEntries],
  );

  const exportColumns = [
    { header: 'Section', key: 'section' },
    { header: 'Particulars', key: 'label' },
    { header: 'Note', key: 'noteRef' },
    { header: 'Current Year (₹)', key: 'currentYear', align: 'right' as const, isMono: true },
    { header: 'Previous Year (₹)', key: 'previousYear', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...bs.equityAndLiabilities.flatMap(sec =>
      sec.subheadings.map(sh => ({ section: sec.heading, label: sh.label, noteRef: sh.noteRef || '', currentYear: sh.currentYear, previousYear: sh.previousYear }))
    ),
    ...bs.assets.flatMap(sec =>
      sec.subheadings.map(sh => ({ section: sec.heading, label: sh.label, noteRef: sh.noteRef || '', currentYear: sh.currentYear, previousYear: sh.previousYear }))
    ),
  ];

  // Compute previous year section totals from subheading previousYear values
  const sections = [
    ...bs.equityAndLiabilities.map(sec => {
      const prevTotal = sec.subheadings.reduce((s, sh) => s + sh.previousYear, 0);
      return {
        heading: sec.heading,
        indent: 1,
        items: [
          ...sec.subheadings.map(sh => ({
            label: sh.label,
            noteNo: sh.noteRef,
            currentYear: sh.currentYear,
            previousYear: sh.previousYear,
            indent: 1,
          })),
          {
            label: `Total ${sec.heading}`,
            currentYear: sec.total,
            previousYear: prevTotal,
            isBold: true,
            isTotal: true,
          },
        ],
      };
    }),
    {
      heading: 'TOTAL EQUITY AND LIABILITIES',
      indent: 0,
      items: [{
        label: 'Total',
        currentYear: bs.totalEquityLiabilities,
        previousYear: bs.equityAndLiabilities.reduce(
          (sum, sec) => sum + sec.subheadings.reduce((s, sh) => s + sh.previousYear, 0), 0,
        ),
        isBold: true,
        isTotal: true,
      }],
    },
    ...bs.assets.map(sec => {
      const prevTotal = sec.subheadings.reduce((s, sh) => s + sh.previousYear, 0);
      return {
        heading: sec.heading,
        indent: 1,
        items: [
          ...sec.subheadings.map(sh => ({
            label: sh.label,
            noteNo: sh.noteRef,
            currentYear: sh.currentYear,
            previousYear: sh.previousYear,
            indent: 1,
          })),
          {
            label: `Total ${sec.heading}`,
            currentYear: sec.total,
            previousYear: prevTotal,
            isBold: true,
            isTotal: true,
          },
        ],
      };
    }),
    {
      heading: 'TOTAL ASSETS',
      indent: 0,
      items: [{
        label: 'Total',
        currentYear: bs.totalAssets,
        previousYear: bs.assets.reduce(
          (sum, sec) => sum + sec.subheadings.reduce((s, sh) => s + sh.previousYear, 0), 0,
        ),
        isBold: true,
        isTotal: true,
      }],
    },
  ];

  return (
    <>
      {entries.length > 0 && (
        <div className={
          Math.abs(bs.totalEquityLiabilities - bs.totalAssets) < 0.01
             ? "tally-ok" : "tally-err"}>
          {Math.abs(bs.totalEquityLiabilities - bs.totalAssets) < 0.01
            ? 'Balance Sheet is balanced — Equity & Liabilities equal Assets.'
            : `Balance Sheet does NOT balance — Difference: ${formatIndianCurrency(Math.abs(bs.totalEquityLiabilities - bs.totalAssets))}`}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <ExportButtons title="Balance Sheet (Schedule III)" companyName={company.name} entityType={entityLabel} dateRange={`As at ${toDate}`} columns={exportColumns} data={exportData} />
      </div>

      <VerticalStatementFormat
        title="Balance Sheet"
        companyName={company.name}
        period={`As at ${toDate}`}
        sections={sections}
        showPreviousYear={true}
        signatureBlock={true}
        onItemClick={handleItemClick}
      />

      {openNote && (
        <BsNotesDrawer
          companyId={companyId}
          label={openNote.label}
          groups={openNote.groups}
          entries={entries}
          onClose={() => setOpenNote(null)}
        />
      )}
    </>
  );
}
