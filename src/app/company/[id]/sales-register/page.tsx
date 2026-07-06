'use client';

import { useMemo, useState } from 'react';
import { DocumentWizard } from '@/components/invoices/document-wizard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCompany } from '@/hooks/useCompany';
import {
  deleteInvoiceV2,
  deleteSalesInvoice,
  DOC_TYPE_OPTIONS,
  getStateCodeFromGSTIN,
  listInvoicesV2,
  listSalesInvoices,
  type InvoiceV2,
  type SalesInvoice,
} from '@/lib/accounting/gstInvoices';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compactInvoiceNo(no: string): string {
  if (no.startsWith('SLS-')) return `↑ ${no.slice(4)}`;
  if (no.startsWith('PUR-')) return `↓ ${no.slice(4)}`;
  return no;
}

type CombinedInvoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  doc_type: string;
  gstr1_table: string;
  buyer_name: string;
  buyer_gstin?: string;
  item_summary?: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  isLegacy: boolean;
};

type CtxMenu = { x: number; y: number; row: CombinedInvoice };

export default function SalesRegisterPage() {
  const { company, companyId, loading } = useCompany();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const sellerStateCode = useMemo(() => {
    if (!company) return undefined;
    const gstin = company.gst_details?.gstin;
    return gstin ? getStateCodeFromGSTIN(gstin) || undefined : undefined;
  }, [company]);

  const combinedRows = useMemo<CombinedInvoice[]>(() => {
    if (!companyId) return [];

    const legacyInvoices = listSalesInvoices(companyId).map((inv: SalesInvoice): CombinedInvoice => ({
      id: inv.id,
      invoice_no: inv.invoice_no,
      invoice_date: inv.invoice_date,
      doc_type: 'TAX_INVOICE',
      gstr1_table: inv.section_code || inv.bucket,
      buyer_name: inv.customer_name,
      buyer_gstin: inv.customer_gstin,
      item_summary: inv.narration || inv.hsn_code || '—',
      taxable: inv.taxable_value,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      total: inv.total,
      isLegacy: true,
    }));

    const v2Invoices = listInvoicesV2(companyId)
      .filter((inv: InvoiceV2) => inv.doc_type === 'TAX_INVOICE' || inv.doc_type === 'BILL_OF_SUPPLY')
      .map((inv: InvoiceV2): CombinedInvoice => ({
      id: inv.id,
      invoice_no: inv.invoice_no,
      invoice_date: inv.invoice_date,
      doc_type: inv.doc_type,
      gstr1_table: inv.gstr1_table,
      buyer_name: inv.buyer_name,
      buyer_gstin: inv.buyer_gstin,
      item_summary: inv.items?.length
        ? inv.items
            .slice(0, 2)
            .map((it) => it.description)
            .filter(Boolean)
            .join(', ')
        : '—',
      taxable: inv.total_taxable,
      cgst: inv.total_cgst,
      sgst: inv.total_sgst,
      igst: inv.total_igst,
      total: inv.total_amount,
      isLegacy: false,
    }));

    return [...legacyInvoices, ...v2Invoices].sort((a, b) =>
      a.invoice_date === b.invoice_date
        ? b.invoice_no.localeCompare(a.invoice_no)
        : b.invoice_date.localeCompare(a.invoice_date)
    );
  }, [companyId, tick]);

  const totals = useMemo(
    () =>
      combinedRows.reduce(
        (a, r) => ({
          taxable: a.taxable + r.taxable,
          cgst: a.cgst + r.cgst,
          sgst: a.sgst + r.sgst,
          igst: a.igst + r.igst,
          total: a.total + r.total,
        }),
        { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
      ),
    [combinedRows]
  );

  const handleDelete = (row: CombinedInvoice) => {
    if (row.isLegacy) {
      deleteSalesInvoice(row.id);
    } else {
      deleteInvoiceV2(row.id);
    }
    setTick((x) => x + 1);
  };

  if (loading || !company || !companyId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const docTypeLabel = (code: string) => DOC_TYPE_OPTIONS.find((d) => d.code === code)?.label || code;

  return (
    <div className="space-y-4">
      <PageHeader title="Sales Invoices" description="Manage your sales transactions">
        <button
          onClick={() => setIsWizardOpen(true)}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New Invoice
        </button>
      </PageHeader>

      {isWizardOpen && (
        <DocumentWizard
          mode="sales_invoice"
          companyId={companyId}
          sellerStateCode={sellerStateCode}
          initialInvoice={null}
          onClose={() => setIsWizardOpen(false)}
          onSave={() => setTick((x) => x + 1)}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Taxable Value</p>
          <p className="text-sm font-semibold">{inr(totals.taxable)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">CGST</p>
          <p className="text-sm font-semibold">{inr(totals.cgst)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">SGST</p>
          <p className="text-sm font-semibold">{inr(totals.sgst)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">IGST</p>
          <p className="text-sm font-semibold">{inr(totals.igst)}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-700">Total Value</p>
          <p className="text-sm font-semibold text-blue-800">{inr(totals.total)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <h3 className="text-sm font-semibold text-gray-800">Sales Transactions</h3>
          <p className="text-xs text-gray-500">Showing {combinedRows.length} entries</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Invoice No</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Party</th>
                <th className="px-3 py-2 text-left">Inventory Details</th>
                <th className="px-3 py-2 text-left">GSTIN</th>
                <th className="px-3 py-2 text-right">Taxable</th>
                <th className="px-3 py-2 text-right">CGST</th>
                <th className="px-3 py-2 text-right">SGST</th>
                <th className="px-3 py-2 text-right">IGST</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {combinedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-sm text-gray-500">
                    No invoices yet. Click "+ New Invoice" to create one.
                  </td>
                </tr>
              ) : (
                combinedRows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-default select-none border-t border-gray-100 hover:bg-gray-50/50"
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row: r }); }}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{compactInvoiceNo(r.invoice_no)}</td>
                    <td className="px-3 py-2">{r.invoice_date}</td>
                    <td className="px-3 py-2">{r.buyer_name}</td>
                    <td className="max-w-[260px] px-3 py-2 text-xs text-gray-700">
                      <span className="line-clamp-2">{r.item_summary || '—'}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.buyer_gstin || '—'}</td>
                    <td className="px-3 py-2 text-right">{inr(r.taxable)}</td>
                    <td className="px-3 py-2 text-right">{inr(r.cgst)}</td>
                    <td className="px-3 py-2 text-right">{inr(r.sgst)}</td>
                    <td className="px-3 py-2 text-right">{inr(r.igst)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{inr(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
          >
            <button
              onClick={() => { handleDelete(ctxMenu.row); setCtxMenu(null); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Delete Transaction
            </button>
          </div>
        </>
      )}
    </div>
  );
}
