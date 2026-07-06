'use client';

import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';

interface Member {
  name: string;
  fatherName: string;
  address: string;
  dateOfAdmission: string;
  sharesPurchased: string;
  shareValue: string;
  nominalValue: string;
  dateOfCessation: string;
  remarks: string;
}

export default function MemberRegisterPage() {
  const { company, loading: companyLoading } = useCompany();
  const [members, setMembers] = useState<Member[]>([
    { name: '', fatherName: '', address: '', dateOfAdmission: '', sharesPurchased: '', shareValue: '', nominalValue: '', dateOfCessation: '', remarks: '' },
  ]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const p = (v: string) => parseFloat(v) || 0;

  const updateMember = (index: number, field: keyof Member, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const totalShares = members.reduce((s, m) => s + p(m.sharesPurchased), 0);
  const totalValue = members.reduce((s, m) => s + p(m.shareValue), 0);
  const activeMembers = members.filter(m => m.name && !m.dateOfCessation);

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Name', key: 'name' },
    { header: "Father's Name", key: 'fatherName' },
    { header: 'Address', key: 'address' },
    { header: 'Date of Admission', key: 'dateOfAdmission' },
    { header: 'Shares', key: 'sharesPurchased' },
    { header: 'Value (₹)', key: 'shareValue', align: 'right' as const, isMono: true },
    { header: 'Date of Cessation', key: 'dateOfCessation' },
    { header: 'Remarks', key: 'remarks' },
  ];

  const data = members.filter(m => m.name).map((m, i) => ({ sno: i + 1, ...m }));

  return (
    <div>
      <PageHeader title="Member / Share Register" description="Register of members and shareholding details">
        <ExportButtons title="Member Register" companyName={company.name} entityType={entityLabel} dateRange="" columns={columns} data={data} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Members</p>
          <p className="text-lg font-bold text-blue-700">{activeMembers.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Shares</p>
          <p className="text-lg font-bold font-mono text-green-700">{totalShares.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Value</p>
          <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalValue)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{company.name}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Register of Members</h3>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-10">S.No</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Father&apos;s Name</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Admission</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Shares</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Value (₹)</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Cessation</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                  <td className="px-2 py-1"><input type="text" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} className="w-full px-1 py-0.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Name" /></td>
                  <td className="px-2 py-1"><input type="text" value={m.fatherName} onChange={e => updateMember(i, 'fatherName', e.target.value)} className="w-full px-1 py-0.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Father" /></td>
                  <td className="px-2 py-1"><input type="text" value={m.address} onChange={e => updateMember(i, 'address', e.target.value)} className="w-full px-1 py-0.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Address" /></td>
                  <td className="px-2 py-1"><input type="date" value={m.dateOfAdmission} onChange={e => updateMember(i, 'dateOfAdmission', e.target.value)} className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1"><input type="number" value={m.sharesPurchased} onChange={e => updateMember(i, 'sharesPurchased', e.target.value)} className="w-full px-1 py-0.5 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" /></td>
                  <td className="px-2 py-1"><input type="number" value={m.shareValue} onChange={e => updateMember(i, 'shareValue', e.target.value)} className="w-full px-1 py-0.5 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" /></td>
                  <td className="px-2 py-1"><input type="date" value={m.dateOfCessation} onChange={e => updateMember(i, 'dateOfCessation', e.target.value)} className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1"><input type="text" value={m.remarks} onChange={e => updateMember(i, 'remarks', e.target.value)} className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-200">
          <button onClick={() => setMembers([...members, { name: '', fatherName: '', address: '', dateOfAdmission: '', sharesPurchased: '', shareValue: '', nominalValue: '', dateOfCessation: '', remarks: '' }])} className="text-xs text-blue-600 hover:underline">+ Add member</button>
        </div>
      </div>
    </div>
  );
}
