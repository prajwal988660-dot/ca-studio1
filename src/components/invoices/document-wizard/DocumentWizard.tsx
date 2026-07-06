import { useState } from 'react';
import type { DocumentWizardProps } from './types';
import { WIZARD_CONFIG, GSTR1_TABLE_LABELS } from './config';
import { STATE_CODES } from '@/lib/accounting/gstInvoices';
import { useDocumentState } from './useDocumentState';
import { useCompany } from '@/hooks/useCompany';
import { HeaderSection } from './sections/HeaderSection';
import { PartySection } from './sections/PartySection';
import { OriginalInvoiceSection } from './sections/OriginalInvoiceSection';
import { LineItemsSection } from './sections/LineItemsSection';
import { PurchaseItemSection } from './sections/PurchaseItemSection';
import { OptionsSection } from './sections/OptionsSection';
import { PaymentSection } from './sections/PaymentSection';
import { SummarySection } from './sections/SummarySection';
import { InvoicePreview } from './preview/InvoicePreview';

export function DocumentWizard({
  mode,
  companyId,
  sellerStateCode,
  initialInvoice,
  initialPurchase,
  onClose,
  onSave,
}: DocumentWizardProps) {
  const config = WIZARD_CONFIG[mode];
  const { company } = useCompany();
  const companyName = company?.name || '';
  const companyGstin = company?.gst_details?.gstin || '';
  const companyStateCode = companyGstin.length >= 2 ? companyGstin.slice(0, 2) : '';
  const companyStateName = (companyStateCode && STATE_CODES[companyStateCode]) || company?.entity_details?.state || '';

  const [showPreview, setShowPreview] = useState(false);

  const state = useDocumentState(
    mode,
    companyId,
    sellerStateCode,
    companyStateName,
    initialInvoice,
    initialPurchase,
  );

  const handleSave = () => {
    const ok = state.save();
    if (ok) {
      onSave();
      onClose();
    }
  };

  const isEditing = !!(initialInvoice?.id || initialPurchase?.id);
  const invalidFields = state.invalidFields;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="flex h-full w-full max-w-[1600px] max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {isEditing ? `Edit ${config.title}` : `New ${config.title}`}
            </span>
            {config.showGstr1Badge && state.kind === 'sales' && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${config.accentBadgeBg} ${config.accentBadgeText}`}>
                {GSTR1_TABLE_LABELS[state.totals.gstr1Table] || state.totals.gstr1Table}
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${config.accentBadgeBg} ${config.accentBadgeText}`}>
              {config.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              {showPreview ? 'Form' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              className={`h-8 rounded-lg px-5 text-xs font-semibold text-white ${config.accentBg} ${config.accentHover}`}
            >
              {isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── Inline validation banner (shown at top, no scroll needed) ── */}
        {invalidFields.length > 0 && (
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            Please fill in the highlighted fields above.
          </div>
        )}

        {/* ── Form Layout ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
          <div className="mx-auto max-w-4xl space-y-5">
            {/* Header */}
            {state.kind === 'sales' ? (
              <HeaderSection kind="sales" invoice={state.invoice} updateInvoice={state.updateInvoice} mode={mode} invalidFields={invalidFields} />
            ) : (
              <HeaderSection kind="purchase" fields={state.fields} updateField={state.updateField} mode={mode} invalidFields={invalidFields} />
            )}

            {/* Original Invoice (returns only) */}
            {config.showOriginalInvoice && (
              state.kind === 'sales' ? (
                <OriginalInvoiceSection kind="sales" invoice={state.invoice} updateInvoice={state.updateInvoice} existingInvoices={state.existingInvoices} selectOriginalInvoice={state.selectOriginalInvoice} mode={mode} invalidFields={invalidFields} />
              ) : (
                <OriginalInvoiceSection kind="purchase" fields={state.fields} updateField={state.updateField} existingPurchases={state.existingPurchases} selectOriginalPurchase={state.selectOriginalPurchase} mode={mode} invalidFields={invalidFields} />
              )
            )}

            {/* Party */}
            {state.kind === 'sales' ? (
              <PartySection kind="sales" invoice={state.invoice} updateInvoice={state.updateInvoice} handleGstinChange={state.handleGstinChange} gstinError={state.gstinError} gstinLocked={state.gstinLocked} mode={mode} invalidFields={invalidFields} />
            ) : (
              <PartySection kind="purchase" fields={state.fields} updateField={state.updateField} gstinLocked={state.gstinLocked} mode={mode} invalidFields={invalidFields} />
            )}

            {/* Line Items */}
            {config.multiLineItems && state.kind === 'sales' ? (
              <LineItemsSection invoice={state.invoice} updateItem={state.updateItem} addItem={state.addItem} removeItem={state.removeItem} />
            ) : state.kind === 'purchase' ? (
              <PurchaseItemSection fields={state.fields} updateField={state.updateField} mode={mode} invalidFields={invalidFields} />
            ) : null}

            {/* Options */}
            {state.kind === 'sales' ? (
              <OptionsSection kind="sales" invoice={state.invoice} updateInvoice={state.updateInvoice} sellerStateCode={sellerStateCode} mode={mode} />
            ) : (
              <OptionsSection kind="purchase" fields={state.fields} updateField={state.updateField} mode={mode} />
            )}

            {/* Payment & Routing */}
            {state.kind === 'sales' ? (
              <PaymentSection kind="sales" invoice={state.invoice} updateInvoice={state.updateInvoice} mode={mode} />
            ) : (
              <PaymentSection kind="purchase" fields={state.fields} updateField={state.updateField} mode={mode} />
            )}

            {/* Summary */}
            {state.kind === 'sales' ? (
              <SummarySection kind="sales" totals={state.totals} mode={mode} />
            ) : (
              <SummarySection kind="purchase" totals={state.totals} mode={mode} />
            )}

            {/* Non-field errors (e.g. "original invoice not found") */}
            {state.error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
                {state.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
