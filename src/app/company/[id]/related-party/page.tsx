'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface RelatedPartyTransaction {
  partyName: string;
  relationship: string;
  transactionType: string;
  amount: string;
  outstanding: string;
}

const RELATIONSHIPS = [
  'Key Management Personnel',
  'Subsidiary',
  'Associate',
  'Joint Venture',
  'Relative of KMP',
  'Entity controlled by KMP',
  'Other',
];

export default function RelatedPartyPage() {
  const { company, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);

  const [transactions, setTransactions] = useState<RelatedPartyTransaction[]>([
    { partyName: '', relationship: 'Key Management Personnel', transactionType: 'Remuneration', amount: '', outstanding: '' },
  ]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const p = (v: string) => parseFloat(v) || 0;

  const updateTxn = (index: number, field: keyof RelatedPartyTransaction, value: string) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  const totalAmount = transactions.reduce((s, t) => s + p(t.amount), 0);
  const totalOutstanding = transactions.reduce((s, t) => s + p(t.outstanding), 0);

  const columns = [
    { header: 'Party Name', key: 'partyName' },
    { header: 'Relationship', key: 'relationship' },
    { header: 'Transaction Type', key: 'transactionType' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
    { header: 'Outstanding (₹)', key: 'outstanding', align: 'right' as const, isMono: true },
  ];

  const exportData = transactions.filter(t => t.partyName).map(t => ({
    ...t,
    amount: p(t.amount),
    outstanding: p(t.outstanding),
  }));

  return (
    <div>
      <PageHeader title="Related Party Disclosures (AS-18)" description="Transactions with related parties — mandatory for companies">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="Related Party Disclosures" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={exportData} />
        </div>
      </PageHeader>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Related Party Disclosures (AS-18)</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Transaction Type</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Outstanding (₹)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <input type="text" value={txn.partyName} onChange={e => updateTxn(i, 'partyName', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Name" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={txn.relationship} onChange={e => updateTxn(i, 'relationship', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={txn.transactionType} onChange={e => updateTxn(i, 'transactionType', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Type" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={txn.amount} onChange={e => updateTxn(i, 'amount', e.target.value)} className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={txn.outstanding} onChange={e => updateTxn(i, 'outstanding', e.target.value)} className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                <td className="px-3 py-2" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalAmount)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalOutstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-200">
          <button onClick={() => setTransactions([...transactions, { partyName: '', relationship: 'Key Management Personnel', transactionType: '', amount: '', outstanding: '' }])} className="text-xs text-blue-600 hover:underline">+ Add transaction</button>
        </div>
      </div>
    </div>
  );
}
