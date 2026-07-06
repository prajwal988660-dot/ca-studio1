'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import type { Gstr3bFormState, Gstr3bTaxRow } from '@/lib/accounting/gstr3bJson';
import { downloadGstr3bJsonFile, round2 } from '@/lib/accounting/gstr3bJson';
import { GST_HELP_DOWNLOADS_URL, GST_PORTAL_RETURNS_URL, GSTR3B_EXCEL_UTILITY_FILENAME, gstr3bUtilityPublicHref } from '@/lib/constants/gstr3bUtility';

function parseAmt(s: string): number {
  const v = s.replace(/,/g, '').trim();
  if (v === '' || v === '-') return 0;
  const n = parseFloat(v);
  return round2(Number.isFinite(n) ? n : 0);
}

function Cell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className="w-full min-w-[76px] border-0 bg-white px-1.5 py-1.5 text-right font-mono text-[13px] text-gray-900 outline-none focus:bg-amber-50/80 focus:ring-1 focus:ring-inset focus:ring-emerald-700/40 disabled:bg-gray-100 disabled:text-gray-500"
      value={Number.isFinite(value) ? String(value) : '0'}
      onChange={(e) => onChange(parseAmt(e.target.value))}
    />
  );
}

function Row5({
  label,
  sub,
  row,
  onPatch,
  disabled,
}: {
  label: string;
  sub?: string;
  row: Gstr3bTaxRow;
  onPatch: (p: Partial<Gstr3bTaxRow>) => void;
  disabled?: boolean;
}) {
  return (
    <tr className="border-b border-[#c5d9c5] hover:bg-white/90">
      <td className="border-r border-[#c5d9c5] px-2 py-1.5 align-top">
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {sub ? <p className="text-[11px] text-gray-600 leading-snug">{sub}</p> : null}
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={row.txval} disabled={disabled} onChange={(txval) => onPatch({ txval })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={row.iamt} disabled={disabled} onChange={(iamt) => onPatch({ iamt })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={row.camt} disabled={disabled} onChange={(camt) => onPatch({ camt })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={row.samt} disabled={disabled} onChange={(samt) => onPatch({ samt })} />
      </td>
      <td>
        <Cell value={row.csamt} disabled={disabled} onChange={(csamt) => onPatch({ csamt })} />
      </td>
    </tr>
  );
}

function RowTxvalOnly({
  label,
  sub,
  txval,
  onTxval,
  disabled,
}: {
  label: string;
  sub?: string;
  txval: number;
  onTxval: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <tr className="border-b border-[#c5d9c5] hover:bg-white/90">
      <td className="border-r border-[#c5d9c5] px-2 py-1.5 align-top">
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {sub ? <p className="text-[11px] text-gray-600 leading-snug">{sub}</p> : null}
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={txval} disabled={disabled} onChange={onTxval} />
      </td>
      <td colSpan={4} className="bg-gray-50/80 px-2 py-2 text-center text-[11px] text-gray-500">
        Enter taxable value only for this row (portal field)
      </td>
    </tr>
  );
}

function Itc4({
  label,
  v,
  onPatch,
  disabled,
}: {
  label: string;
  v: Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>;
  onPatch: (p: Partial<Pick<Gstr3bTaxRow, 'iamt' | 'camt' | 'samt' | 'csamt'>>) => void;
  disabled?: boolean;
}) {
  return (
    <tr className="border-b border-[#c5d9c5] hover:bg-white/90">
      <td className="border-r border-[#c5d9c5] px-2 py-1.5">
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={v.iamt} disabled={disabled} onChange={(iamt) => onPatch({ iamt })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={v.camt} disabled={disabled} onChange={(camt) => onPatch({ camt })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={v.samt} disabled={disabled} onChange={(samt) => onPatch({ samt })} />
      </td>
      <td className="border-r border-[#c5d9c5]">
        <Cell value={v.csamt} disabled={disabled} onChange={(csamt) => onPatch({ csamt })} />
      </td>
    </tr>
  );
}

const MONTHS = [
  { v: 1, label: 'January' },
  { v: 2, label: 'February' },
  { v: 3, label: 'March' },
  { v: 4, label: 'April' },
  { v: 5, label: 'May' },
  { v: 6, label: 'June' },
  { v: 7, label: 'July' },
  { v: 8, label: 'August' },
  { v: 9, label: 'September' },
  { v: 10, label: 'October' },
  { v: 11, label: 'November' },
  { v: 12, label: 'December' },
];

export function Gstr3bUtilityPanel({
  companyName,
  gstin,
  month,
  year,
  onMonthYearChange,
  form,
  setForm,
  loadingBooks,
  onLoadFromBooks,
  caConfirmed,
  onCaConfirmedChange,
}: {
  companyName: string;
  gstin: string;
  month: number;
  year: number;
  onMonthYearChange: (m: number, y: number) => void;
  form: Gstr3bFormState;
  setForm: Dispatch<SetStateAction<Gstr3bFormState>>;
  loadingBooks: boolean;
  onLoadFromBooks: () => void;
  caConfirmed: boolean;
  onCaConfirmedChange: (v: boolean) => void;
}) {
  const patchSup = useCallback(
    (key: keyof Gstr3bFormState['sup_details'], partial: Partial<Gstr3bTaxRow> | { txval: number }) => {
      setForm((prev) => {
        if (key === 'osup_nil_exmp' || key === 'osup_nongst') {
          const txval = 'txval' in partial && typeof partial.txval === 'number' ? partial.txval : (prev.sup_details[key] as { txval: number }).txval;
          return {
            ...prev,
            sup_details: { ...prev.sup_details, [key]: { txval } },
          };
        }
        const cur = prev.sup_details[key] as Gstr3bTaxRow;
        return {
          ...prev,
          sup_details: { ...prev.sup_details, [key]: { ...cur, ...partial } },
        };
      });
    },
    [setForm]
  );

  const retPeriod = `${String(month).padStart(2, '0')}${year}`;
  const utilityHref = gstr3bUtilityPublicHref();

  const handleGenerate = () => {
    const g = gstin.trim();
    if (!g || g.length !== 15) return;
    downloadGstr3bJsonFile(g, retPeriod, form);
  };

  const gstinOk = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim());

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-950">
        <p className="font-medium">In-portal utility (not Excel)</p>
        <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90">
          Browsers cannot run VBA macros. This screen mirrors the GSTR-3B summary blocks so you can type or load from books, then confirm and download JSON.
          Always validate the file on the GST portal or sandbox before filing.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Company</p>
          <p className="text-sm font-semibold text-gray-900">{companyName}</p>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Return month</label>
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-900"
            value={month}
            onChange={(e) => onMonthYearChange(Number(e.target.value), year)}
          >
            {MONTHS.map((m) => (
              <option key={m.v} value={m.v}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Year</label>
          <input
            type="number"
            className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono font-medium text-gray-900"
            value={year}
            min={2017}
            max={2100}
            onChange={(e) => onMonthYearChange(month, Number(e.target.value) || year)}
          />
        </div>
        <div className="text-xs text-gray-500">
          Period code <span className="font-mono font-semibold text-gray-800">{retPeriod}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-[#217346] shadow-sm">
        <div className="flex items-center justify-between gap-2 bg-[#217346] px-3 py-2 text-white">
          <span className="text-sm font-bold tracking-tight">GSTR-3B — Portal (summary)</span>
          <span className="text-[11px] font-semibold opacity-90">Editable grid</span>
        </div>
        <table className="w-full min-w-[720px] border-collapse bg-[#f6fff6] text-sm">
          <thead>
            <tr className="bg-[#e6f4e6] text-xs font-bold uppercase tracking-wide text-gray-800">
              <th className="border border-[#c5d9c5] px-2 py-2 text-left">Particulars</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">Taxable value</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">IGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">CGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">SGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">Cess</th>
            </tr>
          </thead>
          <tbody>
            <Row5
              label="3.1 (a) Outward taxable supplies"
              sub="Other than zero, nil, exempted"
              row={form.sup_details.osup_det}
              onPatch={(p) => patchSup('osup_det', p)}
            />
            <Row5
              label="3.1 (b) Outward zero-rated"
              sub="Export / SEZ with payment"
              row={form.sup_details.osup_zero}
              onPatch={(p) => patchSup('osup_zero', p)}
            />
            <RowTxvalOnly
              label="3.1 (c) Nil rated / exempt"
              txval={form.sup_details.osup_nil_exmp.txval}
              onTxval={(txval) => patchSup('osup_nil_exmp', { txval })}
            />
            <Row5
              label="3.1 (d) Inward reverse charge"
              sub="Liable to reverse charge"
              row={form.sup_details.isup_rev}
              onPatch={(p) => patchSup('isup_rev', p)}
            />
            <RowTxvalOnly
              label="3.1 (e) Non-GST supply"
              txval={form.sup_details.osup_nongst.txval}
              onTxval={(txval) => patchSup('osup_nongst', { txval })}
            />
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-[#217346] shadow-sm">
        <div className="bg-[#217346] px-3 py-2 text-sm font-bold text-white">Section 4 — Eligible ITC (₹)</div>
        <table className="w-full min-w-[640px] border-collapse bg-[#f6fff6] text-sm">
          <thead>
            <tr className="bg-[#e6f4e6] text-xs font-bold uppercase tracking-wide text-gray-800">
              <th className="border border-[#c5d9c5] px-2 py-2 text-left">Description</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">IGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">CGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">SGST</th>
              <th className="border border-[#c5d9c5] px-2 py-2 text-right">Cess</th>
            </tr>
          </thead>
          <tbody>
            <Itc4
              label="ITC available (mapped as OTH in JSON — typical domestic books)"
              v={form.itc_avl_oth}
              onPatch={(p) => setForm((prev) => ({ ...prev, itc_avl_oth: { ...prev.itc_avl_oth, ...p } }))}
            />
            <Itc4
              label="ITC reversed — Rule 42 / 43 (RUL)"
              v={form.itc_rev_rul}
              onPatch={(p) => setForm((prev) => ({ ...prev, itc_rev_rul: { ...prev.itc_rev_rul, ...p } }))}
            />
            <Itc4
              label="ITC reversed — Other (OTH)"
              v={form.itc_rev_oth}
              onPatch={(p) => setForm((prev) => ({ ...prev, itc_rev_oth: { ...prev.itc_rev_oth, ...p } }))}
            />
            <Itc4
              label="Ineligible ITC (RUL)"
              v={form.itc_inelg_rul}
              onPatch={(p) => setForm((prev) => ({ ...prev, itc_inelg_rul: { ...prev.itc_inelg_rul, ...p } }))}
            />
            <Itc4
              label="Ineligible ITC (OTH)"
              v={form.itc_inelg_oth}
              onPatch={(p) => setForm((prev) => ({ ...prev, itc_inelg_oth: { ...prev.itc_inelg_oth, ...p } }))}
            />
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onLoadFromBooks}
          disabled={loadingBooks}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingBooks ? 'Loading books…' : 'Load figures from books'}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-400"
            checked={caConfirmed}
            onChange={(e) => onCaConfirmedChange(e.target.checked)}
          />
          CA confirms figures for this return period
        </label>
        <button
          type="button"
          disabled={!caConfirmed || !gstinOk}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          Generate &amp; download JSON
        </button>
        {!gstinOk ? (
          <span className="text-xs text-red-600">Set a valid 15-character GSTIN in company setup to enable JSON.</span>
        ) : null}
      </div>

      <details className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-900">Alternate: CBIC Excel utility (.xlsm)</summary>
        <p className="mt-2 text-[13px] leading-relaxed">
          If you prefer the official macro workbook, you can still download it and use it instead.{' '}
          <a href={utilityHref} download={GSTR3B_EXCEL_UTILITY_FILENAME} className="font-semibold text-blue-700 hover:underline">
            {GSTR3B_EXCEL_UTILITY_FILENAME}
          </a>
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href={GST_PORTAL_RETURNS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            GST portal
          </a>
          <a
            href={GST_HELP_DOWNLOADS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            GST tutorial
          </a>
        </div>
      </details>
    </div>
  );
}
