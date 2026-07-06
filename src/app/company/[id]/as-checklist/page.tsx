'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface ASItem {
  asNumber: string;
  title: string;
  applicable: 'yes' | 'no' | 'na';
  complied: 'yes' | 'no' | 'partial' | 'na';
  remarks: string;
}

const AS_LIST: Omit<ASItem, 'applicable' | 'complied' | 'remarks'>[] = [
  { asNumber: 'AS-1', title: 'Disclosure of Accounting Policies' },
  { asNumber: 'AS-2', title: 'Valuation of Inventories' },
  { asNumber: 'AS-3', title: 'Cash Flow Statement' },
  { asNumber: 'AS-4', title: 'Contingencies and Events Occurring After Balance Sheet Date' },
  { asNumber: 'AS-5', title: 'Net Profit or Loss for the Period, Prior Period Items and Changes in Accounting Policies' },
  { asNumber: 'AS-6', title: 'Depreciation Accounting' },
  { asNumber: 'AS-7', title: 'Construction Contracts' },
  { asNumber: 'AS-9', title: 'Revenue Recognition' },
  { asNumber: 'AS-10', title: 'Property, Plant and Equipment' },
  { asNumber: 'AS-11', title: 'Effects of Changes in Foreign Exchange Rates' },
  { asNumber: 'AS-12', title: 'Accounting for Government Grants' },
  { asNumber: 'AS-13', title: 'Accounting for Investments' },
  { asNumber: 'AS-14', title: 'Accounting for Amalgamations' },
  { asNumber: 'AS-15', title: 'Employee Benefits' },
  { asNumber: 'AS-16', title: 'Borrowing Costs' },
  { asNumber: 'AS-17', title: 'Segment Reporting' },
  { asNumber: 'AS-18', title: 'Related Party Disclosures' },
  { asNumber: 'AS-19', title: 'Leases' },
  { asNumber: 'AS-20', title: 'Earnings Per Share' },
  { asNumber: 'AS-21', title: 'Consolidated Financial Statements' },
  { asNumber: 'AS-22', title: 'Accounting for Taxes on Income' },
  { asNumber: 'AS-23', title: 'Accounting for Investments in Associates in CFS' },
  { asNumber: 'AS-24', title: 'Discontinuing Operations' },
  { asNumber: 'AS-25', title: 'Interim Financial Reporting' },
  { asNumber: 'AS-26', title: 'Intangible Assets' },
  { asNumber: 'AS-28', title: 'Impairment of Assets' },
  { asNumber: 'AS-29', title: 'Provisions, Contingent Liabilities and Contingent Assets' },
];

export default function ASChecklistPage() {
  const { company, loading: companyLoading } = useCompany();

  const [items, setItems] = useState<ASItem[]>(
    AS_LIST.map(as => ({ ...as, applicable: 'yes' as const, complied: 'na' as const, remarks: '' }))
  );

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const updateItem = (index: number, field: keyof ASItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const complied = items.filter(i => i.complied === 'yes').length;
  const applicable = items.filter(i => i.applicable === 'yes').length;

  const columns = [
    { header: 'AS No.', key: 'asNumber' },
    { header: 'Title', key: 'title' },
    { header: 'Applicable', key: 'applicable' },
    { header: 'Complied', key: 'complied' },
    { header: 'Remarks', key: 'remarks' },
  ];

  return (
    <div>
      <PageHeader title="Accounting Standards Compliance Checklist" description="Compliance status for all applicable Accounting Standards">
        <ExportButtons title="AS Compliance Checklist" companyName={company.name} entityType={entityLabel} dateRange="" columns={columns} data={items} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Standards</p>
          <p className="text-lg font-bold text-blue-700">{items.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Complied</p>
          <p className="text-lg font-bold text-green-700">{complied} / {applicable}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Applicable</p>
          <p className="text-lg font-bold text-yellow-700">{applicable}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Accounting Standards Compliance</h3>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">AS No.</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Applicable</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Complied</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.asNumber} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-gray-600">{item.asNumber}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{item.title}</td>
                  <td className="px-3 py-2 text-center">
                    <select value={item.applicable} onChange={e => updateItem(i, 'applicable', e.target.value)} className={`px-2 py-0.5 rounded text-xs border ${item.applicable === 'yes' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="na">N/A</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <select value={item.complied} onChange={e => updateItem(i, 'complied', e.target.value)} className={`px-2 py-0.5 rounded text-xs border ${item.complied === 'yes' ? 'bg-green-100 text-green-700 border-green-200' : item.complied === 'partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : item.complied === 'no' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      <option value="na">—</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partial</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={item.remarks} onChange={e => updateItem(i, 'remarks', e.target.value)} className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Remarks..." />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
