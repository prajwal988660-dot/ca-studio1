 'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { computeMSMEDisclosure } from '@/lib/accounting/msmeCompute';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

export default function MSMEDisclosurePage() {
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

  const data = useMemo(() => computeMSMEDisclosure(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const exportColumns = [
    { header: 'Vendor', key: 'name' },
    { header: 'Principal Outstanding (₹)', key: 'principalOutstanding', align: 'right' as const, isMono: true },
    { header: 'Total Purchases (₹)', key: 'totalPurchases', align: 'right' as const, isMono: true },
    { header: 'Total Payments (₹)', key: 'totalPayments', align: 'right' as const, isMono: true },
  ];

  const exportData = data.parties.map(p => ({
    name: p.name,
    principalOutstanding: p.principalOutstanding,
    totalPurchases: p.totalPurchases,
    totalPayments: p.totalPayments,
  }));

  return (
    <div>
      <PageHeader
        title="MSME Disclosure"
        description="Working for disclosure of dues to Micro and Small Enterprises (MSMED Act, 2006)"
      >
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
          />
          <ExportButtons
            title="MSME Disclosure"
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
          {/* Statutory summary as per Schedule III */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatBox
              label="(a) Principal amount remaining unpaid to MSME suppliers"
              value={data.totalPrincipalUnpaid}
            />
            <StatBox
              label="(b) Interest due on above and remaining unpaid"
              value={data.totalInterestDue}
            />
            <StatBox
              label="(c) Interest paid under Section 16 along with principal beyond appointed day"
              value={data.totalInterestPaid}
            />
            <StatBox
              label="(d)+(e) Interest due for delayed payments and remaining unpaid"
              value={data.totalInterestAccruedUnpaid}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
            <p className="font-medium text-gray-800 mb-1">How this is computed</p>
            <p className="mb-1">
              Vendors are treated as MSME if their creditor ledger name contains keywords like
              <span className="font-mono"> MSME</span>, <span className="font-mono">Micro</span>, or
              <span className="font-mono"> Small Enterprise</span> and the account group is
              <span className="font-mono"> MSME Trade Payables</span> or
              <span className="font-mono"> Trade Payables</span>.
            </p>
            <p className="mb-1">
              All figures are derived purely from journal entries — no manual tagging tables.
            </p>
            <p className="text-[11px] text-gray-500">
              Interest fields are initialised to zero (no time-apportionment). You can override
              them in the final financial statement working paper if needed.
            </p>
          </div>

          {/* Party-wise table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Party-wise MSME Summary</h3>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                  Auto-computed from Trade Payables balances and payment history.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Total MSME Purchases</p>
                <p className="text-sm font-mono font-semibold text-blue-700">
                  {formatIndianCurrency(data.totalPurchasesFromMSME)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">S. No.</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vendor / MSME Party</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Total Purchases (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Total Payments (₹)</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Principal Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parties.map((p, idx) => (
                    <tr key={p.name} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-xs font-mono text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-sm">
                        {formatIndianCurrency(p.totalPurchases)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-sm">
                        {formatIndianCurrency(p.totalPayments)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-sm font-semibold">
                        {formatIndianCurrency(Math.max(0, p.principalOutstanding))}
                      </td>
                    </tr>
                  ))}
                  {data.parties.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-xs text-gray-400 text-center">
                        No MSME vendors identified. Tag creditor accounts with &quot;MSME&quot; in their name to enable this disclosure.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.parties.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-3 py-2 text-xs font-semibold text-gray-600" colSpan={4}>
                        Total principal outstanding to MSME
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-700">
                        {formatIndianCurrency(data.totalPrincipalUnpaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            <p className="font-medium">Disclosure Note (to be used in financial statements)</p>
            <p className="mt-1">
              {data.parties.length === 0
                ? 'The Company has not received any information from suppliers regarding their status under the Micro, Small and Medium Enterprises Development Act, 2006. Accordingly, disclosures as required under the said Act have not been given.'
                : 'Based on information and records available with the Company, the following disclosures relating to amounts payable to Micro and Small Enterprises as at the balance sheet date have been made in the financial statements.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono text-blue-700">
        {formatIndianCurrency(value)}
      </p>
    </div>
  );
}

