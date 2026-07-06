 'use client';

import { useState, useMemo, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { exportElementAsImagePDF } from '@/components/export/exportUtils';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { computeDebtorAgeing, computeCreditorAgeing, computeCWIPAgeing } from '@/lib/accounting/ageingCompute';
import { getContingentItems } from '@/lib/contingentLiabilitiesStore';
import { Link } from 'react-router-dom';

interface NoteDefinition {
  noteNo: string;
  title: string;
  groups: string[];
}

const NOTES: NoteDefinition[] = [
  { noteNo: '1', title: 'Share Capital', groups: ['Share Capital'] },
  { noteNo: '2', title: 'Reserves and Surplus', groups: ['Reserves & Surplus'] },
  { noteNo: '3', title: 'Long-term Borrowings', groups: ['Long-term Borrowings'] },
  { noteNo: '4', title: 'Long-term Provisions', groups: ['Long-term Provisions'] },
  { noteNo: '5', title: 'Short-term Borrowings', groups: ['Short-term Borrowings'] },
  { noteNo: '6', title: 'Trade Payables', groups: ['Trade Payables'] },
  { noteNo: '7', title: 'Other Current Liabilities', groups: ['Other Current Liabilities', 'Statutory Liabilities'] },
  { noteNo: '8', title: 'Short-term Provisions', groups: ['Short-term Provisions'] },
  { noteNo: '9', title: 'Tangible Fixed Assets', groups: ['Tangible Fixed Assets', 'Accumulated Depreciation'] },
  { noteNo: '9a', title: 'Capital Work in Progress and Intangible Assets under Development', groups: ['Capital Work in Progress'] },
  { noteNo: '10', title: 'Intangible Assets', groups: ['Intangible Assets', 'Accumulated Amortisation'] },
  { noteNo: '11', title: 'Non-current Investments', groups: ['Non-current Investments'] },
  { noteNo: '11b', title: 'Current Investments', groups: ['Current Investments'] },
  { noteNo: '12', title: 'Long-term Loans and Advances', groups: ['Long-term Loans & Advances'] },
  { noteNo: '13', title: 'Inventories', groups: ['Inventories'] },
  { noteNo: '14', title: 'Trade Receivables', groups: ['Trade Receivables'] },
  { noteNo: '15', title: 'Cash and Cash Equivalents', groups: ['Cash & Cash Equivalents', 'Bank Balances', 'Cash Equivalents'] },
  { noteNo: '16', title: 'Short-term Loans and Advances', groups: ['Short-term Loans & Advances', 'Other Current Assets'] },
];

const SCHEDULE_III_AGEING_LABELS = [
  { key: 'lessThan6Months', label: 'Less than 6 months' },
  { key: 'sixMonthsTo1Year', label: '6 months to 1 year' },
  { key: 'oneYearTo2Years', label: '1 year to 2 years' },
  { key: 'twoYearsTo3Years', label: '2 years to 3 years' },
  { key: 'moreThan3Years', label: 'More than 3 years' },
] as const;

export default function BalanceSheetNotesPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const noteCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);
  const debtorAgeing = useMemo(
    () => (entries.length && toDate ? computeDebtorAgeing(entries, toDate, 'schedule_iii') : []),
    [entries, toDate]
  );
  const creditorAgeing = useMemo(
    () => (entries.length && toDate ? computeCreditorAgeing(entries, toDate, 'schedule_iii') : []),
    [entries, toDate]
  );
  const cwipAgeing = useMemo(
    () => (entries.length && toDate ? computeCWIPAgeing(entries, toDate) : []),
    [entries, toDate]
  );
  const contingentItems = companyId ? getContingentItems(companyId) : [];

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const groupedNotes = NOTES.map(note => {
    const groupSet = new Set(note.groups);
    const lines = balances.filter(b => groupSet.has(b.account_group));
    const total = lines.reduce((s, b) => s + Math.abs(b.balance), 0);
    return { note, lines, total };
  }).filter(n => n.lines.length > 0 || n.total !== 0);

  const exportColumns = [
    { header: 'Note', key: 'noteNo' },
    { header: 'Title', key: 'title' },
    { header: 'Account', key: 'account_name' },
    { header: 'Group', key: 'account_group' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...groupedNotes.flatMap(n =>
      n.lines.map(line => ({
        noteNo: n.note.noteNo,
        title: n.note.title,
        account_name: line.account_name,
        account_group: line.account_group,
        amount: Math.abs(line.balance),
      }))
    ),
    ...contingentItems.map(item => ({
      noteNo: '17',
      title: 'Contingent Liabilities & Contingent Assets',
      account_name: item.description,
      account_group: item.type,
      amount: item.amount,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Balance Sheet Notes"
        description="Schedule III notes — auto-linked to VAARTA sub-groups and journal-only balances"
      >
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
          />
          <ExportButtons
            title="Balance Sheet Notes"
            companyName={company.name}
            entityType={entityLabel}
            dateRange={`As at ${toDate}`}
            columns={exportColumns}
            data={exportData}
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {groupedNotes.length === 0 && (
            <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3">
              No balances found for Schedule III note groups. Create journal entries first.
            </p>
          )}

          {groupedNotes.map(({ note, lines, total }) => (
            <div
              key={note.noteNo}
              ref={(el) => { noteCardRefs.current[note.noteNo] = el; }}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Note {note.noteNo} — {note.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                    Groups: {note.groups.join(', ')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Total</p>
                    <p className="text-sm font-mono font-semibold text-blue-700">
                      {formatIndianCurrency(total)}
                    </p>
                  </div>
                  <ExportButtons
                    title={`Note ${note.noteNo} — ${note.title}`}
                    companyName={company.name}
                    entityType={entityLabel}
                    dateRange={`As at ${toDate}`}
                    columns={[
                      { header: 'S. No.', key: 'sno' },
                      { header: 'Particulars', key: 'account_name' },
                      { header: 'Group', key: 'account_group' },
                      { header: 'Amount (₹)', key: 'amount', align: 'right' as const },
                    ]}
                    data={[
                      ...lines.map((line, idx) => ({
                        sno: idx + 1,
                        account_name: line.account_name,
                        account_group: line.account_group,
                        amount: Math.abs(line.balance),
                      })),
                      {
                        sno: '',
                        account_name: `Note ${note.noteNo} Total`,
                        account_group: '',
                        amount: total,
                      },
                    ]}
                    onPdf={() =>
                      exportElementAsImagePDF({
                        element: noteCardRefs.current[note.noteNo],
                        title: `Note ${note.noteNo} — ${note.title}`,
                        orientation: 'portrait',
                      })
                    }
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">S. No.</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Group</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.account_name} className="border-b border-gray-100">
                        <td className="px-3 py-1.5 text-xs font-mono text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-800">{line.account_name}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{line.account_group}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-sm">
                          {formatIndianCurrency(Math.abs(line.balance))}
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-xs text-gray-400 text-center">
                          No balances in these groups for the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-3 py-2 text-xs font-semibold text-gray-600" colSpan={3}>
                        Note {note.noteNo} Total
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-700">
                        {formatIndianCurrency(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {note.noteNo === '6' && creditorAgeing.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ageing (Schedule III) — Trade Payables</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Party</th>
                        {SCHEDULE_III_AGEING_LABELS.map(({ label }) => (
                          <th key={label} className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</th>
                        ))}
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditorAgeing.map((row) => (
                        <tr key={row.accountName} className="border-b border-gray-100">
                          <td className="px-2 py-1.5 text-gray-800">{row.accountName}</td>
                          {SCHEDULE_III_AGEING_LABELS.map(({ key }) => (
                            <td key={key} className="px-2 py-1.5 text-right font-mono">
                              {row.scheduleIIIAgeing ? formatIndianCurrency((row.scheduleIIIAgeing as unknown as Record<string, number>)[key]) : '—'}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono font-medium">
                            {row.scheduleIIIAgeing ? formatIndianCurrency(row.scheduleIIIAgeing.total) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {note.noteNo === '14' && debtorAgeing.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ageing (Schedule III) — Trade Receivables</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Party</th>
                        {SCHEDULE_III_AGEING_LABELS.map(({ label }) => (
                          <th key={label} className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</th>
                        ))}
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtorAgeing.map((row) => (
                        <tr key={row.accountName} className="border-b border-gray-100">
                          <td className="px-2 py-1.5 text-gray-800">{row.accountName}</td>
                          {SCHEDULE_III_AGEING_LABELS.map(({ key }) => (
                            <td key={key} className="px-2 py-1.5 text-right font-mono">
                              {row.scheduleIIIAgeing ? formatIndianCurrency((row.scheduleIIIAgeing as unknown as Record<string, number>)[key]) : '—'}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono font-medium">
                            {row.scheduleIIIAgeing ? formatIndianCurrency(row.scheduleIIIAgeing.total) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {note.noteNo === '9a' && cwipAgeing.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ageing (Schedule III) — CWIP by period of incurrence</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                        {SCHEDULE_III_AGEING_LABELS.map(({ label }) => (
                          <th key={label} className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</th>
                        ))}
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cwipAgeing.map((row) => (
                        <tr key={row.accountName} className="border-b border-gray-100">
                          <td className="px-2 py-1.5 text-gray-800">{row.accountName}</td>
                          {SCHEDULE_III_AGEING_LABELS.map(({ key }) => (
                            <td key={key} className="px-2 py-1.5 text-right font-mono">
                              {row.scheduleIIIAgeing ? formatIndianCurrency((row.scheduleIIIAgeing as unknown as Record<string, number>)[key]) : '—'}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono font-medium">
                            {row.scheduleIIIAgeing ? formatIndianCurrency(row.scheduleIIIAgeing.total) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {contingentItems.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Note 17 — Contingent Liabilities & Contingent Assets (AS 29)</h3>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                    Disclosure schedule — data from <Link to={`/company/${companyId}/contingent-liabilities`} className="text-blue-600 hover:underline">Contingent Liabilities</Link> page
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Category</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contingentItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 capitalize">{item.type}</td>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-gray-600">{item.category ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

