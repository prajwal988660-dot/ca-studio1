import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DocumentMode, SalesTotals, PurchaseTotals } from './types';
import { WIZARD_CONFIG } from './config';
import {
  amountToWords,
  autoCategorize,
  calcLineItem,
  createEmptyInvoiceV2Draft,
  createEmptyLineItem,
  createInvoiceV2,
  createPurchaseInvoice,
  determineGSTR1Table,
  determineSupplyType,
  getStateCodeFromGSTIN,
  getStateFromGSTIN,
  gstinIsValid,
  listInvoicesV2,
  listPurchaseInvoices,
  updateInvoiceV2,
  updatePurchaseInvoice,
  type CdnReason,
  type DocType,
  type InvoiceV2,
  type InvoiceV2Draft,
  type LineItem,
  type PurchaseBucket,
  type PurchaseInvoice,
  type PurchaseInvoiceDraft,
  type SupplyNature,
  type SupplyType,
  STATE_CODES,
  GST_RATES,
  isCessApplicable,
  getCessInfo,
  validateSalesWizardStep3,
} from '@/lib/accounting/gstInvoices';
import { createSalesJournalEntry, createPurchaseJournalEntry } from '@/lib/accounting/invoiceJournalSync';
import { listJournalEntries, deleteJournalEntry } from '@/lib/offlineDb';

