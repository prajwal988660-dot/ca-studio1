'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface Policy {
  heading: string;
  content: string;
}

const DEFAULT_POLICIES: Policy[] = [
  { heading: 'Basis of Preparation', content: 'The financial statements have been prepared on accrual basis under the historical cost convention in accordance with the generally accepted accounting principles in India and comply with the Accounting Standards issued by ICAI.' },
  { heading: 'Revenue Recognition', content: 'Revenue is recognized when the significant risks and rewards of ownership are transferred, revenue can be reliably measured, and it is probable that economic benefits will flow to the entity.' },
  { heading: 'Fixed Assets & Depreciation', content: 'Fixed assets are stated at cost less accumulated depreciation. Depreciation is provided on Written Down Value (WDV) method at the rates prescribed under Schedule II of the Companies Act, 2013 / Income Tax Act.' },
  { heading: 'Inventories', content: 'Inventories are valued at lower of cost or net realizable value. Cost is determined using Weighted Average / FIFO method.' },
  { heading: 'Employee Benefits', content: 'Short-term employee benefits are recognized as expense at undiscounted amount. Post-employment benefits like gratuity and PF are accounted as per applicable Accounting Standards.' },
  { heading: 'Taxation', content: 'Current tax is determined based on taxable income computed under the Income Tax Act, 1961. Deferred tax is recognized on timing differences between book profit and taxable profit using the enacted tax rates.' },
  { heading: 'Provisions and Contingencies', content: 'Provisions are recognized when there is a present obligation as a result of past events and it is probable that an outflow of resources will be required. Contingent liabilities are disclosed by way of notes.' },
  { heading: 'Cash and Cash Equivalents', content: 'Cash and cash equivalents include cash in hand, bank balances, and short-term deposits with original maturity of three months or less.' },
];

export default function AccountingPoliciesPage() {
  const { company, loading: companyLoading } = useCompany();
  const [policies, setPolicies] = useState<Policy[]>(DEFAULT_POLICIES);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const updatePolicy = (index: number, field: keyof Policy, value: string) => {
    const updated = [...policies];
    updated[index] = { ...updated[index], [field]: value };
    setPolicies(updated);
  };

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Policy', key: 'heading' },
    { header: 'Description', key: 'content' },
  ];

  const data = policies.map((p, i) => ({ sno: i + 1, ...p }));

  return (
    <div>
      <PageHeader title="Significant Accounting Policies" description="Notes to accounts — accounting policies disclosure">
        <ExportButtons title="Accounting Policies" companyName={company.name} entityType={entityLabel} dateRange="" columns={columns} data={data} />
      </PageHeader>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Significant Accounting Policies</h3>
            <p className="text-xs text-gray-400 mt-0.5">Notes forming part of the Financial Statements</p>
          </div>
        <div className="p-6 space-y-4">
          {policies.map((policy, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-gray-500 mt-1">{i + 1}.</span>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={policy.heading}
                    onChange={e => updatePolicy(i, 'heading', e.target.value)}
                    className="w-full px-2 py-1 text-sm font-bold border border-transparent hover:border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={policy.content}
                    onChange={e => updatePolicy(i, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1 text-sm text-gray-700 border border-transparent hover:border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-y"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-gray-200">
          <button onClick={() => setPolicies([...policies, { heading: '', content: '' }])} className="text-xs text-blue-600 hover:underline">+ Add policy</button>
        </div>
      </div>
    </div>
  );
}
