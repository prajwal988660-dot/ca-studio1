import type { DocumentMode } from '../types';
import type { InvoiceV2Draft, DocType } from '@/lib/accounting/gstInvoices';
import type { PurchaseFields } from '../useDocumentState';

interface SalesHeaderProps {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (u: Partial<InvoiceV2Draft>) => void;
  mode: DocumentMode;
  invalidFields?: string[];
}

interface PurchaseHeaderProps {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  mode: DocumentMode;
  invalidFields?: string[];
}

type HeaderSectionProps = SalesHeaderProps | PurchaseHeaderProps;

function err(invalidFields: string[] | undefined, key: string) {
  return invalidFields?.includes(key) ? 'border-red-500 bg-red-50' : 'border-gray-300';
}

export function HeaderSection(props: HeaderSectionProps) {
  if (props.kind === 'sales') {
    const { invoice, updateInvoice, mode, invalidFields } = props;
    return (
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Header</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">
              {mode === 'sales_return' ? 'CN No' : 'Invoice No'} *
            </span>
            <input
              value={invoice.invoice_no}
              onChange={(e) => updateInvoice({ invoice_no: e.target.value })}
              className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs font-semibold"
              placeholder={mode === 'sales_return' ? 'e.g. CN-001' : 'e.g. INV-001'}
            />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Date *</span>
            <input
              type="date"
              value={invoice.invoice_date}
              onChange={(e) => updateInvoice({ invoice_date: e.target.value, period: e.target.value.slice(0, 7) })}
              className={`h-8 w-full rounded-lg border px-3 text-xs ${err(invalidFields, 'invoice_date')}`}
            />
            {invalidFields?.includes('invoice_date') && (
              <span className="text-[10px] text-red-600">Date is required</span>
            )}
          </label>
        </div>
      </fieldset>
    );
  }

  // Purchase header
  const { fields, updateField, mode, invalidFields } = props;
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Header</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Date *</span>
          <input
            type="date"
            value={fields.invoiceDate}
            onChange={(e) => updateField('invoiceDate', e.target.value)}
            className={`h-8 w-full rounded-lg border px-3 text-xs font-semibold ${err(invalidFields, 'invoiceDate')}`}
          />
          {invalidFields?.includes('invoiceDate') && (
            <span className="text-[10px] text-red-600">Date is required</span>
          )}
        </label>
        {mode === 'purchase_return' ? (
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-amber-600">Debit Note No</span>
            <input
              value={fields.vendorInvoiceNo}
              onChange={(e) => updateField('vendorInvoiceNo', e.target.value)}
              className="h-8 w-full rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold"
              placeholder="Leave blank to auto-generate (DN-…)"
            />
          </label>
        ) : (
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Vendor Invoice No *</span>
            <input
              value={fields.vendorInvoiceNo}
              onChange={(e) => updateField('vendorInvoiceNo', e.target.value)}
              className={`h-8 w-full rounded-lg border px-3 text-xs font-semibold ${err(invalidFields, 'vendorInvoiceNo')}`}
              placeholder="e.g. GST/2024/0042"
            />
            {invalidFields?.includes('vendorInvoiceNo') && (
              <span className="text-[10px] text-red-600">Vendor invoice number is required</span>
            )}
          </label>
        )}
      </div>
    </fieldset>
  );
}
