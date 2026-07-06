import type { InvoiceV2Draft, LineItem } from '@/lib/accounting/gstInvoices';
import { GST_RATES, isCessApplicable, getCessInfo } from '@/lib/accounting/gstInvoices';

interface LineItemsSectionProps {
  invoice: InvoiceV2Draft;
  updateItem: (index: number, updates: Partial<LineItem>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
}

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function LineItemsSection({ invoice, updateItem, addItem, removeItem }: LineItemsSectionProps) {
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Line Items</legend>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50 text-[10px] font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-2 py-1.5 text-left w-7">#</th>
              <th className="px-2 py-1.5 text-left">Description *</th>
              <th className="px-2 py-1.5 text-left w-20">HSN *</th>
              <th className="px-2 py-1.5 text-right w-14">Qty</th>
              <th className="px-2 py-1.5 text-right w-20">Rate</th>
              <th className="px-2 py-1.5 text-right w-16">Disc %</th>
              <th className="px-2 py-1.5 text-right w-16">GST%</th>
              <th className="px-2 py-1.5 text-right w-20">Tax</th>
              <th className="px-2 py-1.5 text-right w-24">Total</th>
              <th className="px-2 py-1.5 w-7"></th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const tax = item.cgst + item.sgst + item.igst + item.cess;
              return (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-2 py-1 text-[10px] text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      className="h-7 w-full rounded border border-gray-200 px-2 text-[11px] font-semibold"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={item.hsn}
                      onChange={(e) => {
                        const hsn = e.target.value;
                        const updates: Partial<LineItem> = { hsn };
                        if (isCessApplicable(hsn)) {
                          const cess = getCessInfo(hsn);
                          if (cess) {
                            updates.cess_rate = cess.cessRate;
                            updates.cess_specific_rate = cess.specificPerTon || 0;
                          }
                        } else {
                          updates.cess_rate = 0;
                          updates.cess_specific_rate = 0;
                        }
                        updateItem(idx, updates);
                      }}
                      className="h-7 w-full rounded border border-gray-200 px-2 font-mono text-[11px]"
                      placeholder="HSN"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 0 })}
                      className="h-7 w-full rounded border border-gray-200 px-2 text-right text-[11px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      min={0}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={item.rate || ''}
                      onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })}
                      className="h-7 w-full rounded border border-gray-200 px-2 text-right text-[11px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      min={0}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <div className="relative">
                      <input
                        type="number"
                        value={item.qty * item.rate > 0
                          ? Math.round((item.discount / (item.qty * item.rate)) * 10000) / 100 || ''
                          : ''}
                        onChange={(e) => {
                          const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          updateItem(idx, { discount: Math.round(item.qty * item.rate * pct) / 100 });
                        }}
                        className="h-7 w-full rounded border border-gray-200 px-2 pr-5 text-right text-[11px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min={0}
                        max={100}
                        step={0.01}
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">%</span>
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={item.gst_rate}
                      onChange={(e) => updateItem(idx, { gst_rate: Number(e.target.value) })}
                      className="h-7 w-full rounded border border-gray-200 px-1 text-right text-[11px]"
                      disabled={invoice.doc_type === 'BILL_OF_SUPPLY'}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-[10px] text-gray-600">{inr(tax)}</td>
                  <td className="px-2 py-1 text-right font-mono text-[10px] font-semibold">{inr(item.line_total)}</td>
                  <td className="px-2 py-1">
                    {invoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600"
                        title="Remove"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
      >
        + Add Item
      </button>
    </fieldset>
  );
}
