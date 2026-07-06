'use client';

import { useMemo, useState } from 'react';
import {
  listInvoicesV2,
  listPurchaseInvoices,
  createInvoiceV2,
  createReturnFromInvoiceV2,
  createReturnFromPurchaseInvoiceLegacy,
  type InvoiceV2,
  type PurchaseInvoice,
  type CdnReason,
  type ReturnItemInput,
} from '@/lib/accounting/gstInvoices';
import { createReturnJournalEntry } from '@/lib/accounting/invoiceJournalSync';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CDN_REASON_OPTIONS: Array<{ value: CdnReason; label: string }> = [
  { value: 'SALES_RETURN', label: 'Sales Return' },
  { value: 'PRICE_REDUCTION', label: 'Price Reduction' },
  { value: 'DEFICIENCY_SERVICE', label: 'Deficiency in Service' },
  { value: 'POST_SALE_DISCOUNT', label: 'Post-Sale Discount' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'OTHER', label: 'Other' },
];

const PURCHASE_REASON_OPTIONS: Array<{ value: CdnReason; label: string }> = [
  { value: 'SALES_RETURN', label: 'Purchase Return' },
  { value: 'PRICE_REDUCTION', label: 'Price Difference' },
  { value: 'CORRECTION', label: 'Wrong/Defective Goods' },
  { value: 'OTHER', label: 'Other' },
];

type SourceInvoice =
  | { kind: 'v2'; data: InvoiceV2 }
  | { kind: 'v1'; data: PurchaseInvoice };

interface ReturnItem {
  itemIndex: number;
  description: string;
  origQty: number;
  rate: number;
  gstRate: number;
  returnQty: number;
}

function buildReturnItems(source: SourceInvoice): ReturnItem[] {
  if (source.kind === 'v2') {
    return source.data.items.map((item, i) => ({
      itemIndex: i,
      description: item.description,
      origQty: item.qty,
      rate: item.rate,
      gstRate: item.gst_rate,
      returnQty: item.qty,
    }));
  }
  // Legacy V1 purchase invoice — synthesize single row
  const inv = source.data;
  return [{
    itemIndex: 0,
    description: inv.item_description || 'Purchase',
    origQty: inv.item_qty ?? 1,
    rate: inv.item_rate ?? inv.taxable_value,
    gstRate: inv.gst_rate,
    returnQty: inv.item_qty ?? 1,
  }];
}

interface ReturnModalProps {
  companyId: string;
  returnType: 'SALES' | 'PURCHASE';
  onClose: () => void;
  onSave: () => void;
}

