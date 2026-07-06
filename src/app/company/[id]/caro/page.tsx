'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

/** CARO 2020 — matters to be included in the auditor's report. */
interface CAROItem {
  id: string;
  clause: string;
  description: string;
  applicable: boolean;
  complied: 'yes' | 'no' | 'na' | 'partial';
  remarks: string;
}

const CARO_CLAUSES: Omit<CAROItem, 'id'>[] = [
  { clause: '(a)', description: 'Property, plant and equipment / intangible assets — records, physical verification, title', applicable: true, complied: 'na', remarks: '' },
  { clause: '(b)', description: 'Inventory — physical verification, discrepancies', applicable: true, complied: 'na', remarks: '' },
  { clause: '(c)', description: 'Loans / advances / guarantees / investments — compliance with Sections 185, 186', applicable: true, complied: 'na', remarks: '' },
  { clause: '(d)', description: 'Compliance with Section 73 to 76 or 196 (deposits)', applicable: true, complied: 'na', remarks: '' },
  { clause: '(e)', description: 'Maintenance of cost records (Rule 3(1))', applicable: true, complied: 'na', remarks: '' },
  { clause: '(f)', description: 'Deposit with appropriate authorities (e.g. PF, ESI)', applicable: true, complied: 'na', remarks: '' },
  { clause: '(g)', description: 'Books of account — location, adequacy', applicable: true, complied: 'na', remarks: '' },
  { clause: '(h)', description: 'Statutory dues — default in payment', applicable: true, complied: 'na', remarks: '' },
  { clause: '(i)', description: 'Surrendered or disclosed transactions (Section 43A)', applicable: true, complied: 'na', remarks: '' },
  { clause: '(j)', description: 'Fraud by company / on company; by management / employees', applicable: true, complied: 'na', remarks: '' },
  { clause: '(k)', description: 'Managerial remuneration — Section 197', applicable: true, complied: 'na', remarks: '' },
  { clause: '(l)', description: 'Nidhi company — compliance', applicable: true, complied: 'na', remarks: '' },
  { clause: '(m)', description: 'Related party transactions — Section 177(4)', applicable: true, complied: 'na', remarks: '' },
  { clause: '(n)', description: 'Internal audit — coverage and adequacy', applicable: true, complied: 'na', remarks: '' },
  { clause: '(o)', description: 'Non-cash transactions with directors — Section 192', applicable: true, complied: 'na', remarks: '' },
  { clause: '(p)', description: 'Registration under RBI Act (NBFC)', applicable: true, complied: 'na', remarks: '' },
  { clause: '(q)', description: 'Cash losses; net worth', applicable: true, complied: 'na', remarks: '' },
  { clause: '(r)', description: 'Whistle-blower complaints', applicable: true, complied: 'na', remarks: '' },
  { clause: '(s)', description: 'Consolidated financial statements', applicable: true, complied: 'na', remarks: '' },
];

function initItems(): CAROItem[] {
  return CARO_CLAUSES.map((c, i) => ({ ...c, id: `caro-${i}-${c.clause}` }));
}

export default function CAROPage() {
  const { company, loading: companyLoading } = useCompany();
  const [items, setItems] = useState<CAROItem[]>(initItems);

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const updateItem = (id: string, patch: Partial<CAROItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const complied = items.filter((i) => i.applicable && i.complied === 'yes').length;
  const applicable = items.filter((i) => i.applicable).length;

  const columns = [
    { header: 'Clause', key: 'clause' },
    { header: 'Description', key: 'description' },
    { header: 'Applicable', key: 'applicable' },
    { header: 'Complied', key: 'complied' },
    { header: 'Remarks', key: 'remarks' },
  ];
  const exportData = items.map((i) => ({ ...i, applicable: i.applicable ? 'Yes' : 'No' }));

  return (
    <div>
      <PageHeader
        title="CARO (Companies Auditor's Report Order)"
        description="Checklist for matters to be included in the auditor's report — CARO 2020"
      >
        <ExportButtons
          title="CARO Checklist"
          companyName={company.name}
          entityType={entityLabel}
          dateRange=""
          columns={columns}
          data={exportData}
        />
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Applicable clauses</p>
          <p className="text-lg font-bold text-blue-700">{applicable}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Complied</p>
          <p className="text-lg font-bold text-green-700">{complied} / {applicable}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">Clause</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Applicable</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Complied</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-3 py-2 font-mono text-gray-600">{item.clause}</td>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.applicable}
                    onChange={(e) => updateItem(item.id, { applicable: e.target.checked })}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.complied}
                    onChange={(e) => updateItem(item.id, { complied: e.target.value as CAROItem['complied'] })}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="na">N/A</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="partial">Partial</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.remarks}
                    onChange={(e) => updateItem(item.id, { remarks: e.target.value })}
                    placeholder="Remarks"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
