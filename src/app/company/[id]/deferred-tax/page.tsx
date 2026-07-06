'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeDepreciation } from '@/lib/accounting/depreciationCompute';
import type { EntityType } from '@/types/company';

interface TimingDifference {
  description: string;
  bookAmount: string;
  taxAmount: string;
  difference: number;
  type: 'DTA' | 'DTL';
}

export default function DeferredTaxPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [taxRate, setTaxRate] = useState('25.168'); // 22% + 10% surcharge + 4% cess = 25.168% effective

  // Timing differences — user editable
  const [differences, setDifferences] = useState<TimingDifference[]>([
    { description: 'Depreciation (Book vs Tax)', bookAmount: '', taxAmount: '', difference: 0, type: 'DTL' },
    { description: 'Provision for Bad Debts', bookAmount: '', taxAmount: '0', difference: 0, type: 'DTA' },
    { description: 'Provision for Leave Encashment', bookAmount: '', taxAmount: '0', difference: 0, type: 'DTA' },
    { description: 'Provision for Gratuity', bookAmount: '', taxAmount: '0', difference: 0, type: 'DTA' },
  ]);

  // Opening DTA/DTL from previous year
  const [openingDTA, setOpeningDTA] = useState('');
  const [openingDTL, setOpeningDTL] = useState('');

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  // Auto-compute book depreciation from depreciation module
  const bookDepreciation = useMemo(() => {
    const dep = computeDepreciation(entries, 'WDV');
    return dep.reduce((s, r) => s + r.depreciationAmount, 0);
  }, [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const rate = parseFloat(taxRate) || 0;

  // Recalculate differences
  const computedDiffs = differences.map(d => {
    const book = parseFloat(d.bookAmount) || 0;
    const tax = parseFloat(d.taxAmount) || 0;
    const diff = Math.abs(book - tax);
    const type: 'DTA' | 'DTL' = book > tax ? 'DTL' : 'DTA';
    return { ...d, difference: diff, type };
  });

  const totalDTL = computedDiffs.filter(d => d.type === 'DTL').reduce((s, d) => s + d.difference, 0);
  const totalDTA = computedDiffs.filter(d => d.type === 'DTA').reduce((s, d) => s + d.difference, 0);
  const netTimingDifference = totalDTL - totalDTA;
  const isNetDTL = netTimingDifference > 0;

  const closingDTLAmount = Math.round(Math.max(netTimingDifference, 0) * rate / 100);
  const closingDTAAmount = Math.round(Math.max(-netTimingDifference, 0) * rate / 100);

  const openDTA = parseFloat(openingDTA) || 0;
  const openDTL = parseFloat(openingDTL) || 0;

  const deferredTaxExpense = (closingDTLAmount - openDTL) - (closingDTAAmount - openDTA);

  const updateDifference = (index: number, field: keyof TimingDifference, value: string) => {
    const updated = [...differences];
    updated[index] = { ...updated[index], [field]: value };
    setDifferences(updated);
  };

  const columns = [
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    ...computedDiffs.map(d => ({ label: `${d.description} (${d.type})`, amount: d.difference })),
    { label: 'Net Timing Difference', amount: Math.abs(netTimingDifference) },
    { label: `Tax Rate Applied`, amount: rate },
    { label: isNetDTL ? 'Closing DTL' : 'Closing DTA', amount: isNetDTL ? closingDTLAmount : closingDTAAmount },
    { label: 'Deferred Tax Expense / (Income)', amount: deferredTaxExpense },
  ];

  return (
    <div>
      <PageHeader title="Deferred Tax Computation (AS-22)" description="Timing differences between book profit and taxable profit">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Deferred Tax (AS-22)" companyName={company.name} entityType={entityLabel} dateRange={`For the year ended ${toDate}`} columns={columns} data={exportData} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {/* Tax Rate */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Enacted Tax Rate (%):</span>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                step="0.001"
                className="w-28 px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">e.g., 25.168% = 22% + surcharge + cess</span>
            </div>
          </div>

          {/* Book depreciation auto-detected */}
          {bookDepreciation > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Book Depreciation (auto-computed, WDV method)</p>
              <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(bookDepreciation)}</p>
              <p className="text-xs text-gray-400 mt-1">Use this as the &quot;Book Amount&quot; for the Depreciation row below</p>
            </div>
          )}

          {/* Timing Differences Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Deferred Tax Computation (AS-22)</h3>
            <p className="text-xs text-gray-400 mt-0.5">For the year ended {toDate}</p>
          </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Timing Difference</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Book Amount (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tax Amount (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Difference (₹)</th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">DTA / DTL</th>
                  </tr>
                </thead>
                <tbody>
                  {computedDiffs.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={d.description}
                          onChange={e => updateDifference(i, 'description', e.target.value)}
                          className="w-full px-1 py-0.5 text-sm border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={differences[i].bookAmount}
                          onChange={e => updateDifference(i, 'bookAmount', e.target.value)}
                          className="w-full px-1 py-0.5 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={differences[i].taxAmount}
                          onChange={e => updateDifference(i, 'taxAmount', e.target.value)}
                          className="w-full px-1 py-0.5 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{formatIndianCurrency(d.difference)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.type === 'DTA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {d.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-3 py-2 font-bold" colSpan={3}>Net Timing Difference</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatIndianCurrency(Math.abs(netTimingDifference))}</td>
                    <td className="px-3 py-2 text-center font-bold">{isNetDTL ? 'Net DTL' : 'Net DTA'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-gray-200">
              <button
                onClick={() => setDifferences([...differences, { description: '', bookAmount: '', taxAmount: '', difference: 0, type: 'DTA' }])}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add timing difference
              </button>
            </div>
          </div>

          {/* DTA/DTL Computation */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-800">DTA / DTL Computation</h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-700">Net Timing Difference</span>
                <span className="text-sm font-mono">{formatIndianCurrency(Math.abs(netTimingDifference))} ({isNetDTL ? 'DTL' : 'DTA'})</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-700">Tax Rate Applied</span>
                <span className="text-sm font-mono">{rate}%</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-200 font-bold">
                <span className="text-sm">{isNetDTL ? 'Closing Deferred Tax Liability' : 'Closing Deferred Tax Asset'}</span>
                <span className="text-sm font-mono">{formatIndianCurrency(isNetDTL ? closingDTLAmount : closingDTAAmount)}</span>
              </div>

              {/* Opening balances */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Opening Balances (from previous year)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Opening DTA</label>
                    <input
                      type="number"
                      value={openingDTA}
                      onChange={e => setOpeningDTA(e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Opening DTL</label>
                    <input
                      type="number"
                      value={openingDTL}
                      onChange={e => setOpeningDTL(e.target.value)}
                      className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Deferred Tax Expense */}
              <div className={`mt-3 rounded-xl px-4 py-3 border ${deferredTaxExpense >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${deferredTaxExpense >= 0 ? 'text-red-800' : 'text-green-800'}`}>
                    Deferred Tax {deferredTaxExpense >= 0 ? 'Expense' : 'Income'} for the year
                  </span>
                  <span className={`text-xl font-bold font-mono ${deferredTaxExpense >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatIndianCurrency(Math.abs(deferredTaxExpense))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Journal Entry Suggestion */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-800">Suggested Journal Entry</h4>
            </div>
            <div className="p-4">
              {deferredTaxExpense > 0 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-800">If DTL increased (Tax Expense):</p>
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>P&L (Tax Expense) Dr</span>
                      <span>{formatIndianCurrency(Math.abs(deferredTaxExpense))}</span>
                    </div>
                    <div className="flex justify-between mt-1 pl-4">
                      <span>To Deferred Tax Liability Cr</span>
                      <span>{formatIndianCurrency(Math.abs(deferredTaxExpense))}</span>
                    </div>
                  </div>
                </div>
              ) : deferredTaxExpense < 0 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-800">If DTA increased (Tax Income):</p>
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>Deferred Tax Asset Dr</span>
                      <span>{formatIndianCurrency(Math.abs(deferredTaxExpense))}</span>
                    </div>
                    <div className="flex justify-between mt-1 pl-4">
                      <span>To P&L (Tax Expense) Cr</span>
                      <span>{formatIndianCurrency(Math.abs(deferredTaxExpense))}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No deferred tax movement — no journal entry needed.</p>
              )}
            </div>
          </div>

          {/* AS-22 Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">AS-22 Notes:</p>
            <ul className="mt-1 text-xs space-y-0.5 list-disc list-inside text-blue-600">
              <li>Timing differences: differences between book profit and taxable profit that will reverse in future</li>
              <li>Permanent differences (penalty, donation disallowance): do NOT create deferred tax</li>
              <li>DTA recognized only when there is reasonable/virtual certainty of sufficient future taxable income</li>
              <li>DTL is always recognized</li>
              <li>Use current enacted tax rate, not expected future rate</li>
              <li>DTA shown under Non-current Assets, DTL under Non-current Liabilities in Balance Sheet</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