export function ReturnModal({ companyId, returnType, onClose, onSave }: ReturnModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const sourceInvoices = useMemo((): SourceInvoice[] => {
    if (returnType === 'SALES') {
      return listInvoicesV2(companyId)
        .filter((inv) => inv.doc_type === 'TAX_INVOICE' || inv.doc_type === 'BILL_OF_SUPPLY')
        .map((inv) => ({ kind: 'v2' as const, data: inv }));
    }
    // Purchase: show V1 non-return purchase invoices
    return listPurchaseInvoices(companyId)
      .filter((inv) => inv.bucket !== 'CDNR')
      .map((inv) => ({ kind: 'v1' as const, data: inv }));
  }, [companyId, returnType]);

  const [selectedId, setSelectedId] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnDate, setReturnDate] = useState(today);
  const [reason, setReason] = useState<CdnReason>(
    returnType === 'SALES' ? 'SALES_RETURN' : 'SALES_RETURN'
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSource = useMemo(
    () => sourceInvoices.find((s) => s.data.id === selectedId) ?? null,
    [sourceInvoices, selectedId]
  );

  function handleSelectInvoice(id: string) {
    setSelectedId(id);
    setError('');
    const source = sourceInvoices.find((s) => s.data.id === id);
    if (source) setReturnItems(buildReturnItems(source));
    else setReturnItems([]);
  }

  function updateReturnQty(idx: number, rawValue: string) {
    const parsed = parseFloat(rawValue);
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i !== idx
          ? item
          : { ...item, returnQty: isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), item.origQty) }
      )
    );
  }

  const totals = useMemo(() => {
    let taxable = 0;
    let gstAmount = 0;
    for (const item of returnItems) {
      if (item.returnQty <= 0) continue;
      const proportion = item.origQty > 0 ? item.returnQty / item.origQty : 0;
      const origTaxable = item.origQty * item.rate;
      const itemTaxable = origTaxable * proportion;
      taxable += itemTaxable;
      gstAmount += itemTaxable * (item.gstRate / 100);
    }
    return { taxable, gstAmount, total: taxable + gstAmount };
  }, [returnItems]);

  function handleSelectAll() {
    setReturnItems((prev) => prev.map((item) => ({ ...item, returnQty: item.origQty })));
  }

  function handleClearAll() {
    setReturnItems((prev) => prev.map((item) => ({ ...item, returnQty: 0 })));
  }

  async function handleSave() {
    if (!selectedSource) { setError('Please select an invoice.'); return; }
    const hasItems = returnItems.some((r) => r.returnQty > 0);
    if (!hasItems) { setError('Enter a return quantity for at least one item.'); return; }
    if (!returnDate) { setError('Return date is required.'); return; }

    setSaving(true);
    try {
      let draft;
      if (selectedSource.kind === 'v2') {
        const inputs: ReturnItemInput[] = returnItems.map((r) => ({
          itemIndex: r.itemIndex,
          returnQty: r.returnQty,
        }));
        draft = createReturnFromInvoiceV2(
          selectedSource.data,
          inputs,
          returnDate,
          reason,
          returnType
        );
      } else {
        // V1 purchase invoice — return by taxable amount
        const taxableToReturn = returnItems.reduce((sum, r) => {
          if (r.returnQty <= 0) return sum;
          const proportion = r.origQty > 0 ? r.returnQty / r.origQty : 0;
          return sum + (r.origQty * r.rate) * proportion;
        }, 0);
        draft = createReturnFromPurchaseInvoiceLegacy(
          selectedSource.data,
          Math.round(taxableToReturn * 100) / 100,
          returnDate,
          reason
        );
      }

      const savedInvoice = createInvoiceV2(companyId, draft);
      createReturnJournalEntry(companyId, savedInvoice);
      onSave();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create return.');
    } finally {
      setSaving(false);
    }
  }

  const reasonOptions = returnType === 'SALES' ? CDN_REASON_OPTIONS : PURCHASE_REASON_OPTIONS;
  const title = returnType === 'SALES' ? 'New Sales Return (Credit Note)' : 'New Purchase Return (Debit Note)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Invoice selection */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Select Original Invoice
            </label>
            <select
              value={selectedId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Choose invoice —</option>
              {sourceInvoices.map((s) => {
                const inv = s.data;
                const party = s.kind === 'v2' ? (inv as InvoiceV2).buyer_name : (inv as PurchaseInvoice).vendor_name;
                const total = s.kind === 'v2' ? (inv as InvoiceV2).total_amount : (inv as PurchaseInvoice).total;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} · {inv.invoice_date} · {party} · ₹{inr(total)}
                  </option>
                );
              })}
            </select>
            {sourceInvoices.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                No {returnType === 'SALES' ? 'sales invoices' : 'purchase invoices'} found. Create some first.
              </p>
            )}
          </div>

          {/* Selected invoice summary */}
          {selectedSource && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px]">
              {selectedSource.kind === 'v2' ? (
                <>
                  <span className="font-semibold text-gray-700">{selectedSource.data.buyer_name}</span>
                  {selectedSource.data.buyer_gstin && (
                    <span className="ml-2 font-mono text-gray-500">{selectedSource.data.buyer_gstin}</span>
                  )}
                  <span className="ml-3 text-gray-500">Supply: {selectedSource.data.supply_type}</span>
                  <span className="ml-3 text-gray-500">GSTR-1: {selectedSource.data.gstr1_table}</span>
                  <span className="ml-3 font-semibold text-gray-800">₹{inr(selectedSource.data.total_amount)}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-gray-700">{selectedSource.data.vendor_name}</span>
                  {selectedSource.data.vendor_gstin && (
                    <span className="ml-2 font-mono text-gray-500">{selectedSource.data.vendor_gstin}</span>
                  )}
                  <span className="ml-3 text-gray-500">Supply: {selectedSource.data.supply_type}</span>
                  <span className="ml-3 font-semibold text-gray-800">₹{inr(selectedSource.data.total)}</span>
                </>
              )}
            </div>
          )}

          {/* Return items table */}
          {returnItems.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Return Items
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] font-semibold text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] font-semibold text-gray-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full min-w-[540px] text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Orig Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">GST%</th>
                      <th className="px-3 py-2 text-right">Return Qty</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, i) => {
                      const proportion = item.origQty > 0 ? item.returnQty / item.origQty : 0;
                      const amt = item.origQty * item.rate * proportion;
                      return (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-500">{item.itemIndex + 1}</td>
                          <td className="max-w-[180px] truncate px-3 py-2 font-medium text-gray-700">
                            {item.description || '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {item.origQty}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {inr(item.rate)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.gstRate}%</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={item.origQty}
                              step="any"
                              value={item.returnQty === 0 ? '' : item.returnQty}
                              placeholder="0"
                              onChange={(e) => updateReturnQty(i, e.target.value)}
                              className="w-20 rounded border border-gray-200 px-2 py-0.5 text-right font-mono text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                            {inr(amt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Return details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Return Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as CdnReason)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {reasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-derived totals */}
          {selectedSource && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Auto-Derived
              </p>
              <div className="flex flex-wrap gap-4 text-[11px]">
                <span>
                  <span className="text-gray-400">Doc Type: </span>
                  <span className="font-semibold text-gray-700">
                    {returnType === 'SALES' ? 'Credit Note' : 'Debit Note'}
                  </span>
                </span>
                {selectedSource.kind === 'v2' && (
                  <span>
                    <span className="text-gray-400">GSTR-1: </span>
                    <span className="font-semibold text-gray-700">
                      {selectedSource.data.buyer_gstin ? 'CDNR' : 'CDNUR'}
                    </span>
                  </span>
                )}
                <span>
                  <span className="text-gray-400">Taxable: </span>
                  <span className="font-mono font-semibold text-gray-800">₹{inr(totals.taxable)}</span>
                </span>
                <span>
                  <span className="text-gray-400">GST: </span>
                  <span className="font-mono font-semibold text-gray-800">₹{inr(totals.gstAmount)}</span>
                </span>
                <span>
                  <span className="text-gray-400">Total Return: </span>
                  <span className="font-mono text-base font-bold text-gray-900">₹{inr(totals.total)}</span>
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedId}
            className="h-9 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : returnType === 'SALES' ? 'Create Credit Note' : 'Create Debit Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
