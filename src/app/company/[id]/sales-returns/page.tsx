'use client';

import { useMemo, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReturnModal } from '@/components/invoices/ReturnModal';
import {
  deleteInvoiceV2,
  listInvoicesV2,
  type CdnReason,
} from '@/lib/accounting/gstInvoices';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const REASON_LABELS: Record<CdnReason, string> = {
  SALES_RETURN: 'Sales Return',
  PRICE_REDUCTION: 'Price Reduction',
  DEFICIENCY_SERVICE: 'Deficiency in Service',
  POST_SALE_DISCOUNT: 'Post-Sale Discount',
  CORRECTION: 'Correction',
  OTHER: 'Other',
};

export default function SalesReturnsPage() {
  const { company, companyId, loading } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const creditNotes = useMemo(() => {
    if (!companyId) return [];
    return listInvoicesV2(companyId)
      .filter((inv) => inv.doc_type === 'CREDIT_NOTE')
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [companyId, tick]);

  const totalAmount = creditNotes.reduce((s, r) => s + r.total_amount, 0);

  if (loading || !company || !companyId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Sales Returns" description="Credit notes issued to customers">
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New Sales Return
        </button>
      </PageHeader>

      {isModalOpen && (
        <ReturnModal
          companyId={companyId}
          returnType="SALES"
          onClose={() => setIsModalOpen(false)}
          onSave={() => setTick((x) => x + 1)}
        />
      )}

      {/* ── Summary Card ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Credit Notes</p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900">
          <span className="text-sm text-gray-400">&#8377;</span>{inr(totalAmount)}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">{creditNotes.length} note{creditNotes.length !== 1 ? 's' : ''} issued</p>
      </div>

      {/* ── Credit Notes Table ── */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h3 className="text-sm font-bold text-gray-800">Credit Notes</h3>
          <span className="text-[11px] text-gray-400">{creditNotes.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">CN No</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Original Inv</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                <th className="w-12 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                    No credit notes issued yet.
                  </td>
                </tr>
              ) : (
                creditNotes.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.invoice_date}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-gray-800">{r.invoice_no}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{r.original_invoice_no || '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-[11px] font-medium text-gray-700">{r.buyer_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(r.total_amount)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">{REASON_LABELS[r.cdn_reason as CdnReason] || r.cdn_reason || '—'}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
