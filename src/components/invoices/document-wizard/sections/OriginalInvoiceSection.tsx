import { useMemo, useState } from 'react';
import type { DocumentMode } from '../types';
import type { InvoiceV2, PurchaseInvoice, InvoiceV2Draft, CdnReason } from '@/lib/accounting/gstInvoices';
import { CDN_REASON_OPTIONS, PURCHASE_RETURN_REASONS } from '../config';
import type { PurchaseFields } from '../useDocumentState';

interface SalesOrigProps {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (u: Partial<InvoiceV2Draft>) => void;
  existingInvoices: InvoiceV2[];
  selectOriginalInvoice: (inv: InvoiceV2) => void;
  mode: DocumentMode;
  invalidFields?: string[];
}

interface PurchaseOrigProps {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  existingPurchases: PurchaseInvoice[];
  selectOriginalPurchase: (inv: PurchaseInvoice) => void;
  mode: DocumentMode;
  invalidFields?: string[];
}

type OriginalInvoiceSectionProps = SalesOrigProps | PurchaseOrigProps;

function err(invalidFields: string[] | undefined, key: string) {
  return invalidFields?.includes(key) ? 'border-red-500 bg-red-50' : '';
}

export function OriginalInvoiceSection(props: OriginalInvoiceSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [otherReason, setOtherReason] = useState('');

  const isSales = props.kind === 'sales';
  const accentBorder = isSales ? 'border-rose-200' : 'border-amber-200';
  const accentBg = isSales ? 'bg-rose-50/30' : 'bg-amber-50/30';
  const accentLegendColor = isSales ? 'text-rose-700' : 'text-amber-700';
  const accentLabelColor = isSales ? 'text-rose-800' : 'text-amber-800';
  const accentInputBorder = isSales ? 'border-rose-300' : 'border-amber-300';

  if (props.kind === 'sales') {
    const { invoice, updateInvoice, existingInvoices, selectOriginalInvoice, invalidFields } = props;

    const filtered = useMemo(() => {
      if (!searchTerm.trim()) return existingInvoices.slice(0, 10);
      const term = searchTerm.toLowerCase();
      return existingInvoices.filter((inv) => inv.invoice_no.toLowerCase().includes(term) || inv.buyer_name.toLowerCase().includes(term)).slice(0, 10);
    }, [existingInvoices, searchTerm]);

    const cdnReason = invoice.cdn_reason || 'SALES_RETURN';

    return (
      <fieldset className={`rounded-lg border ${accentBorder} ${accentBg} p-4`}>
        <legend className={`px-2 text-[11px] font-semibold uppercase tracking-wide ${accentLegendColor}`}>Original Invoice</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Searchable dropdown */}
          <label className="relative">
            <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Original Inv No *</span>
            <input
              value={invoice.original_invoice_no || ''}
              onChange={(e) => {
                updateInvoice({ original_invoice_no: e.target.value });
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              className={`h-8 w-full rounded-lg border ${err(invalidFields, 'original_invoice_no') || accentInputBorder} bg-white px-3 text-xs font-semibold`}
              placeholder="Search or type invoice no..."
            />
            {invalidFields?.includes('original_invoice_no') && (
              <span className="text-[10px] text-red-600">Original invoice number is required</span>
            )}
            {isOpen && filtered.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filtered.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      selectOriginalInvoice(inv);
                      setSearchTerm('');
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50"
                  >
                    <span className="font-mono font-semibold">{inv.invoice_no}</span>
                    <span className="text-gray-500">{inv.buyer_name} | {inv.invoice_date}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
          <label>
            <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Original Inv Date *</span>
            <input
              type="date"
              value={invoice.original_invoice_date || ''}
              onChange={(e) => updateInvoice({ original_invoice_date: e.target.value })}
              className={`h-8 w-full rounded-lg border ${err(invalidFields, 'original_invoice_date') || accentInputBorder} bg-white px-3 text-xs font-semibold`}
            />
            {invalidFields?.includes('original_invoice_date') && (
              <span className="text-[10px] text-red-600">Original invoice date is required</span>
            )}
          </label>
          <label>
            <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Reason</span>
            <select
              value={cdnReason}
              onChange={(e) => updateInvoice({ cdn_reason: e.target.value as CdnReason })}
              className={`h-8 w-full rounded-lg border ${accentInputBorder} bg-white px-3 text-xs font-semibold`}
            >
              {CDN_REASON_OPTIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </label>
        </div>
        {cdnReason === 'OTHER' && (
          <textarea
            value={invoice.notes || ''}
            onChange={(e) => updateInvoice({ notes: e.target.value })}
            placeholder="Describe the reason..."
            className={`mt-2 w-full rounded-lg border ${accentInputBorder} bg-white px-3 py-2 text-xs`}
            rows={2}
          />
        )}
      </fieldset>
    );
  }

  // Purchase returns
  const { fields, updateField, existingPurchases, selectOriginalPurchase, invalidFields } = props;

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return existingPurchases.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return existingPurchases.filter((inv) => inv.invoice_no.toLowerCase().includes(term) || inv.vendor_name.toLowerCase().includes(term)).slice(0, 10);
  }, [existingPurchases, searchTerm]);

  return (
    <fieldset className={`rounded-lg border ${accentBorder} ${accentBg} p-4`}>
      <legend className={`px-2 text-[11px] font-semibold uppercase tracking-wide ${accentLegendColor}`}>Original Invoice</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="relative">
          <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Original Inv No *</span>
          <input
            value={fields.origInvNo}
            onChange={(e) => {
              updateField('origInvNo', e.target.value);
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className={`h-8 w-full rounded-lg border ${err(invalidFields, 'origInvNo') || accentInputBorder} bg-white px-3 text-xs font-semibold`}
            placeholder="Search or type invoice no..."
          />
          {invalidFields?.includes('origInvNo') && (
            <span className="text-[10px] text-red-600">Original invoice number is required</span>
          )}
          {isOpen && filtered.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    selectOriginalPurchase(inv);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50"
                >
                  <span className="font-mono font-semibold">{inv.invoice_no}</span>
                  <span className="text-gray-500">{inv.vendor_name} | {inv.invoice_date}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <label>
          <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Original Inv Date *</span>
          <input
            type="date"
            value={fields.origInvDate}
            onChange={(e) => updateField('origInvDate', e.target.value)}
            className={`h-8 w-full rounded-lg border ${err(invalidFields, 'origInvDate') || accentInputBorder} bg-white px-3 text-xs font-semibold`}
          />
          {invalidFields?.includes('origInvDate') && (
            <span className="text-[10px] text-red-600">Original invoice date is required</span>
          )}
        </label>
        <label>
          <span className={`mb-1 block text-[11px] font-semibold ${accentLabelColor}`}>Reason</span>
          <select
            value={fields.returnReason}
            onChange={(e) => updateField('returnReason', e.target.value)}
            className={`h-8 w-full rounded-lg border ${accentInputBorder} bg-white px-3 text-xs font-semibold`}
          >
            {PURCHASE_RETURN_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </label>
      </div>
      {fields.returnReason === 'OTHER' && (
        <textarea
          value={otherReason}
          onChange={(e) => {
            setOtherReason(e.target.value);
            updateField('narration', e.target.value);
          }}
          placeholder="Describe the reason..."
          className={`mt-2 w-full rounded-lg border ${accentInputBorder} bg-white px-3 py-2 text-xs`}
          rows={2}
        />
      )}
    </fieldset>
  );
}
