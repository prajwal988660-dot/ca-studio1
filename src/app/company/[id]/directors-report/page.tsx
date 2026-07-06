'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

/** Companies Act: contents of Director's Report (Section 134). */
interface DirectorsReportItem {
  id: string;
  clause: string;
  description: string;
  completed: boolean;
  remarks: string;
}

const DEFAULT_CLAUSES: Omit<DirectorsReportItem, 'id'>[] = [
  { clause: '134(3)(a)', description: 'State of company\'s affairs', completed: false, remarks: '' },
  { clause: '134(3)(b)', description: 'Amount recommended as dividend', completed: false, remarks: '' },
  { clause: '134(3)(c)', description: 'Material changes and commitments affecting financial position', completed: false, remarks: '' },
  { clause: '134(3)(d)', description: 'Conservation of energy, technology absorption, foreign exchange (if applicable)', completed: false, remarks: '' },
  { clause: '134(3)(e)', description: 'Particulars of employees (Rule 5(2) of Companies (Appointment and Remuneration) Rules)', completed: false, remarks: '' },
  { clause: '134(3)(f)', description: 'Directors’ responsibility statement', completed: false, remarks: '' },
  { clause: '134(3)(g)', description: 'Details of policy developed and implemented on corporate social responsibility', completed: false, remarks: '' },
  { clause: '134(3)(h)', description: 'In case of listed company — corporate governance report', completed: false, remarks: '' },
  { clause: '134(3)(i)', description: 'Other matters as may be prescribed', completed: false, remarks: '' },
];

function initItems(): DirectorsReportItem[] {
  return DEFAULT_CLAUSES.map((c, i) => ({ ...c, id: `dr-${i}-${c.clause}` }));
}

export default function DirectorsReportPage() {
  const { company, loading: companyLoading } = useCompany();
  const [items, setItems] = useState<DirectorsReportItem[]>(initItems);

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const updateItem = (id: string, patch: Partial<DirectorsReportItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const completed = items.filter((i) => i.completed).length;
  const columns = [
    { header: 'Clause', key: 'clause' },
    { header: 'Description', key: 'description' },
    { header: 'Completed', key: 'completed' },
    { header: 'Remarks', key: 'remarks' },
  ];
  const exportData = items.map((i) => ({ ...i, completed: i.completed ? 'Yes' : 'No' }));

  return (
    <div>
      <PageHeader
        title="Director's Report"
        description="Checklist of contents as per Companies Act, 2013 — Section 134"
      >
        <ExportButtons
          title="Directors Report Checklist"
          companyName={company.name}
          entityType={entityLabel}
          dateRange=""
          columns={columns}
          data={exportData}
        />
      </PageHeader>

      <div className="mb-4 flex items-center gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Completed</p>
          <p className="text-lg font-bold text-blue-700">{completed} / {items.length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Clause</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Done</th>
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
                    checked={item.completed}
                    onChange={(e) => updateItem(item.id, { completed: e.target.checked })}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.remarks}
                    onChange={(e) => updateItem(item.id, { remarks: e.target.value })}
                    placeholder="Notes"
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
