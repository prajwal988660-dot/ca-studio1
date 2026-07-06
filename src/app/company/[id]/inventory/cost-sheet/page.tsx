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
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

export default function CostSheetPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  // User-editable fields for cost elements not in journal entries
  const [openingStock, setOpeningStock] = useState('');
  const [closingStock, setClosingStock] = useState('');
  const [directLabour, setDirectLabour] = useState('');
  const [factoryOverheads, setFactoryOverheads] = useState('');
  const [openingWIP, setOpeningWIP] = useState('');
  const [closingWIP, setClosingWIP] = useState('');
  const [adminOverheads, setAdminOverheads] = useState('');
  const [sellingOverheads, setSellingOverheads] = useState('');

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  // Auto-compute from entries
  const purchases = balances.filter(b => ['Cost of Materials Consumed', 'Purchases of Stock-in-Trade', 'Purchases'].includes(b.account_group)).reduce((s, b) => s + b.balance, 0);
  const directExpenses = balances.filter(b => b.account_group === 'Direct Expenses').reduce((s, b) => s + b.balance, 0);
  const sales = balances.filter(b => ['Revenue from Operations', 'Sales', 'Revenue'].includes(b.account_group)).reduce((s, b) => s + b.balance, 0);

  const p = (v: string) => parseFloat(v) || 0;

  const rawMaterialConsumed = p(openingStock) + purchases - p(closingStock);
  const primeCost = rawMaterialConsumed + p(directLabour) + directExpenses;
  const worksCost = primeCost + p(factoryOverheads) + p(openingWIP) - p(closingWIP);
  const costOfProduction = worksCost;
  const costOfGoodsSold = costOfProduction + p(adminOverheads);
  const totalCost = costOfGoodsSold + p(sellingOverheads);
  const profit = sales - totalCost;

  const costItems = [
    { label: 'Opening Stock of Raw Material', amount: p(openingStock), section: 'material' },
    { label: 'Add: Purchases (auto)', amount: purchases, section: 'material' },
    { label: 'Less: Closing Stock of Raw Material', amount: -p(closingStock), section: 'material' },
    { label: 'RAW MATERIAL CONSUMED', amount: rawMaterialConsumed, section: 'subtotal' },
    { label: 'Add: Direct Labour', amount: p(directLabour), section: 'labour' },
    { label: 'Add: Direct Expenses (auto)', amount: directExpenses, section: 'labour' },
    { label: 'PRIME COST', amount: primeCost, section: 'subtotal' },
    { label: 'Add: Factory / Works Overheads', amount: p(factoryOverheads), section: 'overhead' },
    { label: 'Add: Opening WIP', amount: p(openingWIP), section: 'overhead' },
    { label: 'Less: Closing WIP', amount: -p(closingWIP), section: 'overhead' },
    { label: 'WORKS COST / COST OF PRODUCTION', amount: worksCost, section: 'subtotal' },
    { label: 'Add: Admin / Office Overheads', amount: p(adminOverheads), section: 'overhead' },
    { label: 'COST OF GOODS SOLD', amount: costOfGoodsSold, section: 'subtotal' },
    { label: 'Add: Selling & Distribution Overheads', amount: p(sellingOverheads), section: 'overhead' },
    { label: 'TOTAL COST / COST OF SALES', amount: totalCost, section: 'subtotal' },
    { label: 'Sales (auto)', amount: sales, section: 'sales' },
    { label: profit >= 0 ? 'PROFIT' : 'LOSS', amount: profit, section: 'result' },
  ];

  const exportColumns = [
    { header: 'Particulars', key: 'label' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];

  return (
    <div>
      <PageHeader title="Cost Sheet" description="Product costing — material, labour, overheads">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Cost Sheet" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={costItems} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Cost Sheet</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Input fields in a grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Opening Stock (Raw Material)', value: openingStock, setter: setOpeningStock },
                { label: 'Closing Stock (Raw Material)', value: closingStock, setter: setClosingStock },
                { label: 'Direct Labour', value: directLabour, setter: setDirectLabour },
                { label: 'Factory / Works Overheads', value: factoryOverheads, setter: setFactoryOverheads },
                { label: 'Opening Work-in-Progress', value: openingWIP, setter: setOpeningWIP },
                { label: 'Closing Work-in-Progress', value: closingWIP, setter: setClosingWIP },
                { label: 'Admin / Office Overheads', value: adminOverheads, setter: setAdminOverheads },
                { label: 'Selling & Distribution Overheads', value: sellingOverheads, setter: setSellingOverheads },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{field.label}</label>
                  <input
                    type="number"
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm text-right font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            {/* Cost Statement */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-bold text-gray-800 mb-2">Cost Statement</h4>
              <table className="w-full text-sm">
                <tbody>
                  {costItems.map((item, i) => (
                    <tr key={i} className={`${item.section === 'subtotal' ? 'bg-gray-50 font-bold border-t border-b border-gray-200' : item.section === 'result' ? (item.amount >= 0 ? 'bg-green-50' : 'bg-red-50') + ' font-bold border-t-2 border-gray-200' : ''}`}>
                      <td className={`px-3 py-1.5 ${item.section === 'subtotal' || item.section === 'result' ? 'text-gray-900' : 'text-gray-700'}`}>{item.label}</td>
                      <td className={`px-3 py-2 text-right font-mono text-[13px] tabular-nums ${item.section === 'result' ? (item.amount >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
                        {item.amount < 0 ? `(${formatIndianCurrency(Math.abs(item.amount))})` : formatIndianCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              <p className="font-medium">Note:</p>
              <p>Purchases and Direct Expenses are auto-computed from journal entries. Other cost elements must be entered manually. This is a working paper for costing analysis.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
