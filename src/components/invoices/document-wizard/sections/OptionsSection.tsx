import { useState } from 'react';
import type { DocumentMode } from '../types';
import type { InvoiceV2Draft } from '@/lib/accounting/gstInvoices';
import { STATE_CODES } from '@/lib/accounting/gstInvoices';
import { WIZARD_CONFIG } from '../config';
import type { PurchaseFields } from '../useDocumentState';

interface SalesOptionsProps {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (u: Partial<InvoiceV2Draft>) => void;
  sellerStateCode?: string;
  mode: DocumentMode;
}

interface PurchaseOptionsProps {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  mode: DocumentMode;
}

type OptionsSectionProps = SalesOptionsProps | PurchaseOptionsProps;

export function OptionsSection(props: OptionsSectionProps) {
  const config = WIZARD_CONFIG[props.mode];

  if (props.kind === 'sales') {
    const { invoice, updateInvoice, sellerStateCode } = props;
    const [isExport, setIsExport] = useState(() => invoice.buyer_type === 'OVERSEAS');

    const isIgst = invoice.supply_type === 'inter';

    return (
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Options</legend>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={invoice.reverse_charge}
              onChange={(e) => updateInvoice({ reverse_charge: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span className="font-semibold text-gray-700">RCM</span>
          </label>
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isExport}
              onChange={(e) => {
                setIsExport(e.target.checked);
                if (e.target.checked) {
                  updateInvoice({
                    buyer_type: 'OVERSEAS',
                    export_type: invoice.export_type || 'WOPAY',
                    place_of_supply: '96',
                    supply_type: 'inter',
                    is_intra_state: false,
                    force_igst: true,
                  });
                } else {
                  updateInvoice({
                    buyer_type: 'CONSUMER',
                    export_type: undefined,
                    place_of_supply: sellerStateCode || '',
                    buyer_state_code: sellerStateCode || '',
                    buyer_state: sellerStateCode ? STATE_CODES[sellerStateCode] || '' : '',
                    force_igst: false,
                  });
                }
              }}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span className="font-semibold text-gray-700">Export</span>
          </label>
          {/* IGST / CGST+SGST segmented button */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500">Tax:</span>
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              <button
                type="button"
                disabled={isExport}
                onClick={() => updateInvoice({ force_igst: true, supply_type: 'inter', is_intra_state: false })}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${isIgst ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                IGST
              </button>
              <button
                type="button"
                disabled={isExport}
                onClick={() => updateInvoice({ force_igst: false, supply_type: 'intra', is_intra_state: true })}
                className={`border-l border-gray-300 px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${!isIgst ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                CGST+SGST
              </button>
            </div>
            {!invoice.force_igst && <span className="text-[10px] italic text-gray-400">auto</span>}
          </div>
        </div>

        {isExport && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-green-200 bg-green-50 p-3 md:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold text-green-800">Payment Type</span>
              <select
                value={invoice.export_type || 'WOPAY'}
                onChange={(e) => updateInvoice({ export_type: e.target.value as 'WPAY' | 'WOPAY' })}
                className="h-8 w-full rounded-lg border border-green-300 bg-white px-3 text-xs"
              >
                <option value="WPAY">With Payment (IGST)</option>
                <option value="WOPAY">Without Payment (LUT/Bond)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold text-green-800">Port Code</span>
              <input
                value={invoice.port_code || ''}
                onChange={(e) => updateInvoice({ port_code: e.target.value })}
                className="h-8 w-full rounded-lg border border-green-300 bg-white px-3 text-xs"
                placeholder="e.g. INBOM4"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold text-green-800">Shipping Bill No</span>
              <input
                value={invoice.shipping_bill_no || ''}
                onChange={(e) => updateInvoice({ shipping_bill_no: e.target.value })}
                className="h-8 w-full rounded-lg border border-green-300 bg-white px-3 text-xs"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold text-green-800">Shipping Bill Date</span>
              <input
                type="date"
                value={invoice.shipping_bill_date || ''}
                onChange={(e) => updateInvoice({ shipping_bill_date: e.target.value })}
                className="h-8 w-full rounded-lg border border-green-300 bg-white px-3 text-xs"
              />
            </label>
          </div>
        )}
      </fieldset>
    );
  }

  // Purchase options
  const { fields, updateField, mode } = props;
  const isImport = fields.bucket === 'IMPG' || fields.bucket === 'IMPG_SEZ';

  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Options</legend>
      <div className="flex flex-wrap items-center gap-4">
        {mode === 'purchase_invoice' && (
          <>
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={fields.itcEligible} onChange={(e) => updateField('itcEligible', e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300" />
              <span className="font-semibold text-gray-700">ITC Eligible</span>
            </label>
            {['B2B', 'URD', 'IMPS'].includes(fields.bucket) && (
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={fields.rcmApplicable} onChange={(e) => updateField('rcmApplicable', e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300" />
                <span className="font-semibold text-gray-700">RCM</span>
              </label>
            )}
          </>
        )}
        {/* IGST / CGST+SGST segmented button */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500">Tax:</span>
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() => updateField('supplyType', 'inter')}
              className={`px-3 py-1 text-[11px] font-semibold transition-colors ${fields.supplyType === 'inter' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              IGST
            </button>
            <button
              type="button"
              onClick={() => updateField('supplyType', 'intra')}
              className={`border-l border-gray-300 px-3 py-1 text-[11px] font-semibold transition-colors ${fields.supplyType === 'intra' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              CGST+SGST
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateField('showAdvanced', !fields.showAdvanced)}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
        >
          Advanced {fields.showAdvanced ? '▾' : '▸'}
        </button>
      </div>

      {fields.showAdvanced && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 md:grid-cols-3">
          {mode === 'purchase_invoice' && (
            <>
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">ITC Status</span>
                <select value={fields.itcStatus} onChange={(e) => updateField('itcStatus', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold">
                  <option value="ELIGIBLE_FULL">Full</option>
                  <option value="ELIGIBLE_PARTIAL">Partial</option>
                  <option value="BLOCKED_17_5">Blocked 17(5)</option>
                  <option value="INELIGIBLE_EXEMPT">Exempt</option>
                  <option value="INELIGIBLE_PERSONAL">Personal</option>
                  <option value="INELIGIBLE_NO_DOC">No Doc</option>
                  <option value="PENDING_2B">Pending 2B</option>
                  <option value="REVERSED_42">Rule 42</option>
                  <option value="REVERSED_43">Rule 43</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-2 self-end rounded-lg border border-gray-200 bg-white px-3 py-1.5">
                <input type="checkbox" checked={fields.capitalGoods} onChange={(e) => updateField('capitalGoods', e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300" />
                <span className="text-xs font-semibold text-gray-700">Capital Goods</span>
              </label>
            </>
          )}

          {isImport && (
            <>
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Bill of Entry No *</span>
                <input value={fields.billOfEntryNo} onChange={(e) => updateField('billOfEntryNo', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold" />
              </label>
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Bill of Entry Date *</span>
                <input type="date" value={fields.billOfEntryDate} onChange={(e) => updateField('billOfEntryDate', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold" />
              </label>
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Port Code</span>
                <input value={fields.portCode} onChange={(e) => updateField('portCode', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold" placeholder="INBOM4" />
              </label>
            </>
          )}

          <label className="md:col-span-3">
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Narration</span>
            <input value={fields.narration} onChange={(e) => updateField('narration', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold" />
          </label>
        </div>
      )}
    </fieldset>
  );
}