interface UseSalesDocumentState {
  kind: 'sales';
  invoice: InvoiceV2Draft;
  updateInvoice: (updates: Partial<InvoiceV2Draft>) => void;
  updateItem: (index: number, updates: Partial<LineItem>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  handleGstinChange: (value: string) => void;
  gstinError: string | null;
  gstinLocked: boolean;
  totals: SalesTotals;
  error: string | null;
  invalidFields: string[];
  save: () => boolean;
  existingInvoices: InvoiceV2[];
  selectOriginalInvoice: (inv: InvoiceV2) => void;
}

interface UsePurchaseDocumentState {
  kind: 'purchase';
  fields: PurchaseFields;
  updateField: <K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => void;
  gstinLocked: boolean;
  totals: PurchaseTotals;
  error: string | null;
  invalidFields: string[];
  save: () => boolean;
  existingPurchases: PurchaseInvoice[];
  selectOriginalPurchase: (inv: PurchaseInvoice) => void;
}

export interface PurchaseFields {
  invoiceDate: string;
  bucket: PurchaseBucket;
  vendorName: string;
  vendorGstin: string;
  itemDescription: string;
  itemHsn: string;
  itemQty: string;
  itemRate: string;
  itemDiscount: string;
  posState: string;
  supplyType: SupplyType;
  taxable: string;
  gstRate: string;
  rcmApplicable: boolean;
  capitalGoods: boolean;
  itcEligible: boolean;
  itcStatus: string;
  itcBlockReason: string;
  purchaseSubType: string;
  billOfEntryNo: string;
  billOfEntryDate: string;
  portCode: string;
  assessmentValue: string;
  bcdAmount: string;
  isdType: 'NORMAL' | 'REVERSAL';
  vendorInvoiceNo: string;
  narration: string;
  origInvNo: string;
  origInvDate: string;
  returnReason: string;
  showAdvanced: boolean;
  paymentMode: 'CASH' | 'ONLINE' | 'CREDIT' | 'PARTIAL';
  paidMedium: 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER';
  amountPaid: string;
  amountPending: string;
  dueDate: string;
}

export type DocumentState = UseSalesDocumentState | UsePurchaseDocumentState;

function initPurchaseFields(
  mode: 'purchase_invoice' | 'purchase_return',
  initial: PurchaseInvoice | null | undefined,
  companyStateName: string,
): PurchaseFields {
  const today = new Date().toISOString().slice(0, 10);
  if (initial) {
    return {
      invoiceDate: initial.invoice_date,
      bucket: mode === 'purchase_return' ? 'CDNR' : initial.bucket,
      vendorName: initial.vendor_name,
      vendorGstin: initial.vendor_gstin || '',
      itemDescription: initial.item_description || '',
      itemHsn: initial.item_hsn || '',
      itemQty: String(initial.item_qty ?? 1),
      itemRate: String(initial.item_rate ?? 0),
      itemDiscount: '0',
      posState: initial.place_of_supply_state || companyStateName,
      supplyType: initial.supply_type,
      taxable: String(initial.taxable_value || 0),
      gstRate: String(initial.gst_rate || 0),
      rcmApplicable: Boolean(initial.rcm_applicable),
      capitalGoods: Boolean(initial.capital_goods),
      itcEligible: Boolean(initial.itc_eligible),
      itcStatus: initial.itc_status || 'ELIGIBLE_FULL',
      itcBlockReason: initial.itc_block_reason || '17(5)(a)',
      purchaseSubType: initial.purchase_sub_type || '',
      billOfEntryNo: initial.bill_of_entry_no || '',
      billOfEntryDate: initial.bill_of_entry_date || '',
      portCode: initial.port_code || '',
      assessmentValue: String(initial.assessment_value || 0),
      bcdAmount: String(initial.bcd_amount || 0),
      isdType: initial.isd_type || 'NORMAL',
      vendorInvoiceNo: initial.vendor_invoice_no || '',
      narration: initial.narration || '',
      origInvNo: initial.original_invoice_no || '',
      origInvDate: initial.original_invoice_date || '',
      returnReason: 'DEFECTIVE',
      showAdvanced: !!initial.purchase_sub_type || !!initial.bill_of_entry_no || !!initial.capital_goods || initial.bucket === 'ISD' || initial.bucket === 'IMPG' || initial.bucket === 'IMPG_SEZ',
      paymentMode: initial.payment_mode || 'CREDIT',
      paidMedium: initial.paid_medium || 'BANK_TRANSFER',
      amountPaid: String(initial.amount_paid || 0),
      amountPending: String(initial.amount_pending || initial.total || 0),
      dueDate: initial.due_date || '',
    };
  }
  return {
    invoiceDate: today,
    bucket: mode === 'purchase_return' ? 'CDNR' : 'B2B',
    vendorName: '',
    vendorGstin: '',
    itemDescription: '',
    itemHsn: '',
    itemQty: '1',
    itemRate: '0',
    itemDiscount: '0',
    posState: companyStateName,
    supplyType: 'intra',
    taxable: '0',
    gstRate: '18',
    rcmApplicable: false,
    capitalGoods: false,
    itcEligible: true,
    itcStatus: 'ELIGIBLE_FULL',
    itcBlockReason: '17(5)(a)',
    purchaseSubType: '',
    billOfEntryNo: '',
    billOfEntryDate: '',
    portCode: '',
    assessmentValue: '0',
    bcdAmount: '0',
    isdType: 'NORMAL',
    vendorInvoiceNo: '',
    narration: '',
    origInvNo: '',
    origInvDate: '',
    returnReason: 'DEFECTIVE',
    showAdvanced: false,
    paymentMode: 'CREDIT',
    paidMedium: 'BANK_TRANSFER',
    amountPaid: '0',
    amountPending: '0',
    dueDate: '',
  };
}

export function useDocumentState(
  mode: DocumentMode,
  companyId: string,
  sellerStateCode: string | undefined,
  companyStateName: string,
  initialInvoice?: InvoiceV2 | null,
  initialPurchase?: PurchaseInvoice | null,
): DocumentState {
  const config = WIZARD_CONFIG[mode];

  // ─── SALES MODE ───
  if (config.isSalesMode) {
    return useSalesState(mode as 'sales_invoice' | 'sales_return', companyId, sellerStateCode, initialInvoice);
  }

  // ─── PURCHASE MODE ───
  return usePurchaseState(mode as 'purchase_invoice' | 'purchase_return', companyId, sellerStateCode, companyStateName, initialPurchase);
}

function useSalesState(
  mode: 'sales_invoice' | 'sales_return',
  companyId: string,
  sellerStateCode: string | undefined,
  initialInvoice?: InvoiceV2 | null,
): UseSalesDocumentState {
  const docType: DocType = mode === 'sales_return' ? 'CREDIT_NOTE' : 'TAX_INVOICE';

  const [invoice, setInvoice] = useState<InvoiceV2Draft>(() => {
    if (initialInvoice) {
      const { id: _id, company_id: _cid, created_at: _ca, updated_at: _ua, ...rest } = initialInvoice;
      return { ...rest, items: rest.items?.length ? rest.items.map((item) => ({ ...item })) : [createEmptyLineItem(1)] };
    }
    const draft = createEmptyInvoiceV2Draft(docType);
    if (mode === 'sales_return') {
      draft.note_type = 'C';
      draft.cdn_reason = 'SALES_RETURN';
    }
    return draft;
  });

  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [gstinLocked, setGstinLocked] = useState(false);

  const updateInvoice = useCallback((updates: Partial<InvoiceV2Draft>) => {
    setInvoice((prev) => ({ ...prev, ...updates }));
    // Clear validation on change
    const changedKeys = Object.keys(updates);
    setInvalidFields((prev) => prev.filter((f) => !changedKeys.includes(f)));
  }, []);

  const updateItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setInvoice((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...updates };
      return { ...prev, items };
    });
  }, []);

  const addItem = useCallback(() => {
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem(prev.items.length + 1)],
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setInvoice((prev) => {
      if (prev.items.length <= 1) return prev;
      const items = prev.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, sl_no: i + 1 }));
      return { ...prev, items };
    });
  }, []);

  // Bill of Supply effect
  useEffect(() => {
    if (invoice.doc_type !== 'BILL_OF_SUPPLY') return;
    const mappedNature: SupplyNature =
      invoice.bos_reason === 'EXEMPT' ? 'EXEMPT'
        : invoice.bos_reason === 'NIL_RATED' ? 'NIL_RATED'
        : invoice.bos_reason === 'NON_GST' ? 'NON_GST'
        : invoice.bos_reason === 'MRP_INCLUSIVE' ? 'MRP_INCLUSIVE'
        : invoice.bos_reason === 'EXPORT_LUT' ? 'ZERO_RATED'
        : 'TAXABLE';
    setInvoice((prev) => ({
      ...prev,
      gstr1_table: 'NIL',
      reverse_charge: false,
      items: prev.items.map((item) => ({
        ...item,
        supply_nature: mappedNature,
        gst_rate: 0,
        cess_rate: 0,
        cess_specific_rate: 0,
      })),
    }));
  }, [invoice.doc_type, invoice.bos_reason]);

  // Auto-categorize — respects force_igst override
  useEffect(() => {
    const catUpdates = autoCategorize(invoice, sellerStateCode);
    const keys = Object.keys(catUpdates) as Array<keyof InvoiceV2Draft>;
    const catAny = catUpdates as unknown as Record<string, unknown>;
    const invAny = invoice as unknown as Record<string, unknown>;
    const needsUpdate = keys.some((k) => catAny[k] !== invAny[k]);
    if (needsUpdate) {
      setInvoice((prev) => {
        const updated = { ...prev, ...catUpdates };
        // If force_igst is on, always override to inter-state
        if (prev.force_igst) {
          updated.supply_type = 'inter';
          updated.is_intra_state = false;
        }
        return updated;
      });
    }
  }, [
    invoice.buyer_gstin,
    invoice.doc_type,
    invoice.buyer_type,
    invoice.export_type,
    invoice.place_of_supply,
    invoice.total_amount,
    invoice.is_amendment,
    invoice.force_igst,
    sellerStateCode,
  ]);

  // Recalculate totals — respects force_igst
  useEffect(() => {
    const pos = invoice.place_of_supply || invoice.buyer_state_code;
    const autoSupplyType = determineSupplyType(sellerStateCode, invoice.buyer_state_code, pos);
    // force_igst overrides to inter-state regardless of POS/seller state
    const forcedType: SupplyType | null =
      (invoice.force_igst || invoice.buyer_type === 'CBW' || invoice.buyer_type === 'OVERSEAS') ? 'inter' : null;
    const supplyType = forcedType || autoSupplyType;
    const isIntra = supplyType === 'intra';

    let totalTaxable = 0;
    let totalDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;

    const updatedItems = invoice.items.map((item) => {
      const calc = calcLineItem(item, isIntra, invoice.doc_type);
      totalTaxable += calc.taxableValue;
      totalDiscount += item.discount || 0;
      totalCgst += calc.cgst;
      totalSgst += calc.sgst;
      totalIgst += calc.igst;
      totalCess += calc.cess;
      return {
        ...item,
        taxable_value: calc.taxableValue,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        cess: calc.cess,
        line_total: calc.lineTotal,
      };
    });

    const subtotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
    const roundOff = Math.round(subtotal) - subtotal;
    const totalAmount = Math.round(subtotal);

    let amtPending = 0;
    let amtReceived = invoice.amount_received || 0;
    if (invoice.payment_mode === 'CASH' || invoice.payment_mode === 'ONLINE') {
      amtPending = 0;
      amtReceived = totalAmount;
    } else if (invoice.payment_mode === 'CREDIT') {
      amtPending = totalAmount;
      amtReceived = 0;
    } else if (invoice.payment_mode === 'PARTIAL') {
      amtPending = Math.max(0, totalAmount - amtReceived);
    }

    setInvoice((prev) => ({
      ...prev,
      items: updatedItems,
      supply_type: supplyType,
      is_intra_state: isIntra,
      total_taxable: totalTaxable,
      total_discount: totalDiscount,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_igst: totalIgst,
      total_cess: totalCess,
      round_off: roundOff,
      total_amount: totalAmount,
      amount_in_words: amountToWords(totalAmount),
      gstr1_table: determineGSTR1Table(prev),
      amount_pending: amtPending,
      amount_received: amtReceived,
    }));
  }, [
    invoice.items.map((i) => `${i.qty}-${i.rate}-${i.discount}-${i.gst_rate}-${i.cess_rate}-${i.cess_specific_rate}-${i.supply_nature}`).join(','),
    invoice.buyer_state_code,
    invoice.place_of_supply,
    invoice.doc_type,
    invoice.buyer_type,
    invoice.export_type,
    invoice.invoice_type,
    invoice.b2c_type,
    invoice.is_amendment,
    invoice.supply_type,
    invoice.force_igst,
    invoice.payment_mode,
    invoice.amount_received,
    sellerStateCode,
  ]);

  const handleGstinChange = useCallback((value: string) => {
    const gstin = value.trim().toUpperCase();
    if (!gstin) {
      updateInvoice({ buyer_gstin: '' });
      setGstinError(null);
      return;
    }

    const updates: Partial<InvoiceV2Draft> = { buyer_gstin: gstin };

    if (gstin.length >= 2) {
      const stateCode = getStateCodeFromGSTIN(gstin);
      const stateName = getStateFromGSTIN(gstin);
      if (stateCode && stateName) {
        updates.buyer_state_code = stateCode;
        updates.buyer_state = stateName;
        updates.place_of_supply = stateCode;
      }
    }

    if (gstin.length === 15) {
      if (!gstinIsValid(gstin)) {
        setGstinError('Invalid GSTIN format');
      } else {
        setGstinError(null);
      }
    } else {
      setGstinError(null);
    }

    updateInvoice(updates);
  }, [updateInvoice]);

  const totals = useMemo<SalesTotals>(() => ({
    taxable: invoice.total_taxable,
    cgst: invoice.total_cgst,
    sgst: invoice.total_sgst,
    igst: invoice.total_igst,
    cess: invoice.total_cess,
    roundOff: invoice.round_off,
    total: invoice.total_amount,
    amountInWords: invoice.amount_in_words,
    gstr1Table: invoice.gstr1_table,
    supplyType: invoice.supply_type,
    isIntra: invoice.is_intra_state,
  }), [invoice.total_taxable, invoice.total_cgst, invoice.total_sgst, invoice.total_igst, invoice.total_cess, invoice.round_off, invoice.total_amount, invoice.amount_in_words, invoice.gstr1_table, invoice.supply_type, invoice.is_intra_state]);

  const existingInvoices = useMemo(() => {
    if (mode !== 'sales_return') return [];
    return listInvoicesV2(companyId).filter((inv) => inv.doc_type === 'TAX_INVOICE');
  }, [companyId, mode]);

  const selectOriginalInvoice = useCallback((inv: InvoiceV2) => {
    updateInvoice({
      original_invoice_no: inv.invoice_no,
      original_invoice_date: inv.invoice_date,
      buyer_name: inv.buyer_name,
      buyer_gstin: inv.buyer_gstin,
      buyer_state_code: inv.buyer_state_code,
      buyer_state: inv.buyer_state,
      place_of_supply: inv.place_of_supply,
      force_igst: inv.force_igst || false,
      payment_mode: inv.payment_mode,
      received_medium: inv.received_medium,
      due_date: inv.due_date,
      ...(inv.items?.length ? { items: inv.items.map((item) => ({ ...item })) } : {}),
    });
    if (inv.buyer_gstin) {
      handleGstinChange(inv.buyer_gstin);
    }
    setGstinLocked(true);
  }, [updateInvoice, handleGstinChange]);

  const save = useCallback((): boolean => {
    const errors: string[] = [];

    if (!invoice.invoice_date?.trim()) errors.push('invoice_date');
    if (invoice.buyer_type !== 'CONSUMER' && !invoice.buyer_name.trim()) {
      if (!(invoice.b2c_type === 'B2CS')) errors.push('buyer_name');
    }
    if (mode === 'sales_return') {
      if (!invoice.original_invoice_no?.trim()) errors.push('original_invoice_no');
      if (!invoice.original_invoice_date) errors.push('original_invoice_date');
    }

    if (errors.length > 0) {
      setInvalidFields(errors);
      setError(null);
      return false;
    }

    if (mode === 'sales_return') {
      const allInvoices = listInvoicesV2(companyId);
      const origInv = allInvoices.find((inv) => inv.invoice_no === invoice.original_invoice_no?.trim() && inv.doc_type !== 'CREDIT_NOTE');
      if (!origInv) {
        setError('Original Invoice not found in register.');
        return false;
      }
    }
    const itemValidation = validateSalesWizardStep3(invoice);
    if (!itemValidation.ok) { setError(itemValidation.error); return false; }

    setError(null);
    setInvalidFields([]);
    try {
      if (initialInvoice?.id) {
        const updated = updateInvoiceV2(initialInvoice.id, invoice);
        // Sync ledgers: delete old JE(s) linked to this invoice, then recreate
        listJournalEntries(companyId)
          .filter((e) => e.voucher_number === initialInvoice.invoice_no)
          .forEach((e) => deleteJournalEntry(e.id));
        createSalesJournalEntry(companyId, { ...invoice, id: initialInvoice.id } as InvoiceV2);
        // If editing a credit note: adjust original invoice pending by the amount delta
        if (updated && initialInvoice.doc_type === 'CREDIT_NOTE' && updated.original_invoice_no) {
          const origInv = listInvoicesV2(companyId).find(
            (x) => x.invoice_no === updated.original_invoice_no && x.doc_type !== 'CREDIT_NOTE'
          );
          if (origInv) {
            const delta = updated.total_amount - (initialInvoice.total_amount ?? 0);
            if (delta !== 0) {
              const newPending = Math.max(0, (origInv.amount_pending ?? origInv.total_amount) - delta);
              updateInvoiceV2(origInv.id, { amount_pending: newPending });
            }
          }
        }
      } else {
        const saved = createInvoiceV2(companyId, invoice);
        createSalesJournalEntry(companyId, saved);
        // If creating a credit note (sales return): reduce original invoice pending
        if (mode === 'sales_return' && saved.original_invoice_no) {
          const origInv = listInvoicesV2(companyId).find(
            (x) => x.invoice_no === saved.original_invoice_no && x.doc_type !== 'CREDIT_NOTE'
          );
          if (origInv) {
            const newPending = Math.max(0, (origInv.amount_pending ?? origInv.total_amount) - saved.total_amount);
            updateInvoiceV2(origInv.id, { amount_pending: newPending });
          }
        }
      }
      return true;
    } catch {
      setError('Failed to save invoice');
      return false;
    }
  }, [invoice, companyId, initialInvoice, mode]);

  return {
    kind: 'sales',
    invoice,
    updateInvoice,
    updateItem,
    addItem,
    removeItem,
    handleGstinChange,
    gstinError,
    gstinLocked,
    totals,
    error,
    invalidFields,
    save,
    existingInvoices,
    selectOriginalInvoice,
  };
}

