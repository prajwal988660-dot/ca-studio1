import type { PurchaseFields } from '../useDocumentState';
import type { DocumentMode } from '../types';
import { WIZARD_CONFIG, PURCHASE_BUCKETS } from '../config';

interface PurchaseItemSectionProps {
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  mode: DocumentMode;
  invalidFields?: string[];
}

function err(invalidFields: string[] | undefined, key: string) {
  return invalidFields?.includes(key) ? 'border-red-500 bg-red-50' : 'border-gray-300';
}

export function PurchaseItemSection({ fields, updateField, mode, invalidFields }: PurchaseItemSectionProps) {
  const gross = (Number(fields.itemQty || 0) * Number(fields.itemRate || 0));
  const discountPct = Number(fields.itemDiscount || 0);
  const discountAmt = Math.round(gross * discountPct) / 100;
  const showGross = Number(fields.itemQty || 0) > 0 && Number(fields.itemRate || 0) > 0;

  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Item &amp; Tax</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {mode === 'purchase_invoice' && (
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Bucket</span>
            <select value={fields.bucket} onChange={(e) => updateField('bucket', e.target.value as any)} className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs font-semibold">
              {PURCHASE_BUCKETS.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </label>
        )}
        <label className="md:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Description</span>
          <input value={fields.itemDescription} onChange={(e) => updateField('itemDescription', e.target.value)} className={`h-8 w-full rounded-lg border px-3 text-xs font-semibold ${err(invalidFields, 'itemDescription')}`} placeholder="e.g. Steel Rod 10mm" />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">HSN / SAC</span>
          <input value={fields.itemHsn} onChange={(e) => updateField('itemHsn', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 px-3 font-mono text-xs font-semibold" placeholder="7207" />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Qty</span>
          <input type="number" value={fields.itemQty} onChange={(e) => updateField('itemQty', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 px-3 font-mono text-xs font-semibold text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" min={0} />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Rate</span>
          <input type="number" value={fields.itemRate} onChange={(e) => updateField('itemRate', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 px-3 font-mono text-xs font-semibold text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" min={0} />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Discount %</span>
          <div className="relative">
            <input
              type="number"
              value={fields.itemDiscount}
              onChange={(e) => {
                const pct = e.target.value;
                updateField('itemDiscount', pct);
                if (gross > 0) {
                  const amt = Math.round(gross * (Number(pct) || 0)) / 100;
                  updateField('taxable', String(Math.max(0, gross - amt)));
                }
              }}
              className="h-8 w-full rounded-lg border border-gray-300 px-3 pr-7 font-mono text-xs font-semibold text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={0}
              max={100}
              step={0.01}
              placeholder="0"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">%</span>
          </div>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">
            Taxable Value *
            {showGross && discountPct > 0 && (
              <span className="ml-1 text-gray-400 font-normal">(₹{gross.toLocaleString('en-IN')} − ₹{discountAmt.toLocaleString('en-IN')})</span>
            )}
          </span>
          <input
            type="number"
            value={fields.taxable}
            onChange={(e) => updateField('taxable', e.target.value)}
            className={`h-8 w-full rounded-lg border px-3 font-mono text-xs font-semibold text-right ${err(invalidFields, 'taxable')}`}
          />
          {invalidFields?.includes('taxable') && (
            <span className="text-[10px] text-red-600">Taxable value must be &gt; 0</span>
          )}
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">GST %</span>
          <input type="number" value={fields.gstRate} onChange={(e) => updateField('gstRate', e.target.value)} className="h-8 w-full rounded-lg border border-gray-300 px-3 font-mono text-xs font-semibold text-right" min={0} />
        </label>
      </div>
    </fieldset>
  );
}
