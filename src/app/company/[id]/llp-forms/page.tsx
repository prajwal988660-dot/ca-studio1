'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface LLPFormItem {
  form: string;
  description: string;
  dueDate: string;
  status: 'filed' | 'pending' | 'overdue' | 'na';
  filedDate: string;
  remarks: string;
}

const LLP_FORMS: Omit<LLPFormItem, 'status' | 'filedDate' | 'remarks'>[] = [
  { form: 'Form 8', description: 'Statement of Account & Solvency', dueDate: 'Within 30 days from end of 6 months of FY' },
  { form: 'Form 11', description: 'Annual Return', dueDate: 'Within 60 days from closure of FY' },
  { form: 'Form 3', description: 'LLP Agreement (initial / amendment)', dueDate: 'Within 30 days of incorporation / change' },
  { form: 'Form 4', description: 'Notice of change in partners', dueDate: 'Within 30 days of change' },
  { form: 'Form 5', description: 'Notice for change of name', dueDate: 'As required' },
  { form: 'Form 15', description: 'Notice for change of registered office', dueDate: 'Within 30 days' },
  { form: 'Form 24', description: 'Application for striking off', dueDate: 'As required' },
];

export default function LLPFormsPage() {
  const { company, loading: companyLoading } = useCompany();
  const [forms, setForms] = useState<LLPFormItem[]>(
    LLP_FORMS.map(f => ({ ...f, status: 'pending' as const, filedDate: '', remarks: '' }))
  );

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const updateForm = (index: number, field: keyof LLPFormItem, value: string) => {
    const updated = [...forms];
    updated[index] = { ...updated[index], [field]: value };
    setForms(updated);
  };

  const filed = forms.filter(f => f.status === 'filed').length;
  const pending = forms.filter(f => f.status === 'pending').length;

  const columns = [
    { header: 'Form', key: 'form' },
    { header: 'Description', key: 'description' },
    { header: 'Due Date', key: 'dueDate' },
    { header: 'Status', key: 'status' },
    { header: 'Filed Date', key: 'filedDate' },
    { header: 'Remarks', key: 'remarks' },
  ];

  return (
    <div>
      <PageHeader title="LLP Forms & Compliance" description="Annual and event-based LLP filings with MCA">
        <ExportButtons title="LLP Forms Tracker" companyName={company.name} entityType={entityLabel} dateRange="" columns={columns} data={forms} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Filed</p>
          <p className="text-lg font-bold text-green-700">{filed} / {forms.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Pending</p>
          <p className="text-lg font-bold text-yellow-700">{pending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">LLPIN</p>
          <p className="text-lg font-bold text-blue-700">{company.entity_details?.registrationNumber || '—'}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">LLP Compliance Tracker</h3>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Form</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Filed Date</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form, i) => (
                <tr key={form.form} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-bold text-gray-800">{form.form}</td>
                  <td className="px-3 py-2 text-gray-700">{form.description}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{form.dueDate}</td>
                  <td className="px-3 py-2 text-center">
                    <select value={form.status} onChange={e => updateForm(i, 'status', e.target.value)} className={`px-2 py-0.5 rounded text-xs border ${form.status === 'filed' ? 'bg-green-100 text-green-700 border-green-200' : form.status === 'overdue' ? 'bg-red-100 text-red-700 border-red-200' : form.status === 'na' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                      <option value="pending">Pending</option>
                      <option value="filed">Filed</option>
                      <option value="overdue">Overdue</option>
                      <option value="na">N/A</option>
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="date" value={form.filedDate} onChange={e => updateForm(i, 'filedDate', e.target.value)} className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-3 py-2"><input type="text" value={form.remarks} onChange={e => updateForm(i, 'remarks', e.target.value)} className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Remarks..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
