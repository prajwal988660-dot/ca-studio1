'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButtons } from '@/components/export/ExportButtons';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import {
  getContingentItems,
  setContingentItems,
  addContingentItem,
  type ContingentItem,
} from '@/lib/contingentLiabilitiesStore';

const CATEGORIES_LIABILITY = [
  'Claims not acknowledged as debt',
  'Guarantees',
  'Bills of exchange discounted',
  'Other money for which the company is contingently liable',
  'Other',
];

const CATEGORIES_ASSET = ['Claims/refunds not acknowledged', 'Other'];

export default function ContingentLiabilitiesPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const [items, setItems] = useState<ContingentItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'liability' as 'liability' | 'asset', description: '', amount: 0, category: '' });

  useEffect(() => {
    if (companyId) setItems(getContingentItems(companyId));
  }, [companyId]);

  const persist = (next: ContingentItem[]) => {
    if (companyId) {
      setContingentItems(companyId, next);
      setItems(next);
    }
  };

  const handleAdd = () => {
    if (!companyId || !form.description.trim()) return;
    const next = addContingentItem(companyId, {
      type: form.type,
      description: form.description.trim(),
      amount: form.amount,
      category: form.category || undefined,
    });
    setItems(next);
    setForm({ type: 'liability', description: '', amount: 0, category: '' });
  };

  const handleUpdate = (id: string, patch: Partial<ContingentItem>) => {
    if (!companyId) return;
    const next = getContingentItems(companyId).map((i) => (i.id === id ? { ...i, ...patch } : i));
    persist(next);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    if (!companyId) return;
    persist(getContingentItems(companyId).filter((i) => i.id !== id));
  };

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const liabilities = items.filter((i) => i.type === 'liability');
  const assets = items.filter((i) => i.type === 'asset');
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  const totalAssets = assets.reduce((s, i) => s + i.amount, 0);

  const exportColumns = [
    { header: 'Type', key: 'type' },
    { header: 'Description', key: 'description' },
    { header: 'Category', key: 'category' },
    { header: 'Amount (₹)', key: 'amount', align: 'right' as const, isMono: true },
  ];
  const exportData = items.map((i) => ({ type: i.type, description: i.description, category: i.category ?? '', amount: i.amount }));

  return (
    <div>
      <PageHeader
        title="Contingent Liabilities & Contingent Assets (AS 29)"
        description="Disclosures for guarantees, claims not acknowledged as debt, and contingent assets — link to Balance Sheet Notes"
      >
        <ExportButtons
          title="Contingent Liabilities and Assets"
          companyName={company.name}
          entityType={entityLabel}
          dateRange="As at reporting date"
          columns={exportColumns}
          data={exportData}
        />
      </PageHeader>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Add item</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'liability' | 'asset' }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="liability">Contingent Liability</option>
                <option value="asset">Contingent Asset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">— Select —</option>
                {(form.type === 'liability' ? CATEGORIES_LIABILITY : CATEGORIES_ASSET).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Bank guarantee for ₹10,00,000"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-48">Category</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Amount (₹)</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-gray-500 text-center">
                    No contingent liabilities or assets. Add items above; they will appear in Balance Sheet Notes (Note 17).
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 capitalize">{item.type}</td>
                  <td className="px-3 py-2">
                    {editingId === item.id ? (
                      <input
                        value={item.description}
                        onChange={(e) => handleUpdate(item.id, { description: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span onDoubleClick={() => setEditingId(item.id)}>{item.description}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.category ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(item.amount)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-600">
                  Contingent Liabilities total
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatIndianCurrency(totalLiabilities)}</td>
                <td />
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-600">
                  Contingent Assets total
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatIndianCurrency(totalAssets)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
          This schedule is linked to Balance Sheet Notes (Note 17 — Contingent Liabilities & Contingent Assets). Export from here or view in BS Notes.
        </p>
      </div>
    </div>
  );
}
