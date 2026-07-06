'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { generateUniqueEntryCode } from '@/lib/utils/entryCodeGenerator';
import { updateJournalEntry } from '@/lib/offlineDb';
import { useCompany } from '@/hooks/useCompany';
import { STATE_CODES, createPurchaseInvoice, createInvoiceV2, getStateCodeFromGSTIN, type SupplyType } from '@/lib/accounting/gstInvoices';
import { AccountComboBox } from '@/components/entries/AccountComboBox';
import type { JournalLine } from '@/types/journal';
import {
  expandManualJournalLines,
  getExpandedTotals,
  getResolvedClassification,
  type ManualDraftLine,
} from '@/lib/accounting/inventoryJournal';

interface LineItem {
  account_name: string;
  debit: string;
  credit: string;
  account_group?: string;
  nature?: Nature;
}

type Nature = 'asset' | 'liability' | 'capital' | 'revenue' | 'expense';

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSave: (entry: {
    company_id: string;
    entry_code: string;
    entry_date: string;
    voucher_type: string;
    voucher_number?: string;
    lines: JournalLine[];
    narration: string;
    book_period: string;
    is_opening?: boolean;
    is_closing?: boolean;
  }) => Promise<any>;
  defaultVoucherType?: string;
  defaultLines?: Partial<LineItem>[];
  /** When provided, dialog opens in edit mode for this entry. */
  initialEntry?: {
    id: string;
    entry_date: string;
    narration: string;
    lines: JournalLine[];
    entry_code: string;
  };
}

const emptyLine = (): LineItem => ({ account_name: '', debit: '', credit: '' });

