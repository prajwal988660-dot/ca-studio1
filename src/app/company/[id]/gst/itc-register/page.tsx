'use client';

import { useState, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { ExportButtons } from '@/components/export/ExportButtons';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { computeITCFromPurchases } from '@/lib/accounting/gstComputeFromInvoices';
import {
  listPurchaseInvoices,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
} from '@/lib/accounting/gstInvoices';
import type { PurchaseInvoice } from '@/lib/accounting/gstInvoices';
import type { EntityType } from '@/types/company';

function getITCStatus(p: PurchaseInvoice): 'available' | 'blocked' | 'reversed' {
  if (!p.itc_eligible) return 'blocked';
  if (p.itc_status?.startsWith('BLOCKED_') || p.itc_status?.startsWith('INELIGIBLE_')) return 'blocked';
  if (p.itc_status?.startsWith('REVERSED_')) return 'reversed';
  return 'available';
}

type EditForm = {
  vendor_name: string;
  vendor_gstin: string;
  vendor_invoice_no: string;
  invoice_date: string;
  place_of_supply_state: string;
  supply_type: string;
  taxable_value: string;
  gst_rate: string;
  itc_eligible: boolean;
};

function toEditForm(p: PurchaseInvoice): EditForm {
  return {
    vendor_name: p.vendor_name || '',
    vendor_gstin: p.vendor_gstin || '',
    vendor_invoice_no: p.vendor_invoice_no || '',
    invoice_date: p.invoice_date || '',
    place_of_supply_state: p.place_of_supply_state || '',
    supply_type: p.supply_type || 'INTRA',
    taxable_value: String(p.taxable_value || ''),
    gst_rate: String(p.gst_rate || ''),
    itc_eligible: p.itc_eligible ?? true,
  };
}

export default function ITCRegisterPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [tick, setTick] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const purchases = useMemo(() => {
    if (!companyId) return [];
    return listPurchaseInvoices(companyId).filter(
      (p) => p.invoice_date >= fromDate && p.invoice_date <= toDate,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fromDate, toDate, tick]);

  const itcRows = useMemo(() => computeITCFromPurchases(purchases), [purchases]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const totalCGST = itcRows.reduce((s, r) => s + r.cgst, 0);
  const totalSGST = itcRows.reduce((s, r) => s + r.sgst, 0);
  const totalIGST = itcRows.reduce((s, r) => s + r.igst, 0);
  const totalITC = totalCGST + totalSGST + totalIGST;

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Supplier', key: 'supplierName' },
    { header: 'GSTIN', key: 'gstin' },
    { header: 'Invoice No.', key: 'invoiceNumber' },
    { header: 'CGST (₹)', key: 'cgst', align: 'right' as const, isMono: true },
    { header: 'SGST (₹)', key: 'sgst', align: 'right' as const, isMono: true },
    { header: 'IGST (₹)', key: 'igst', align: 'right' as const, isMono: true },
    { header: 'Total ITC (₹)', key: 'total', align: 'right' as const, isMono: true },
    { header: 'Status', key: 'status' },
  ];
  const data = itcRows.map((r, i) => ({ sno: i + 1, ...r }));

  const handleEdit = (p: PurchaseInvoice) => {
    setEditingId(p.id);
    setEditForm(toEditForm(p));
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm) return;
    updatePurchaseInvoice(editingId, {
      vendor_name: editForm.vendor_name,
      vendor_gstin: editForm.vendor_gstin || undefined,
      vendor_invoice_no: editForm.vendor_invoice_no || undefined,
      invoice_date: editForm.invoice_date,
      place_of_supply_state: editForm.place_of_supply_state,
      supply_type: editForm.supply_type as PurchaseInvoice['supply_type'],
      taxable_value: parseFloat(editForm.taxable_value) || 0,
      gst_rate: parseFloat(editForm.gst_rate) || 0,
      itc_eligible: editForm.itc_eligible,
    });
    setEditingId(null);
    setEditForm(null);
    setTick((t) => t + 1);
  };

  const handleDelete = (p: PurchaseInvoice) => {
    if (!window.confirm(`Delete purchase invoice from ${p.vendor_name || 'Unknown'} (${p.invoice_no || p.vendor_invoice_no})? This will remove it from the ITC register. Journal entries are NOT affected.`)) return;
    deletePurchaseInvoice(p.id);
    setTick((t) => t + 1);
  };

  const inp = (val: string, onChange: (v: string) => void, placeholder?: string, type?: string) => (
    <input
      type={type || 'text'}
      value={val}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-7 w-full rounded border border-gray-300 px-2 text-xs focus:border-blue-400 focus:outline-none"
    />
  );

  return (
    <div>
      <PageHeader title="ITC Register" description="Input Tax Credit register — all GST credits from purchases">
        <div className="flex flex-col gap-2 items-end">
          <DateRangeFilter fromDate={fromDate} toDate={toDate} onDateChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <ExportButtons title="ITC Register" companyName={company.name} entityType={entityLabel} dateRange={`${fromDate} to ${toDate}`} columns={columns} data={data} />
        </div>
      </PageHeader>

      {itcRows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">CGST ITC</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalCGST)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">SGST ITC</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalSGST)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">IGST ITC</p>
            <p className="text-lg font-bold font-mono text-blue-700">{formatIndianCurrency(totalIGST)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total ITC Available</p>
            <p className="text-lg font-bold font-mono text-green-700">{formatIndianCurrency(totalITC)}</p>
          </div>
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">No ITC records found. Create purchase invoices in the GST Invoice Portal with ITC-eligible status.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-center py-3 border-b border-gray-200 bg-gray-50/50">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{company.name} | GSTIN: {company.gst_details?.gstin || '—'}</p>
            <h3 className="text-sm font-bold text-gray-900">Input Tax Credit (ITC) Register</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fromDate} to {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.header}</th>
                  ))}
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => {
                  const status = getITCStatus(p);
                  const cgst = p.cgst;
                  const sgst = p.sgst;
                  const igst = p.igst;
                  const total = cgst + sgst + igst;
                  const invoiceNo = p.invoice_no || p.vendor_invoice_no || '—';
                  const isEditing = editingId === p.id;
                  return (
                    <>
                      <tr key={p.id} className={`border-b border-gray-100 ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{p.invoice_date}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 text-sm">{p.vendor_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.vendor_gstin || '—'}</td>
                        <td className="px-3 py-2 text-sm">{invoiceNo}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{cgst > 0 ? formatIndianCurrency(cgst) : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{sgst > 0 ? formatIndianCurrency(sgst) : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums">{igst > 0 ? formatIndianCurrency(igst) : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums font-semibold">{formatIndianCurrency(total)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            status === 'available' ? 'bg-green-100 text-green-700' :
                            status === 'blocked' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => isEditing ? (setEditingId(null), setEditForm(null)) : handleEdit(p)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${isEditing ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                            >
                              {isEditing ? 'Cancel' : '✎ Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="px-2 py-0.5 rounded text-[11px] font-medium border bg-white text-red-500 border-red-200 hover:bg-red-50 transition-colors"
                            >
                              × Del
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isEditing && editForm && (
                        <tr key={`${p.id}-edit`} className="bg-green-50 border-b border-green-200">
                          <td colSpan={11} className="px-4 py-4">
                            <div className="border border-dashed border-green-300 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-green-700">Edit Purchase Invoice</span>
                                <span className="text-[10px] text-gray-400">Journal entries are not affected</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Supplier Name</label>
                                  {inp(editForm.vendor_name, (v) => setEditForm({ ...editForm, vendor_name: v }), 'ABC Pvt Ltd')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Supplier GSTIN</label>
                                  {inp(editForm.vendor_gstin, (v) => setEditForm({ ...editForm, vendor_gstin: v.toUpperCase() }), '29AAAAA0000A1Z5')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Invoice No. (Supplier's)</label>
                                  {inp(editForm.vendor_invoice_no, (v) => setEditForm({ ...editForm, vendor_invoice_no: v }), 'INV-001')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Invoice Date</label>
                                  {inp(editForm.invoice_date, (v) => setEditForm({ ...editForm, invoice_date: v }), 'YYYY-MM-DD', 'date')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Place of Supply</label>
                                  {inp(editForm.place_of_supply_state, (v) => setEditForm({ ...editForm, place_of_supply_state: v }), '29 – Karnataka')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Supply Type</label>
                                  <select
                                    value={editForm.supply_type}
                                    onChange={(e) => setEditForm({ ...editForm, supply_type: e.target.value })}
                                    className="h-7 w-full rounded border border-gray-300 px-2 text-xs focus:border-blue-400 focus:outline-none"
                                  >
                                    <option value="INTRA">INTRA (CGST + SGST)</option>
                                    <option value="INTER">INTER (IGST)</option>
                                    <option value="INTRA_UNION_TERRITORY">INTRA – Union Territory</option>
                                    <option value="ZERO_RATED">Zero Rated</option>
                                    <option value="EXEMPT">Exempt</option>
                                    <option value="RCM">Reverse Charge (RCM)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">Taxable Value (₹)</label>
                                  {inp(editForm.taxable_value, (v) => setEditForm({ ...editForm, taxable_value: v }), '0', 'number')}
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">GST Rate (%)</label>
                                  {inp(editForm.gst_rate, (v) => setEditForm({ ...editForm, gst_rate: v }), '18', 'number')}
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editForm.itc_eligible}
                                    onChange={(e) => setEditForm({ ...editForm, itc_eligible: e.target.checked })}
                                    className="rounded"
                                  />
                                  <span className="text-xs font-medium text-gray-700">ITC Eligible</span>
                                </label>
                                <p className="text-[10px] text-gray-400">Uncheck to mark as blocked u/s 17(5)</p>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                                >
                                  Save Changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(null); setEditForm(null); }}
                                  className="px-4 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="px-3 py-2" colSpan={5}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalCGST)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalSGST)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalIGST)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatIndianCurrency(totalITC)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-yellow-50 text-xs text-yellow-700">
            <p className="font-medium">Blocked Credits u/s 17(5):</p>
            <p>Motor vehicles (personal use), Food &amp; beverages, Club membership, Health insurance, Beauty treatment, Personal consumption, Works contract (immovable property), Free samples.</p>
          </div>
        </div>
      )}
    </div>
  );
}
