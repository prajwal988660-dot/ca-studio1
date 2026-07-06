import type { InvoiceV2, InvoiceV2Draft, PurchaseInvoice, PurchaseInvoiceDraft, CdnReason, Gstr1Table, SupplyType } from '@/lib/accounting/gstInvoices';

export type DocumentMode = 'sales_invoice' | 'purchase_invoice' | 'sales_return' | 'purchase_return';

export interface DocumentWizardProps {
  mode: DocumentMode;
  companyId: string;
  sellerStateCode?: string;
  initialInvoice?: InvoiceV2 | null;
  initialPurchase?: PurchaseInvoice | null;
  onClose: () => void;
  onSave: () => void;
}

export interface WizardModeConfig {
  title: string;
  partyLabel: string;
  accent: string;         // tailwind color prefix (blue, emerald, rose, amber)
  accentBg: string;       // e.g. 'bg-blue-600'
  accentHover: string;    // e.g. 'hover:bg-blue-700'
  accentBadgeBg: string;  // e.g. 'bg-blue-100'
  accentBadgeText: string; // e.g. 'text-blue-800'
  multiLineItems: boolean;
  showOriginalInvoice: boolean;
  showItc: boolean;
  showGstr1Badge: boolean;
  docType: 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  isSalesMode: boolean;
}

export type DocumentDraft =
  | { mode: 'sales_invoice' | 'sales_return'; data: InvoiceV2Draft }
  | { mode: 'purchase_invoice' | 'purchase_return'; data: PurchaseInvoiceDraft };

export interface SalesTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  total: number;
  amountInWords: string;
  gstr1Table: Gstr1Table;
  supplyType: SupplyType;
  isIntra: boolean;
}

export interface PurchaseTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  supplyType: SupplyType;
  isIntra: boolean;
}
