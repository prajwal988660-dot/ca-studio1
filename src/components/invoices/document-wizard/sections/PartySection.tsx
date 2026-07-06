import type { DocumentMode } from '../types';
import type { InvoiceV2Draft } from '@/lib/accounting/gstInvoices';
import { STATE_CODES } from '@/lib/accounting/gstInvoices';
import { WIZARD_CONFIG } from '../config';
import type { PurchaseFields } from '../useDocumentState';

interface SalesPartyProps {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (u: Partial<InvoiceV2Draft>) => void;
  handleGstinChange: (value: string) => void;
  gstinError: string | null;
  gstinLocked?: boolean;
  mode: DocumentMode;
  invalidFields?: string[];
}

interface PurchasePartyProps {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  gstinLocked?: boolean;
  mode: DocumentMode;
  invalidFields?: string[];
}

type PartySectionProps = SalesPartyProps | PurchasePartyProps;

function err(invalidFields: string[] | undefined, key: string) {
  return invalidFields?.includes(key) ? 'border-red-500 bg-red-50' : 'border-gray-300';
}

export function PartySection(props: PartySectionProps) {
  const config = WIZARD_CONFIG[props.mode];

  if (props.kind === 'sales') {
    const { invoice, updateInvoice, handleGstinChange, gstinError, gstinLocked, invalidFields } = props;
    return (
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{config.partyLabel}</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">{config.partyLabel} Name *</span>
            <input
              value={invoice.buyer_name}
              onChange={(e) => updateInvoice({ buyer_name: e.target.value })}
              disabled={gstinLocked}
              className={`h-8 w-full rounded-lg border px-3 text-xs font-semibold disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${err(invalidFields, 'buyer_name')}`}
              placeholder={`${config.partyLabel} name`}
            />
            {invalidFields?.includes('buyer_name') && (
              <span className="text-[10px] text-red-600">Party name is required</span>
            )}
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">GSTIN</span>
            <input
              value={invoice.buyer_gstin || ''}
              onChange={(e) => handleGstinChange(e.target.value)}
              disabled={gstinLocked}
              className={`h-8 w-full rounded-lg border px-3 font-mono text-xs uppercase disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${gstinError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              maxLength={15}
              placeholder={gstinLocked ? (invoice.buyer_gstin ? '' : 'Unregistered (from original)') : 'Auto-detects B2B / B2C'}
            />
            {gstinError && <span className="text-[10px] text-red-600">{gstinError}</span>}
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Place of Supply *</span>
            <select
              value={invoice.place_of_supply}
              disabled={gstinLocked}
              onChange={(e) => {
                const code = e.target.value;
                updateInvoice({
                  place_of_supply: code,
                  buyer_state_code: code,
                  buyer_state: STATE_CODES[code] || '',
                });
              }}
              className={`h-8 w-full rounded-lg border px-3 text-xs disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${err(invalidFields, 'place_of_supply')}`}
            >
              <option value="">Select state</option>
              {Object.entries(STATE_CODES).map(([code, name]) => (
                <option key={code} value={code}>{code} — {name}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
    );
  }

  // Purchase party
  const { fields, updateField, mode, gstinLocked, invalidFields } = props;
  const needsGstin = fields.bucket === 'B2B' || (fields.bucket === 'CDNR' && !!fields.vendorGstin);
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{config.partyLabel}</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">{config.partyLabel} Name *</span>
          <input
            disabled={mode === 'purchase_return'}
            value={fields.vendorName}
            onChange={(e) => updateField('vendorName', e.target.value)}
            className={`h-8 w-full rounded-lg border px-3 text-xs font-semibold disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${err(invalidFields, 'vendorName')}`}
            placeholder="Supplier name"
          />
          {invalidFields?.includes('vendorName') && (
            <span className="text-[10px] text-red-600">Vendor name is required</span>
          )}
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">GSTIN {needsGstin ? '*' : ''}</span>
          <input
            disabled={mode === 'purchase_return'}
            value={fields.vendorGstin}
            onChange={(e) => updateField('vendorGstin', e.target.value.toUpperCase())}
            className={`h-8 w-full rounded-lg border px-3 font-mono text-xs font-semibold uppercase disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${err(invalidFields, 'vendorGstin')}`}
            placeholder="27ABCDE1234F1Z5"
            maxLength={15}
          />
          {invalidFields?.includes('vendorGstin') && (
            <span className="text-[10px] text-red-600">Valid GSTIN required for B2B</span>
          )}
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Place of Supply *</span>
          <select
            disabled={mode === 'purchase_return'}
            value={fields.posState}
            onChange={(e) => updateField('posState', e.target.value)}
            className={`h-8 w-full rounded-lg border px-3 text-xs disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${err(invalidFields, 'posState')}`}
          >
            <option value="">Select state</option>
            {Object.entries(STATE_CODES).map(([code, name]) => (
              <option key={code} value={name}>{code} — {name}</option>
            ))}
          </select>
          {invalidFields?.includes('posState') && (
            <span className="text-[10px] text-red-600">Place of supply is required</span>
          )}
        </label>
      </div>
    </fieldset>
  );
}
