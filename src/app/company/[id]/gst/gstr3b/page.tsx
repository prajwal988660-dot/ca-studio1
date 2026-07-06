'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeGSTR3BFromInvoices } from '@/lib/accounting/gstComputeFromInvoices';
import { listInvoicesV2, listPurchaseInvoices } from '@/lib/accounting/gstInvoices';
import { emptyGstr3bForm, prefillGstr3bFormFromBooks, calendarMonthRangeIso } from '@/lib/accounting/gstr3bJson';
import type { EntityType } from '@/types/company';
import { Gstr3bUtilityPanel } from '@/components/gst/Gstr3bUtilityPanel';

export default function GSTR3BPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [tab, setTab] = useState<'utility' | 'books'>('utility');
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  const now = new Date();
  const [retMonth, setRetMonth] = useState(now.getMonth() + 1);
  const [retYear, setRetYear] = useState(now.getFullYear());
  const [form, setForm] = useState(emptyGstr3bForm);
  const [caConfirmed, setCaConfirmed] = useState(false);

  const { from: monthFrom, to: monthTo } = useMemo(
    () => calendarMonthRangeIso(retYear, retMonth),
    [retYear, retMonth]
  );

  // Load invoices from registers
  const allSales = useMemo(() => companyId ? listInvoicesV2(companyId) : [], [companyId]);
  const allPurchases = useMemo(() => companyId ? listPurchaseInvoices(companyId) : [], [companyId]);

  // Utility tab: filter by selected month
  const utilitySales = useMemo(() => allSales.filter((s) => s.invoice_date >= monthFrom && s.invoice_date <= monthTo), [allSales, monthFrom, monthTo]);
  const utilityPurchases = useMemo(() => allPurchases.filter((p) => p.invoice_date >= monthFrom && p.invoice_date <= monthTo), [allPurchases, monthFrom, monthTo]);

  // Books tab: filter by date range
  const booksSales = useMemo(() => allSales.filter((s) => s.invoice_date >= fromDate && s.invoice_date <= toDate), [allSales, fromDate, toDate]);
  const booksPurchases = useMemo(() => allPurchases.filter((p) => p.invoice_date >= fromDate && p.invoice_date <= toDate), [allPurchases, fromDate, toDate]);

  const gstr3b = useMemo(() => computeGSTR3BFromInvoices(booksSales, booksPurchases), [booksSales, booksPurchases]);
  const loading = false; // Invoice reads are synchronous (localStorage)

  useEffect(() => {
    setCaConfirmed(false);
  }, [retMonth, retYear]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const gstin = company.gst_details?.gstin?.trim() ?? '';

  const totalOutput = gstr3b.outwardSupplies.cgst + gstr3b.outwardSupplies.sgst + gstr3b.outwardSupplies.igst;
  const totalITC = gstr3b.itcAvailed.cgst + gstr3b.itcAvailed.sgst + gstr3b.itcAvailed.igst;
  const totalNet = gstr3b.netTaxPayable.cgst + gstr3b.netTaxPayable.sgst + gstr3b.netTaxPayable.igst;

  const exportColumns = [
    { header: 'Particulars', key: 'label' },
    { header: 'CGST (₹)', key: 'cgst', align: 'right' as const, isMono: true },
    { header: 'SGST (₹)', key: 'sgst', align: 'right' as const, isMono: true },
    { header: 'IGST (₹)', key: 'igst', align: 'right' as const, isMono: true },
    { header: 'Total (₹)', key: 'total', align: 'right' as const, isMono: true },
  ];

  const exportData = [
    { label: 'Outward Supplies (Output Tax)', cgst: gstr3b.outwardSupplies.cgst, sgst: gstr3b.outwardSupplies.sgst, igst: gstr3b.outwardSupplies.igst, total: totalOutput },
    { label: 'ITC Availed (Input Tax)', cgst: gstr3b.itcAvailed.cgst, sgst: gstr3b.itcAvailed.sgst, igst: gstr3b.itcAvailed.igst, total: totalITC },
    { label: 'Net Tax Payable', cgst: gstr3b.netTaxPayable.cgst, sgst: gstr3b.netTaxPayable.sgst, igst: gstr3b.netTaxPayable.igst, total: totalNet },
  ];

  const sections = [
    {
      title: 'Section 3.1 — Outward Supplies',
      desc: 'Output tax on all outward supplies',
      data: gstr3b.outwardSupplies,
      total: totalOutput,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
    },
    {
      title: 'Section 4 — Eligible ITC',
      desc: 'Input tax credit availed from purchases',
      data: gstr3b.itcAvailed,
      total: totalITC,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
    },
    {
      title: 'Section 5 — Net Tax Payable',
      desc: 'Output tax minus input tax credit',
      data: gstr3b.netTaxPayable,
      total: totalNet,
      bg: totalNet > 0 ? 'bg-red-50' : 'bg-green-50',
      border: totalNet > 0 ? 'border-red-200' : 'border-green-200',
      text: totalNet > 0 ? 'text-red-700' : 'text-green-700',
    },
  ];

  const loadFromBooks = () => {
    const summary = computeGSTR3BFromInvoices(utilitySales, utilityPurchases);
    setForm(prefillGstr3bFormFromBooks(summary));
    setCaConfirmed(false);
  };

  return (
    <div>
      <PageHeader
        title="GSTR-3B"
        description="Prepare return in the portal grid, confirm, and download JSON — or reconcile against books"
      >
        {tab === 'books' ? (
          <div className="flex flex-col gap-2 items-end">
            <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
            <ExportButtons title="GSTR-3B Working" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={exportData} />
          </div>
        ) : null}
      </PageHeader>

      <div className="flex gap-1 p-1 mb-4 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('utility')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === 'utility' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Return utility
        </button>
        <button
          type="button"
          onClick={() => setTab('books')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === 'books' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          From books
        </button>
      </div>

      {tab === 'utility' ? (
        <Gstr3bUtilityPanel
          companyName={company.name}
          gstin={gstin}
          month={retMonth}
          year={retYear}
          onMonthYearChange={(m, y) => {
            setRetMonth(m);
            setRetYear(y);
          }}
          form={form}
          setForm={setForm}
          loadingBooks={false}
          onLoadFromBooks={loadFromBooks}
          caConfirmed={caConfirmed}
          onCaConfirmedChange={setCaConfirmed}
        />
      ) : null}

      {tab === 'books' && loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : null}

      {tab === 'books' && !loading ? (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{company.name} | GSTIN: {gstin || '—'}</p>
              <h3 className="text-sm font-bold text-gray-900">GSTR-3B Working Sheet</h3>
              <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Particulars</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">CGST (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">SGST (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">IGST (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map(sec => (
                    <tr key={sec.title} className="border-b border-gray-100">
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{sec.title}</p>
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{sec.desc}</p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{formatIndianCurrency(sec.data.cgst)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatIndianCurrency(sec.data.sgst)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatIndianCurrency(sec.data.igst)}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">{formatIndianCurrency(sec.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sections.map(sec => (
              <div key={sec.title} className={`${sec.bg} border ${sec.border} rounded-xl px-4 py-3`}>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{sec.title.split(' — ')[1]}</p>
                <p className={`text-xl font-bold font-mono ${sec.text}`}>{formatIndianCurrency(sec.total)}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">Reconciliation</p>
            <p className="text-xs mt-1">Use the Return utility tab to type or load the same month from books, adjust for filing, confirm as CA, and download JSON.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
