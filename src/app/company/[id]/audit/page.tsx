'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { getEntityConfig } from '@/lib/entityConfig';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import type { EntityType } from '@/types/company';

interface AuditCheckItem {
  clause: string;
  description: string;
  status: 'verified' | 'pending' | 'na';
  remarks: string;
  autoValue?: string;
}

export default function AuditPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [activeTab, setActiveTab] = useState<string>('3CD');
  const [checklist, setChecklist] = useState<AuditCheckItem[]>([]);
  const initializedRef = useRef(false);

  const { entries, loading } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    enabled: !!companyId,
  });

  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  const turnover = useMemo(() =>
    balances.filter(b => b.account_group === 'Revenue from Operations' || b.account_group === 'Sales' || b.account_group === 'Revenue').reduce((s, b) => s + b.balance, 0),
    [balances]
  );

  // Initialize checklist once when company data is available
  useEffect(() => {
    if (!company || initializedRef.current) return;
    initializedRef.current = true;
    setChecklist([
      { clause: '1-4', description: 'Name, Address, PAN, Status', status: 'pending', remarks: '', autoValue: company.name },
      { clause: '7(a)', description: 'Particulars of Registration under GST', status: 'pending', remarks: '' },
      { clause: '8', description: 'Previous year ended on / Assessment Year', status: 'pending', remarks: '' },
      { clause: '12', description: 'Turnover/Gross Receipts', status: 'pending', remarks: '', autoValue: formatIndianCurrency(turnover) },
      { clause: '14', description: 'Method of Accounting', status: 'pending', remarks: '', autoValue: 'Mercantile' },
      { clause: '15-17', description: 'Depreciation — Book vs IT Act', status: 'pending', remarks: '' },
      { clause: '18', description: 'TDS Compliance', status: 'pending', remarks: '' },
      { clause: '19', description: 'Sec 43B Payments', status: 'pending', remarks: '' },
      { clause: '21(a)', description: 'Cash payments > Rs.10,000', status: 'pending', remarks: '' },
      { clause: '26', description: 'TDS/TCS Compliance', status: 'pending', remarks: '' },
      { clause: '27(a)', description: 'Tax paid — advance tax, TDS', status: 'pending', remarks: '' },
      { clause: '40', description: 'GST Turnover Reconciliation', status: 'pending', remarks: '' },
      { clause: '44', description: 'Expenditure by way of penalty or fine', status: 'pending', remarks: '' },
    ]);
  }, [company, turnover]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const entityConfig = getEntityConfig(company.entity_type);
  const auditForm = entityConfig.nav.auditForm;

  const totalExpenses = balances.filter(b => ['Direct Expenses', 'Cost of Materials Consumed', 'Purchases of Stock-in-Trade', 'Employee Benefits Expense', 'Finance Costs', 'Depreciation & Amortisation', 'Other Expenses — Administration', 'Other Expenses — Selling', 'Other Expenses — Write-offs', 'Other Expenses', 'Indirect Expenses', 'Purchases', 'Admin Expenses', 'Office Expenses'].includes(b.account_group)).reduce((s, b) => s + b.balance, 0);

  const updateCheck = (index: number, field: keyof AuditCheckItem, value: string) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    setChecklist(updated);
  };

  const verified = checklist.filter(c => c.status === 'verified').length;
  const pending = checklist.filter(c => c.status === 'pending').length;

  const exportColumns = [
    { header: 'Clause', key: 'clause' },
    { header: 'Description', key: 'description' },
    { header: 'Status', key: 'status' },
    { header: 'Auto Value', key: 'autoValue' },
    { header: 'Remarks', key: 'remarks' },
  ];

  const tabs = auditForm === '3CA' ? ['3CA', '3CD'] : auditForm === '3CB' ? ['3CB', '3CD'] : auditForm === '10B' ? ['10B'] : ['3CD'];

  return (
    <div>
      <PageHeader title={`Tax Audit — Form ${auditForm}`} description="Tax audit working papers and Form 3CD preparation">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title={`Tax Audit Form ${auditForm}`} companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={exportColumns} data={checklist} />
        </div>
      </PageHeader>

      {/* Progress */}
      {!loading && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Verified</p>
            <p className="text-lg font-bold text-green-700">{verified} / {checklist.length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold text-yellow-700">{pending}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Turnover (auto)</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(turnover)}</p>
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="mb-4 flex border border-gray-200 rounded-xl overflow-hidden w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            Form {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name} · PAN: {company.entity_details?.pan || '—'}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Form 3CD — Statement of Particulars</h3>
            <p className="text-xs text-gray-400 mt-0.5">FY {fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Clause</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Auto Value</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item, i) => (
                  <tr key={item.clause} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.clause}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{item.description}</td>
                    <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.autoValue || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <select
                        value={item.status}
                        onChange={e => updateCheck(i, 'status', e.target.value)}
                        className={`px-2 py-0.5 rounded text-xs border ${
                          item.status === 'verified' ? 'bg-green-100 text-green-700 border-green-200' :
                          item.status === 'na' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="na">N/A</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={e => updateCheck(i, 'remarks', e.target.value)}
                        className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Remarks..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
