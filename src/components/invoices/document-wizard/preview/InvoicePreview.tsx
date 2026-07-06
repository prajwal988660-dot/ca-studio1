import type { DocumentMode, SalesTotals, PurchaseTotals } from '../types';
import type { InvoiceV2Draft } from '@/lib/accounting/gstInvoices';
import { amountToWords } from '@/lib/accounting/gstInvoices';
import { WIZARD_CONFIG, GSTR1_TABLE_LABELS } from '../config';
import type { PurchaseFields } from '../useDocumentState';
import type { DocumentState } from '../useDocumentState';

interface InvoicePreviewProps {
  mode: DocumentMode;
  state: DocumentState;
  companyName: string;
  companyGstin: string;
}

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoicePreview({ mode, state, companyName, companyGstin }: InvoicePreviewProps) {
  const config = WIZARD_CONFIG[mode];

  if (state.kind === 'sales') {
    return <SalesPreview mode={mode} invoice={state.invoice} totals={state.totals} companyName={companyName} companyGstin={companyGstin} />;
  }

  return <PurchasePreview mode={mode} fields={state.fields} totals={state.totals} companyName={companyName} companyGstin={companyGstin} />;
}

function SalesPreview({
  mode, invoice, totals, companyName, companyGstin,
}: {
  mode: DocumentMode;
  invoice: InvoiceV2Draft;
  totals: SalesTotals;
  companyName: string;
  companyGstin: string;
}) {
  const config = WIZARD_CONFIG[mode];

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{companyName}</h3>
        {companyGstin && <p className="text-[10px] font-mono text-gray-500">GSTIN: {companyGstin}</p>}
      </div>

      {/* Document title */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase">{config.title}</h4>
            <p className="text-[10px] text-gray-500">
              No: <span className="font-mono font-semibold">{invoice.invoice_no || '(auto)'}</span>
              {' | '}Date: <span className="font-semibold">{invoice.invoice_date}</span>
            </p>
          </div>
          {config.showGstr1Badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.accentBadgeBg} ${config.accentBadgeText}`}>
              {GSTR1_TABLE_LABELS[totals.gstr1Table] || totals.gstr1Table}
            </span>
          )}
        </div>
      </div>

      {/* Party */}
      <div className="border-b border-gray-100 px-5 py-2">
        <p className="text-[10px] text-gray-500">{config.partyLabel}</p>
        <p className="text-xs font-semibold text-gray-800">{invoice.buyer_name || '--'}</p>
        {invoice.buyer_gstin && <p className="text-[10px] font-mono text-gray-500">{invoice.buyer_gstin}</p>}
        {invoice.original_invoice_no && (
          <p className="mt-1 text-[10px] text-gray-500">
            Against: <span className="font-mono font-semibold">{invoice.original_invoice_no}</span>
            {invoice.original_invoice_date && ` (${invoice.original_invoice_date})`}
          </p>
        )}
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        <table className="w-full text-[10px]">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="py-1 text-left w-6">#</th>
              <th className="py-1 text-left">Description</th>
              <th className="py-1 text-left w-16">HSN</th>
              <th className="py-1 text-right w-10">Qty</th>
              <th className="py-1 text-right w-16">Rate</th>
              <th className="py-1 text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50">
                <td className="py-1 text-gray-400">{idx + 1}</td>
                <td className="py-1 font-medium">{item.description || '--'}</td>
                <td className="py-1 font-mono text-gray-500">{item.hsn || '--'}</td>
                <td className="py-1 text-right font-mono">{item.qty}</td>
                <td className="py-1 text-right font-mono">{inr(item.rate)}</td>
                <td className="py-1 text-right font-mono font-semibold">{inr(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 px-5 py-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">Taxable Value</span>
          <span className="font-mono font-semibold">{inr(totals.taxable)}</span>
        </div>
        {totals.isIntra ? (
          <>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">CGST</span>
              <span className="font-mono">{inr(totals.cgst)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">SGST</span>
              <span className="font-mono">{inr(totals.sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">IGST</span>
            <span className="font-mono">{inr(totals.igst)}</span>
          </div>
        )}
        {totals.cess > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Cess</span>
            <span className="font-mono">{inr(totals.cess)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1 text-xs">
          <span className="font-bold text-gray-700">TOTAL</span>
          <span className="font-mono font-bold text-blue-900">{inr(totals.total)}</span>
        </div>
        {totals.amountInWords && (
          <p className="mt-1 text-[9px] italic text-gray-400">{totals.amountInWords}</p>
        )}
      </div>
    </div>
  );
}

function PurchasePreview({
  mode, fields, totals, companyName, companyGstin,
}: {
  mode: DocumentMode;
  fields: PurchaseFields;
  totals: PurchaseTotals;
  companyName: string;
  companyGstin: string;
}) {
  const config = WIZARD_CONFIG[mode];
  const gstTotal = totals.cgst + totals.sgst + totals.igst;
  const wordsAmount = amountToWords(totals.total);

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{companyName}</h3>
        {companyGstin && <p className="text-[10px] font-mono text-gray-500">GSTIN: {companyGstin}</p>}
      </div>

      {/* Document title */}
      <div className="border-b border-gray-100 px-5 py-3">
        <h4 className="text-xs font-bold text-gray-700 uppercase">{config.title}</h4>
        <p className="text-[10px] text-gray-500">
          Date: <span className="font-semibold">{fields.invoiceDate}</span>
          {mode === 'purchase_invoice' && (
            <> | Bucket: <span className="font-semibold">{fields.bucket}</span></>
          )}
        </p>
      </div>

      {/* Party */}
      <div className="border-b border-gray-100 px-5 py-2">
        <p className="text-[10px] text-gray-500">{config.partyLabel}</p>
        <p className="text-xs font-semibold text-gray-800">{fields.vendorName || '--'}</p>
        {fields.vendorGstin && <p className="text-[10px] font-mono text-gray-500">{fields.vendorGstin}</p>}
        {fields.origInvNo && (
          <p className="mt-1 text-[10px] text-gray-500">
            Against: <span className="font-mono font-semibold">{fields.origInvNo}</span>
            {fields.origInvDate && ` (${fields.origInvDate})`}
          </p>
        )}
      </div>

      {/* Item */}
      <div className="flex-1 px-5 py-3">
        <table className="w-full text-[10px]">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="py-1 text-left">Description</th>
              <th className="py-1 text-left w-16">HSN</th>
              <th className="py-1 text-right w-10">Qty</th>
              <th className="py-1 text-right w-16">Rate</th>
              <th className="py-1 text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50">
              <td className="py-1.5 font-medium">{fields.itemDescription || '--'}</td>
              <td className="py-1.5 font-mono text-gray-500">{fields.itemHsn || '--'}</td>
              <td className="py-1.5 text-right font-mono">{fields.itemQty}</td>
              <td className="py-1.5 text-right font-mono">{inr(Number(fields.itemRate || 0))}</td>
              <td className="py-1.5 text-right font-mono font-semibold">{inr(totals.taxable)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 px-5 py-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">Taxable Value</span>
          <span className="font-mono font-semibold">{inr(totals.taxable)}</span>
        </div>
        {totals.isIntra ? (
          <>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">CGST @{Number(fields.gstRate || 0) / 2}%</span>
              <span className="font-mono">{inr(totals.cgst)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">SGST @{Number(fields.gstRate || 0) / 2}%</span>
              <span className="font-mono">{inr(totals.sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">IGST @{fields.gstRate}%</span>
            <span className="font-mono">{inr(totals.igst)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1 text-xs">
          <span className="font-bold text-gray-700">TOTAL</span>
          <span className="font-mono font-bold text-blue-900">{inr(totals.total)}</span>
        </div>
        <p className="mt-1 text-[9px] italic text-gray-400">{wordsAmount}</p>
      </div>
    </div>
  );
}
