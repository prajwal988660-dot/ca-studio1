'use client';

import { useMemo, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReturnModal } from '@/components/invoices/ReturnModal';
import {
  listPurchaseInvoices,
  listInvoicesV2,
  deleteInvoiceV2,
  deletePurchaseInvoice,
  type CdnReason,
} from '@/lib/accounting/gstInvoices';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CDN_REASON_LABELS: Record<CdnReason, string> = {
  SALES_RETURN: 'Purchase Return',
  PRICE_REDUCTION: 'Price Reduction',
  DEFICIENCY_SERVICE: 'Deficiency in Service',
  POST_SALE_DISCOUNT: 'Post-Sale Discount',
  CORRECTION: 'Correction/Defective',
  OTHER: 'Other',
};

const LEGACY_REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Defective Goods',
  WRONG_ITEM: 'Wrong Item Received',
  EXCESS_QTY: 'Excess Quantity',
  QUALITY: 'Quality Issue',
  PRICE_DIFF: 'Price Difference',
  OTHER: 'Other',
};

function parseLegacyReason(purchaseSubType: string | undefined): string {
  if (!purchaseSubType) return '—';
  const code = purchaseSubType.replace(/^DN-/, '');
  return LEGACY_REASON_LABELS[code] || code || '—';
}

export default function PurchaseReturnsPage() {
  const { company, companyId, loading } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // V2 debit notes (new system)
  const v2DebitNotes = useMemo(() => {
    if (!companyId) return [];
    return listInvoicesV2(companyId)
      .filter((inv) => inv.doc_type === 'DEBIT_NOTE')
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [companyId, tick]);

  // V1 legacy debit notes
  const legacyDebitNotes = useMemo(() => {
    if (!companyId) return [];
    return listPurchaseInvoices(companyId)
      .filter((inv) => inv.bucket === 'CDNR')
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [companyId, tick]);

  const v2Total = v2DebitNotes.reduce((s, r) => s + r.total_amount, 0);
  const legacyTotal = legacyDebitNotes.reduce((s, r) => s + r.total, 0);
  const totalAmount = v2Total + legacyTotal;
  const totalCount = v2DebitNotes.length + legacyDebitNotes.length;

  if (loading || !company || !companyId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Purchase Returns" description="Debit notes issued to vendors">
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New Purchase Return
        </button>
      </PageHeader>

      {isModalOpen && (
        <ReturnModal
          companyId={companyId}
          returnType="PURCHASE"
          onClose={() => setIsModalOpen(false)}
          onSave={() => setTick((x) => x + 1)}
        />
      )}

      {/* ── Summary Card ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Debit Notes</p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900">
          <span className="text-sm text-gray-400">&#8377;</span>{inr(totalAmount)}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">{totalCount} note{totalCount !== 1 ? 's' : ''} issued</p>
      </div>

      {/* ── V2 Debit Notes Table ── */}
      {v2DebitNotes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-bold text-gray-800">Debit Notes</h3>
            <span className="text-[11px] text-gray-400">{v2DebitNotes.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">DN No</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Original Inv</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                  <th className="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {v2DebitNotes.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.invoice_date}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-gray-800">{r.invoice_no}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.original_invoice_no || '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-[11px] font-medium text-gray-700">{r.buyer_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(r.total_amount)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {CDN_REASON_LABELS[r.cdn_reason as CdnReason] || r.cdn_reason || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => { deleteInvoiceV2(r.id); setTick((x) => x + 1); }}
                        title="Delete"
                        className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legacy Debit Notes Table ── */}
      {legacyDebitNotes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-bold text-gray-800">Legacy Debit Notes</h3>
            <span className="text-[11px] text-gray-400">{legacyDebitNotes.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">DN No</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Original Inv</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                  <th className="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {legacyDebitNotes.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.invoice_date}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-gray-800">{r.invoice_no}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.original_invoice_no || '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-[11px] font-medium text-gray-700">{r.vendor_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(r.total)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">{parseLegacyReason(r.purchase_sub_type)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => { deletePurchaseInvoice(r.id); setTick((x) => x + 1); }}
                        title="Delete"
                        className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {v2DebitNotes.length === 0 && legacyDebitNotes.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
          No debit notes issued yet.
        </div>
      )}
    </div>
  );
}