const noSpinner = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export function ManualEntryDialog({
  open,
  onOpenChange,
  companyId,
  onSave,
  defaultVoucherType = 'Journal',
  defaultLines,
  initialEntry,
}: ManualEntryDialogProps) {
  const { company } = useCompany();
  const today = new Date().toISOString().split('T')[0];
  const isEditMode = !!initialEntry;
  const [date, setDate] = useState(initialEntry?.entry_date ?? today);
  const voucherType = 'JRN';
  const [narration, setNarration] = useState(initialEntry?.narration ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [gstMeta, setGstMeta] = useState({
    enabled: false,
    mode: null as null | 'intra_input' | 'intra_output' | 'inter_input' | 'inter_output',
    type: 'purchase' as 'sales' | 'purchase',
    gstin: '',
    partyName: '',
    pos: '',
    invoiceNo: '',
    invoiceDate: today,
    taxableValue: '',
    gstRate: '18',
    cgstAmt: '',
    sgstAmt: '',
    igstAmt: '',
    gstLineIdx: -1,
  });
  const [gstPopupOpen, setGstPopupOpen] = useState(false);

  const initialLines = initialEntry
    ? initialEntry.lines.map(l => ({
        account_name: l.account_name,
        debit: l.debit ? String(l.debit) : '',
        credit: l.credit ? String(l.credit) : '',
        account_group: l.account_group,
        nature: l.nature as Nature | undefined,
      }))
    : defaultLines
      ? defaultLines.map(dl => ({ ...emptyLine(), ...dl }))
      : [emptyLine(), emptyLine()];
  const [lines, setLines] = useState<LineItem[]>(initialLines);

  // Reset form to today's date (or initial entry) whenever dialog opens
  useEffect(() => {
    if (!open) return;
    if (initialEntry) {
      setDate(initialEntry.entry_date);
      setNarration(initialEntry.narration);
      setLines(initialEntry.lines.map(l => ({
        account_name: l.account_name,
        debit: l.debit ? String(l.debit) : '',
        credit: l.credit ? String(l.credit) : '',
        account_group: l.account_group,
        nature: l.nature as Nature | undefined,
      })));
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setNarration('');
      setLines(defaultLines ? defaultLines.map(dl => ({ ...emptyLine(), ...dl })) : [emptyLine(), emptyLine()]);
      setGstMeta(g => ({ ...g, enabled: false, mode: null, cgstAmt: '', sgstAmt: '', igstAmt: '', gstLineIdx: -1 }));
      setGstPopupOpen(false);
    }
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleGstChange = (field: keyof typeof gstMeta, value: any) => {
    setGstMeta(prev => {
      const next = { ...prev, [field]: value };
      // Auto-compute CGST/SGST/IGST amounts whenever taxable value or rate changes
      if (field === 'taxableValue' || field === 'gstRate') {
        const taxable = Number(field === 'taxableValue' ? value : prev.taxableValue) || 0;
        const rate = Number(field === 'gstRate' ? value : prev.gstRate) || 0;
        next.cgstAmt = String(parseFloat((taxable * rate / 200).toFixed(2)));
        next.sgstAmt = String(parseFloat((taxable * rate / 200).toFixed(2)));
        next.igstAmt = String(parseFloat((taxable * rate / 100).toFixed(2)));
      }
      return next;
    });
  };

  const handleGstinChange = (value: string) => {
    const gstin = value.trim().toUpperCase();
    setGstMeta(prev => {
      const next = { ...prev, gstin };
      if (gstin.length === 15) {
        const stateCode = getStateCodeFromGSTIN(gstin);
        if (stateCode) next.pos = stateCode;
      }
      return next;
    });
  };

  // Map AccountComboBox special subGroup values → gstMode
  const GST_MODE_MAP: Record<string, 'intra_input' | 'intra_output' | 'inter_input' | 'inter_output'> = {
    GST_INTRA_INPUT: 'intra_input',
    GST_INTRA_OUTPUT: 'intra_output',
    GST_INTER_INPUT: 'inter_input',
    GST_INTER_OUTPUT: 'inter_output',
  };

  // Dismiss popup without saving → clear the virtual line
  const handleGstPopupDismiss = () => {
    const idx = gstMeta.gstLineIdx;
    if (idx >= 0) {
      setLines(prev => {
        const updated = [...prev];
        if (updated[idx] && /gst/i.test(updated[idx].account_name)) {
          updated[idx] = emptyLine();
        }
        return updated;
      });
    }
    setGstPopupOpen(false);
  };

  // Save GST popup → inject actual CGST/SGST/IGST lines
  const handleGstPopupSave = () => {
    const taxable = Number(gstMeta.taxableValue) || 0;
    const rate = Number(gstMeta.gstRate) || 0;
    const mode = gstMeta.mode!;

    const computedHalf = parseFloat((taxable * rate / 200).toFixed(2));
    const computedFull = parseFloat((taxable * rate / 100).toFixed(2));
    const cgst = gstMeta.cgstAmt !== '' ? Number(gstMeta.cgstAmt) || 0 : computedHalf;
    const sgst = gstMeta.sgstAmt !== '' ? Number(gstMeta.sgstAmt) || 0 : computedHalf;
    const igst = gstMeta.igstAmt !== '' ? Number(gstMeta.igstAmt) || 0 : computedFull;

    let newLines: LineItem[];
    if (mode === 'intra_input') {
      newLines = [
        { account_name: 'CGST Input Tax Credit', debit: String(cgst), credit: '', account_group: 'GST — Input Tax Credit', nature: 'asset' },
        { account_name: 'SGST Input Tax Credit', debit: String(sgst), credit: '', account_group: 'GST — Input Tax Credit', nature: 'asset' },
      ];
    } else if (mode === 'intra_output') {
      newLines = [
        { account_name: 'CGST Output Tax', debit: '', credit: String(cgst), account_group: 'GST — Output Tax', nature: 'liability' },
        { account_name: 'SGST Output Tax', debit: '', credit: String(sgst), account_group: 'GST — Output Tax', nature: 'liability' },
      ];
    } else if (mode === 'inter_input') {
      newLines = [
        { account_name: 'IGST Input Tax Credit', debit: String(igst), credit: '', account_group: 'GST — Input Tax Credit', nature: 'asset' },
      ];
    } else {
      newLines = [
        { account_name: 'IGST Output Tax', debit: '', credit: String(igst), account_group: 'GST — Output Tax', nature: 'liability' },
      ];
    }

    const idx = gstMeta.gstLineIdx;
    setLines(prev => {
      const updated = [...prev];
      if (idx >= 0 && idx < updated.length) {
        updated.splice(idx, 1, ...newLines);
      } else {
        updated.push(...newLines);
      }
      return updated;
    });

    setGstPopupOpen(false);
  };

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAccountNameChange = (
    idx: number,
    name: string,
    meta?: { primaryGroup: string; subGroup: string; nature: Nature }
  ) => {
    setLines(prev => {
      const updated = [...prev];
      const current = updated[idx];
      const resolved = meta
        ? { subGroup: meta.subGroup, nature: meta.nature as JournalLine['nature'] }
        : getResolvedClassification(name, { voucherType, companyId });

      // Detect GST shortcut accounts (Intra/Inter GST Input/Output) and open the new popup
      if (meta) {
        const gstMode = GST_MODE_MAP[meta.subGroup];
        if (gstMode) {
          const isInput = gstMode.includes('input');
          const companyStateCode = company?.gst_details?.gstin ? getStateCodeFromGSTIN(company.gst_details.gstin) : '';
          setGstMeta(g => ({
            ...g,
            enabled: true,
            mode: gstMode,
            type: isInput ? 'purchase' : 'sales',
            gstLineIdx: idx,
            pos: g.pos || companyStateCode || '',
          }));
          setGstPopupOpen(true);
        }
      }

      updated[idx] = {
        ...current,
        account_name: name,
        ...(resolved ? { account_group: resolved.subGroup, nature: resolved.nature } : {}),
      };
      return updated;
    });
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const expandedTotals = getExpandedTotals(lines as ManualDraftLine[], { voucherType, companyId });
  const rd = Math.round(expandedTotals.debit * 100) / 100;
  const rc = Math.round(expandedTotals.credit * 100) / 100;
  const BALANCE_TOLERANCE = 0.05;
  const hasMovement = Math.max(rd, rc) > 0.0001;
  const isBalanced = hasMovement && Math.abs(rd - rc) <= BALANCE_TOLERANCE;

  const resetForm = () => {
    setDate(today);
    setNarration('');
    setLines(defaultLines ? defaultLines.map(dl => ({ ...emptyLine(), ...dl })) : [emptyLine(), emptyLine()]);
    setError('');
    setGstMeta(g => ({ ...g, enabled: false, mode: null, cgstAmt: '', sgstAmt: '', igstAmt: '', gstLineIdx: -1 }));
  };

  const handleClose = () => { if (saving) return; onOpenChange(false); };

  const handleSave = async () => {
    const validLines = expandManualJournalLines(lines as ManualDraftLine[], { voucherType, companyId });
    if (validLines.length < 2) { setError('At least 2 lines with amounts required'); return; }
    if (!isBalanced) { setError(`Dr (${formatIndianCurrency(rd)}) ≠ Cr (${formatIndianCurrency(rc)}). Difference: ${formatIndianCurrency(Math.abs(rd - rc))}`); return; }
    if (!date) { setError('Date is required'); return; }

    setSaving(true);
    setError('');

    try {
      // Edit mode: update existing entry
      if (isEditMode && initialEntry) {
        const d = new Date(date);
        const fyStartYear = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
        updateJournalEntry(initialEntry.id, {
          entry_date: date,
          lines: validLines,
          narration: narration.trim(),
          book_period: `${fyStartYear}-${fyStartYear + 1}`,
        });
        resetForm();
        onOpenChange(false);
        return;
      }

      const entryCode = generateUniqueEntryCode(companyId, voucherType);
      const d = new Date(date);
      const fyStartYear = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
      const bookPeriod = `${fyStartYear}-${fyStartYear + 1}`;

      const createdEntry = await onSave({
        company_id: companyId,
        entry_code: entryCode,
        entry_date: date,
        voucher_type: voucherType,
        lines: validLines,
        narration: narration.trim(),
        book_period: bookPeriod,
      });

      if (gstMeta.enabled && createdEntry?.id && gstMeta.mode) {
        const taxable = Number(gstMeta.taxableValue) || 0;
        const rate = Number(gstMeta.gstRate) || 0;
        const supplyType: SupplyType = gstMeta.mode.startsWith('intra') ? 'intra' : 'inter';
        const totalAmount = validLines.reduce((acc, l) => acc + (l.debit || 0), 0);

        if (gstMeta.type === 'purchase') {
          createPurchaseInvoice(companyId, {
            invoice_date: gstMeta.invoiceDate, vendor_invoice_no: gstMeta.invoiceNo,
            bucket: 'B2B', vendor_name: gstMeta.partyName, vendor_gstin: gstMeta.gstin,
            place_of_supply_state: gstMeta.pos, supply_type: supplyType,
            taxable_value: taxable, gst_rate: rate, itc_eligible: true,
            linked_journal_id: createdEntry.id, payment_mode: 'CREDIT', total: totalAmount,
          } as any);
        } else {
          // Pass a synthetic line item so recalculateInvoiceTotals computes correct
          // CGST/SGST/IGST amounts (it sums from items; empty items → zero amounts)
          const syntheticItem = {
            sl_no: 1, description: 'Manual Journal GST Entry', hsn: '',
            is_service: false, uqc: 'OTH',
            qty: 1, rate: taxable, discount: 0, taxable_value: taxable,
            supply_nature: 'TAXABLE', gst_rate: rate,
            cess_rate: 0, cess_specific_rate: 0,
            cgst: 0, sgst: 0, igst: 0, cess: 0, line_total: 0,
          };
          createInvoiceV2(companyId, {
            doc_type: 'TAX_INVOICE', invoice_date: gstMeta.invoiceDate, invoice_no: gstMeta.invoiceNo,
            buyer_name: gstMeta.partyName, buyer_gstin: gstMeta.gstin, place_of_supply: gstMeta.pos,
            supply_type: supplyType, is_intra_state: supplyType === 'intra',
            total_taxable: taxable, total_amount: totalAmount,
            linked_journal_id: createdEntry.id,
            buyer_type: gstMeta.gstin ? 'REGISTERED' : 'CONSUMER',
            items: [syntheticItem],
          } as any);
        }
      }

      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* ── Main Dialog ── */}
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={handleClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-gray-900">{isEditMode ? `Edit Entry — ${initialEntry?.entry_code}` : 'New Journal Entry'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-7 w-36 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                />
              </div>
            </div>
            <button onClick={handleClose} disabled={saving} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* Lines section */}
            <div className="px-6 pt-5 pb-4">

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_116px_116px_32px] gap-2 mb-1.5 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Debit (₹)</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Credit (₹)</span>
                <span />
              </div>

              {/* Lines */}
              <div className="space-y-1">
                {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_116px_116px_32px] gap-2 items-center">
                      <AccountComboBox
                        companyId={companyId}
                        value={line.account_name}
                        onChange={(name, meta?: any) => handleAccountNameChange(idx, name, meta)}
                        placeholder="Account name"
                        className="h-8 text-sm"
                      />
                      <input
                        type="number"
                        value={line.debit}
                        onChange={e => { updateLine(idx, 'debit', e.target.value); if (e.target.value) updateLine(idx, 'credit', ''); }}
                        placeholder="0.00"
                        className={`w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-right font-mono ${noSpinner}`}
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={line.credit}
                        onChange={e => { updateLine(idx, 'credit', e.target.value); if (e.target.value) updateLine(idx, 'debit', ''); }}
                        placeholder="0.00"
                        className={`w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-right font-mono ${noSpinner}`}
                        step="0.01"
                      />
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 2}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                ))}
              </div>

              {/* Add Line + Totals row */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold text-blue-600 border border-blue-200 border-dashed rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Line
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 font-medium">Total</span>
                  <span className={`font-mono font-bold px-2 py-1 rounded ${isBalanced ? 'text-emerald-700' : hasMovement ? 'text-red-600' : 'text-gray-500'}`}>
                    Dr {formatIndianCurrency(rd)}
                  </span>
                  <span className="text-gray-300">=</span>
                  <span className={`font-mono font-bold px-2 py-1 rounded ${isBalanced ? 'text-emerald-700' : hasMovement ? 'text-red-600' : 'text-gray-500'}`}>
                    Cr {formatIndianCurrency(rc)}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-gray-100" />

            {/* Narration */}
            <div className="px-6 py-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Narration</label>
              <textarea
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="Being — describe this journal entry (e.g., Being rent paid for office premises for June 2026)"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 resize-none placeholder:text-gray-300 leading-relaxed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl shrink-0">
            <div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              {!error && isBalanced && (
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="h-2.5 w-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold">Balanced · {formatIndianCurrency(rd)}</span>
                </div>
              )}
              {!error && !isBalanced && hasMovement && (
                <p className="text-xs text-amber-600 font-medium">
                  Difference: <span className="font-mono">{formatIndianCurrency(Math.abs(rd - rc))}</span>
                  <span className="text-amber-400 ml-1">({rd > rc ? 'Dr excess' : 'Cr excess'})</span>
                </p>
              )}
              {!error && !hasMovement && <p className="text-[11px] text-gray-400">Enter amounts above to post</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClose} disabled={saving} className="h-8 px-4 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isBalanced}
                className="inline-flex items-center gap-2 h-8 px-5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : isEditMode ? 'Save Changes' : 'Post Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GST Details Popup (new 4-way intra/inter input/output system) ── */}
      {gstPopupOpen && gstMeta.mode && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4" onClick={handleGstPopupDismiss}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {gstMeta.mode === 'intra_input' && 'Intra-State GST · Purchase (ITC)'}
                  {gstMeta.mode === 'intra_output' && 'Intra-State GST · Sales'}
                  {gstMeta.mode === 'inter_input' && 'Inter-State IGST · Purchase (ITC)'}
                  {gstMeta.mode === 'inter_output' && 'Inter-State IGST · Sales'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {gstMeta.mode.includes('input') ? 'Dr lines will be inserted · GSTR-3B ITC registry' : 'Cr lines will be inserted · GSTR-1 / GSTR-3B registry'}
                </p>
              </div>
              <button onClick={handleGstPopupDismiss} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Party + Invoice fields */}
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {gstMeta.type === 'purchase' ? 'Supplier Name' : 'Customer Name'} *
                  </span>
                  <input value={gstMeta.partyName} onChange={e => handleGstChange('partyName', e.target.value)} className="h-8 w-full px-2.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Party name" />
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {gstMeta.type === 'purchase' ? 'Supplier GSTIN' : 'Customer GSTIN'}
                  </span>
                  <input value={gstMeta.gstin} onChange={e => handleGstinChange(e.target.value)} className="h-8 w-full px-2.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 uppercase font-mono" placeholder="GSTIN" maxLength={15} />
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Place of Supply *</span>
                  <select value={gstMeta.pos} onChange={e => handleGstChange('pos', e.target.value)} className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="">Select State</option>
                    {Object.entries(STATE_CODES).map(([code, name]) => (
                      <option key={code} value={code}>{code} — {name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {gstMeta.type === 'purchase' ? 'Supplier Invoice No.' : 'Invoice Number'}
                  </span>
                  <input value={gstMeta.invoiceNo} onChange={e => handleGstChange('invoiceNo', e.target.value)} className="h-8 w-full px-2.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="INV-001" />
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice Date</span>
                  <input type="date" value={gstMeta.invoiceDate} onChange={e => handleGstChange('invoiceDate', e.target.value)} className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Taxable Value</span>
                  <input type="number" value={gstMeta.taxableValue} onChange={e => handleGstChange('taxableValue', e.target.value)} className={`h-8 w-full px-2.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-right ${noSpinner}`} placeholder="0.00" min={0} />
                </label>

                <label>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GST Rate</span>
                  <select value={gstMeta.gstRate} onChange={e => handleGstChange('gstRate', e.target.value)} className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                    <option value="40">40%</option>
                  </select>
                </label>
              </div>

              {/* Auto-computed tax amounts (editable) */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">
                  Tax Lines
                  <span className="ml-1.5 font-normal text-blue-400 normal-case tracking-normal">(auto-computed · editable)</span>
                </p>

                {(gstMeta.mode === 'intra_input' || gstMeta.mode === 'intra_output') ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="block text-[10px] font-semibold text-gray-500 mb-1">
                        CGST ({parseFloat((Number(gstMeta.gstRate) / 2).toFixed(4)).toString()}%)
                      </span>
                      <input type="number" value={gstMeta.cgstAmt} onChange={e => handleGstChange('cgstAmt', e.target.value)} className={`h-8 w-full px-2.5 text-xs border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-right ${noSpinner}`} placeholder="0.00" min={0} />
                    </label>
                    <label>
                      <span className="block text-[10px] font-semibold text-gray-500 mb-1">
                        SGST/UTGST ({parseFloat((Number(gstMeta.gstRate) / 2).toFixed(4)).toString()}%)
                      </span>
                      <input type="number" value={gstMeta.sgstAmt} onChange={e => handleGstChange('sgstAmt', e.target.value)} className={`h-8 w-full px-2.5 text-xs border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-right ${noSpinner}`} placeholder="0.00" min={0} />
                    </label>
                  </div>
                ) : (
                  <label>
                    <span className="block text-[10px] font-semibold text-gray-500 mb-1">IGST ({gstMeta.gstRate}%)</span>
                    <input type="number" value={gstMeta.igstAmt} onChange={e => handleGstChange('igstAmt', e.target.value)} className={`h-8 w-full px-2.5 text-xs border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-right ${noSpinner}`} placeholder="0.00" min={0} />
                  </label>
                )}

                <p className="mt-2.5 text-[10px] text-gray-400">
                  {gstMeta.mode.includes('input')
                    ? '→ These will be inserted as Debit (Dr) lines in the journal entry'
                    : '→ These will be inserted as Credit (Cr) lines in the journal entry'}
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
              <button onClick={handleGstPopupSave} className="h-8 px-5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Save &amp; Insert Lines
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
