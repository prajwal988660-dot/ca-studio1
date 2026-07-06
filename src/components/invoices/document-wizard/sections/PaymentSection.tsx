import type { DocumentMode } from '../types';
import type { InvoiceV2Draft } from '@/lib/accounting/gstInvoices';
import type { PurchaseFields } from '../useDocumentState';

interface SalesPaymentProps {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (u: Partial<InvoiceV2Draft>) => void;
  mode: DocumentMode;
}

interface PurchasePaymentProps {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  mode: DocumentMode;
}

type PaymentSectionProps = SalesPaymentProps | PurchasePaymentProps;

export function PaymentSection(props: PaymentSectionProps) {
  // Extract common payment properties
  const isSales = props.kind === 'sales';
  const mode = props.mode;
  const paymentMode = isSales ? (props.invoice.payment_mode || 'CREDIT') : props.fields.paymentMode;
  const receivedMedium = isSales ? (props.invoice.received_medium || 'BANK_TRANSFER') : props.fields.paidMedium;
  const amountReceived = isSales ? (props.invoice.amount_received || 0) : Number(props.fields.amountPaid || 0);
  const amountPending = isSales ? (props.invoice.amount_pending || 0) : Number(props.fields.amountPending || 0);
  const dueDate = isSales ? (props.invoice.due_date || '') : props.fields.dueDate;

  const totalAmount = isSales ? props.invoice.total_amount : (Number(props.fields.taxable || 0) * (1 + Number(props.fields.gstRate || 0)/100)); // Rough estimate for display only if needed, state manages the actual pending

  const setPaymentMode = (val: 'CASH' | 'ONLINE' | 'CREDIT' | 'PARTIAL') => {
    if (isSales) {
      props.updateInvoice({ payment_mode: val });
    } else {
      props.updateField('paymentMode', val);
    }
  };

  const setMedium = (val: 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER') => {
    if (isSales) {
      props.updateInvoice({ received_medium: val });
    } else {
      props.updateField('paidMedium', val);
    }
  };

  const setReceived = (val: number) => {
    if (isSales) {
      props.updateInvoice({ amount_received: val });
    } else {
      props.updateField('amountPaid', String(val));
    }
  };

  const setDueDate = (val: string) => {
    if (isSales) {
      props.updateInvoice({ due_date: val });
    } else {
      props.updateField('dueDate', val);
    }
  };

  const isPartial = paymentMode === 'PARTIAL';
  const isCredit = paymentMode === 'CREDIT';

  return (
    <fieldset className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Payment & Routing</legend>
      
      <div className="flex flex-col gap-4">
        {/* Payment Mode Pill Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-600 mr-2">Mode:</span>
          {(['CASH', 'ONLINE', 'CREDIT', 'PARTIAL'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                paymentMode === m 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Conditional Rows based on Mode */}
        {(isPartial || isCredit || paymentMode === 'ONLINE' || paymentMode === 'CASH') && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 mt-2">
            
            {/* Medium Selection (If Paid anything and not strictly CASH mode) */}
            {(paymentMode === 'ONLINE' || paymentMode === 'PARTIAL') && (
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-600">
                  {isSales ? 'Received via' : 'Paid via'}
                </span>
                <select
                  value={receivedMedium}
                  onChange={(e) => setMedium(e.target.value as any)}
                  className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs font-semibold"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Credit/Debit Card</option>
                  {paymentMode === 'PARTIAL' && <option value="CASH">Cash</option>}
                </select>
              </label>
            )}

            {/* Partial Payment Amount Input */}
            {isPartial && (
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-600">
                  {isSales ? 'Amount Received' : 'Amount Paid'}
                </span>
                <input
                  type="number"
                  value={amountReceived || ''}
                  onChange={(e) => setReceived(Number(e.target.value))}
                  className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs font-semibold"
                  placeholder="0.00"
                />
              </label>
            )}

            {/* Pending Amount Read-only */}
            {(isPartial || isCredit) && (
              <div className="flex flex-col justify-end">
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Pending Amount</span>
                <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-700">
                  ₹ {amountPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Due Date */}
            {(isPartial || isCredit) && (
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Due Date *</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs font-semibold focus:border-blue-400 focus:ring-blue-100"
                />
              </label>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}