function usePurchaseState(
  mode: 'purchase_invoice' | 'purchase_return',
  companyId: string,
  sellerStateCode: string | undefined,
  companyStateName: string,
  initialPurchase?: PurchaseInvoice | null,
): UsePurchaseDocumentState {
  const [fields, setFields] = useState<PurchaseFields>(() =>
    initPurchaseFields(mode, initialPurchase, companyStateName)
  );
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [gstinLocked, setGstinLocked] = useState(false);

  const updateField = useCallback(<K extends keyof PurchaseFields>(key: K, value: PurchaseFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setInvalidFields((prev) => prev.filter((f) => f !== key));
  }, []);

  // Auto-calc taxable from qty * rate * (1 - discountPct/100)
  useEffect(() => {
    const qty = Number(fields.itemQty || 0);
    const rate = Number(fields.itemRate || 0);
    const discountPct = Number(fields.itemDiscount || 0);
    if (qty > 0 && rate >= 0) {
      const gross = qty * rate;
      const discountAmt = Math.round(gross * discountPct) / 100;
      const taxable = Math.max(0, gross - discountAmt);
      setFields((prev) => ({ ...prev, taxable: taxable.toString() }));
    }
  }, [fields.itemQty, fields.itemRate, fields.itemDiscount]);

  // Auto-calc amount pending
  useEffect(() => {
    const taxable = Number(fields.taxable || 0);
    const gstRate = Number(fields.gstRate || 0);
    const totalGst = taxable * gstRate / 100;
    const totalAmount = Math.round(taxable + totalGst);

    let pending = 0;
    let paid = Number(fields.amountPaid || 0);

    if (fields.paymentMode === 'CASH' || fields.paymentMode === 'ONLINE') {
      pending = 0;
      paid = totalAmount;
    } else if (fields.paymentMode === 'CREDIT') {
      pending = totalAmount;
      paid = 0;
    } else if (fields.paymentMode === 'PARTIAL') {
      pending = Math.max(0, totalAmount - paid);
    }

    setFields((prev) => ({
      ...prev,
      amountPending: String(pending),
      amountPaid: String(paid),
    }));
  }, [fields.taxable, fields.gstRate, fields.paymentMode, fields.amountPaid]);

  // Auto-detect supply type from vendor GSTIN vs Place of Supply
  useEffect(() => {
    if (!fields.vendorGstin || !gstinIsValid(fields.vendorGstin) || !fields.posState) return;
    const vendorStateCode = fields.vendorGstin.slice(0, 2);
    const posStateCode = Object.keys(STATE_CODES).find(k => STATE_CODES[k] === fields.posState);
    if (!posStateCode) return;
    const autoSupply: SupplyType = posStateCode === vendorStateCode ? 'intra' : 'inter';
    setFields((prev) => prev.supplyType === autoSupply ? prev : { ...prev, supplyType: autoSupply });
  }, [fields.vendorGstin, fields.posState]);

  // Auto-adjust GST rate based on bucket selection
  useEffect(() => {
    if (fields.bucket === 'URD' || fields.bucket === 'EXEMPT_NIL') {
      setFields((prev) => prev.gstRate === '0' ? prev : { ...prev, gstRate: '0' });
    } else if (fields.bucket === 'B2B' && fields.gstRate === '0') {
      setFields((prev) => ({ ...prev, gstRate: '18' }));
    }
  }, [fields.bucket]);


  const totals = useMemo<PurchaseTotals>(() => {
    const taxable = Number(fields.taxable || 0);
    const gstRate = Number(fields.gstRate || 0);
    const isIntra = fields.supplyType === 'intra';
    const totalGst = taxable * gstRate / 100;
    return {
      taxable,
      cgst: isIntra ? totalGst / 2 : 0,
      sgst: isIntra ? totalGst / 2 : 0,
      igst: isIntra ? 0 : totalGst,
      total: taxable + totalGst,
      supplyType: fields.supplyType,
      isIntra,
    };
  }, [fields.taxable, fields.gstRate, fields.supplyType]);

  const existingPurchases = useMemo(() => {
    if (mode !== 'purchase_return') return [];
    return listPurchaseInvoices(companyId).filter((inv) => inv.bucket !== 'CDNR');
  }, [companyId, mode]);

  const selectOriginalPurchase = useCallback((inv: PurchaseInvoice) => {
    setFields((prev) => ({
      ...prev,
      origInvNo: inv.invoice_no,
      origInvDate: inv.invoice_date,
      vendorName: inv.vendor_name,
      vendorGstin: inv.vendor_gstin || '',
      posState: inv.place_of_supply_state || prev.posState,
      itemDescription: inv.item_description || '',
      itemHsn: inv.item_hsn || '',
      itemQty: String(inv.item_qty || 0),
      itemRate: String(inv.item_rate || 0),
      itemDiscount: '0',
      taxable: String(inv.taxable_value || 0),
      gstRate: String(inv.gst_rate || 0),
      supplyType: inv.supply_type || prev.supplyType,
      itcEligible: Boolean(inv.itc_eligible),
      itcStatus: inv.itc_status || 'ELIGIBLE_FULL',
      itcBlockReason: inv.itc_block_reason || '17(5)(a)',
      bucket: 'CDNR',
      paymentMode: inv.payment_mode || 'CREDIT',
      paidMedium: inv.paid_medium || 'BANK_TRANSFER',
      amountPaid: String(inv.amount_paid || 0),
      amountPending: String(inv.amount_pending || inv.total || 0),
      dueDate: inv.due_date || '',
      vendorInvoiceNo: inv.vendor_invoice_no || '',
    }));
    setGstinLocked(true);
  }, []);

  const save = useCallback((): boolean => {
    const errors: string[] = [];
    const taxableVal = Number(fields.taxable || 0);
    const gstVal = Number(fields.gstRate || 0);

    if (!fields.invoiceDate) errors.push('invoiceDate');
    if (mode === 'purchase_invoice' && !fields.vendorInvoiceNo.trim()) errors.push('vendorInvoiceNo');
    if (!fields.vendorName.trim()) errors.push('vendorName');
    if (!fields.posState.trim()) errors.push('posState');
    if (mode === 'purchase_return') {
      if (!fields.origInvNo.trim()) errors.push('origInvNo');
      if (!fields.origInvDate) errors.push('origInvDate');
    }
    if (mode === 'purchase_invoice' && fields.bucket === 'B2B' && !gstinIsValid(fields.vendorGstin)) {
      errors.push('vendorGstin');
    }
    if (taxableVal <= 0) errors.push('taxable');

    if (errors.length > 0) {
      setInvalidFields(errors);
      setError(null);
      return false;
    }

    // Non-field errors
    if (fields.vendorGstin && !gstinIsValid(fields.vendorGstin)) {
      setError('Invalid GSTIN format.'); return false;
    }
    if (gstVal < 0) { setError('GST rate cannot be negative.'); return false; }
    if (mode === 'purchase_return') {
      const allPurchases = listPurchaseInvoices(companyId);
      const origPurchase = allPurchases.find((inv) => inv.invoice_no === fields.origInvNo.trim() && inv.bucket !== 'CDNR');
      if (!origPurchase) {
        setError('Original Invoice not found in register.');
        return false;
      }
    }

    const payload: PurchaseInvoiceDraft = {
      invoice_date: fields.invoiceDate,
      vendor_invoice_no: fields.vendorInvoiceNo.trim(),
      bucket: mode === 'purchase_return' ? 'CDNR' : fields.bucket,
      purchase_sub_type: mode === 'purchase_return' ? `DN-${fields.returnReason}` : (fields.purchaseSubType.trim() || undefined),
      vendor_name: fields.vendorName.trim(),
      vendor_gstin: fields.vendorGstin.trim().toUpperCase() || undefined,
      item_description: fields.itemDescription.trim() || undefined,
      item_hsn: fields.itemHsn.trim() || undefined,
      item_qty: Number(fields.itemQty || 0) || undefined,
      item_rate: Number(fields.itemRate || 0) || undefined,
      place_of_supply_state: fields.posState.trim(),
      supply_type: fields.supplyType,
      rcm_applicable: fields.rcmApplicable,
      taxable_value: taxableVal,
      gst_rate: gstVal,
      itc_eligible: fields.itcEligible,
      itc_status: fields.itcStatus as PurchaseInvoiceDraft['itc_status'],
      itc_block_reason: fields.itcStatus === 'BLOCKED_17_5' ? fields.itcBlockReason as PurchaseInvoiceDraft['itc_block_reason'] : undefined,
      bill_of_entry_no: ['IMPG', 'IMPG_SEZ'].includes(fields.bucket) ? fields.billOfEntryNo.trim() || undefined : undefined,
      bill_of_entry_date: ['IMPG', 'IMPG_SEZ'].includes(fields.bucket) ? fields.billOfEntryDate || undefined : undefined,
      port_code: ['IMPG', 'IMPG_SEZ'].includes(fields.bucket) ? fields.portCode.trim() || undefined : undefined,
      assessment_value: ['IMPG', 'IMPG_SEZ'].includes(fields.bucket) ? Number(fields.assessmentValue || 0) : undefined,
      bcd_amount: ['IMPG', 'IMPG_SEZ'].includes(fields.bucket) ? Number(fields.bcdAmount || 0) : undefined,
      isd_type: fields.bucket === 'ISD' ? fields.isdType : undefined,
      capital_goods: fields.capitalGoods,
      original_invoice_no: mode === 'purchase_return' ? fields.origInvNo.trim() : undefined,
      original_invoice_date: mode === 'purchase_return' ? fields.origInvDate : undefined,
      narration: fields.narration.trim() || (mode === 'purchase_return' ? `Purchase return: ${fields.returnReason}` : undefined),
      payment_mode: fields.paymentMode,
      paid_medium: fields.paidMedium,
      amount_paid: Number(fields.amountPaid || 0),
      amount_pending: Number(fields.amountPending || 0),
      due_date: fields.dueDate || undefined,
    };

    setError(null);
    setInvalidFields([]);
    try {
      if (initialPurchase?.id) {
        const updated = updatePurchaseInvoice(initialPurchase.id, payload);
        // Sync ledgers: delete old JE(s) linked to this purchase, then recreate
        listJournalEntries(companyId)
          .filter((e) => e.voucher_number === initialPurchase.invoice_no)
          .forEach((e) => deleteJournalEntry(e.id));
        createPurchaseJournalEntry(companyId, { ...payload, id: initialPurchase.id } as PurchaseInvoice);
        // If editing a debit note: adjust original purchase pending by the amount delta
        if (updated && initialPurchase.bucket === 'CDNR' && updated.original_invoice_no) {
          const origPurchase = listPurchaseInvoices(companyId).find(
            (x) => x.invoice_no === updated.original_invoice_no && x.bucket !== 'CDNR'
          );
          if (origPurchase) {
            const delta = updated.total - initialPurchase.total;
            if (delta !== 0) {
              const newPending = Math.max(0, (origPurchase.amount_pending ?? origPurchase.total) - delta);
              updatePurchaseInvoice(origPurchase.id, { amount_pending: newPending });
            }
          }
        }
      } else {
        const saved = createPurchaseInvoice(companyId, payload);
        createPurchaseJournalEntry(companyId, saved);
        // If creating a debit note (purchase return): reduce original purchase pending
        if (mode === 'purchase_return' && saved.original_invoice_no) {
          const origPurchase = listPurchaseInvoices(companyId).find(
            (x) => x.invoice_no === saved.original_invoice_no && x.bucket !== 'CDNR'
          );
          if (origPurchase) {
            const newPending = Math.max(0, (origPurchase.amount_pending ?? origPurchase.total) - saved.total);
            updatePurchaseInvoice(origPurchase.id, { amount_pending: newPending });
          }
        }
      }
      return true;
    } catch {
      setError('Failed to save');
      return false;
    }
  }, [fields, companyId, initialPurchase, mode, sellerStateCode]);

  return {
    kind: 'purchase',
    fields,
    updateField,
    gstinLocked,
    totals,
    error,
    invalidFields,
    save,
    existingPurchases,
    selectOriginalPurchase,
  };
}
