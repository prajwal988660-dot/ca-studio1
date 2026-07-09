'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType, Company } from '@/types/company';
import { getEntityData, upsertEntityData } from '@/lib/offlineDb';
import {
  Calculator, FileText, CheckCircle, Shield, Lock, LockKeyhole,
  UploadCloud, Save,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   ITR filing module — A.Y. 2026-27 (Financial Year 2025-26)

   The ITR-1 / ITR-2 / ITR-3 / ITR-4 forms are self-contained data-entry tools
   (each embeds its own tax computation + AIS import) served from
   /public/tax-utilities/. Because they are same-origin iframes we integrate the
   company/backend data by driving the iframe DOM directly on load:
     1. restore any previously-saved ITR field state (entity_data → Supabase mirror)
     2. prefill empty assessee-master fields from the company record
     3. debounced autosave of every field back into entity_data (auto-synced)
   ──────────────────────────────────────────────────────────────────────────── */

const AY_NEW = '2026-27';
const FY_NEW = '2025-26';
/** entity_data module key under which each form's field snapshot is stored. */
const ITR_MODULE = 'itr_ay2627';

type ItrKey = 'itr1' | 'itr2' | 'itr3' | 'itr4';

const ITR_META: Record<ItrKey, { label: string; short: string; src: string; note: string }> = {
  itr1: { label: 'ITR-1 Sahaj', short: 'ITR-1', src: '/tax-utilities/itr1.html', note: 'Salary, one house property & other sources (income ≤ ₹50L)' },
  itr2: { label: 'ITR-2', short: 'ITR-2', src: '/tax-utilities/itr2.html', note: 'Capital gains, multiple properties & foreign assets — no business income' },
  itr3: { label: 'ITR-3', short: 'ITR-3', src: '/tax-utilities/itr3.html', note: 'Income from business or profession (regular books)' },
  itr4: { label: 'ITR-4 Sugam', short: 'ITR-4', src: '/tax-utilities/itr4.html', note: 'Presumptive business/profession u/s 44AD / 44ADA / 44AE' },
};

/** Applicable ITR forms per entity type for A.Y. 2026-27. */
const ENTITY_FORMS: Partial<Record<EntityType, ItrKey[]>> = {
  individual: ['itr1', 'itr2'],
  sole_proprietorship: ['itr3', 'itr4'],
  // A HUF may also file ITR-4 (Sugam) when opting for presumptive income u/s 44AD/44ADA/44AE.
  huf: ['itr2', 'itr3', 'itr4'],
};

/** Company entity types keep the existing ITR-6 experience (unchanged). */
const COMPANY_ENTITY_TYPES = ['pvt_ltd', 'bulk_pvt_ltd', 'opc', 'public_ltd'];

/** Locked-screen label for entity types whose forms aren't shipped yet. */
const ENTITY_ITR_MAP: Record<string, string> = {
  partnership: 'ITR-5',
  llp: 'ITR-5',
  aop_boi: 'ITR-5',
  cooperative: 'ITR-5',
  trust: 'ITR-7',
  society: 'ITR-7',
  section8: 'ITR-6 / ITR-7',
};

/* ── DOM bridge helpers (run against the same-origin iframe window) ──────────── */

/** Normalise a stored date (ISO / dd-mm-yyyy / dd/mm/yyyy) to DD/MM/YYYY.
 *  Returns undefined for unrecognised formats so we never feed the form's
 *  DD/MM/YYYY date fields a value it would garble. */
function toDDMMYYYY(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);      // already DD/MM/YYYY
  if (m) return s;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);             // ISO YYYY-MM-DD[...]
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);            // DD-MM-YYYY
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return undefined;
}

function fireInputChange(win: Window, el: Element) {
  const EventCtor = (win as unknown as { Event: typeof Event }).Event;
  el.dispatchEvent(new EventCtor('input', { bubbles: true }));
  el.dispatchEvent(new EventCtor('change', { bubbles: true }));
}

function setIfEmpty(win: Window, id: string, val?: string | null) {
  if (val == null || val === '') return;
  const el = win.document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (!el) return;

  // <select> defaults to its first option (a truthy value like "Individual"), so the
  // plain "already has a value" guard would never let us switch it. Treat a select that
  // is still on its first option as unset, and only apply a value that is a real option.
  if (el instanceof (win as unknown as { HTMLSelectElement: typeof HTMLSelectElement }).HTMLSelectElement) {
    const sel = el as HTMLSelectElement;
    if (sel.value !== (sel.options[0]?.value ?? '')) return; // user/restore already chose
    const opt = Array.from(sel.options).find((o) => o.value === val || o.text === val);
    if (!opt) return;
    sel.value = opt.value;
    fireInputChange(win, sel);
    return;
  }

  if ((el as HTMLInputElement).value) return; // never clobber existing/restored data
  (el as HTMLInputElement).value = String(val);
  fireInputChange(win, el);
}

/** Prefill assessee-master fields from the company record (only where empty). */
function prefillFromCompany(win: Window, company: Company) {
  const ed = company.entity_details || {};
  const isHuf = company.entity_type === 'huf';
  const pan = (ed.pan || '').toUpperCase();
  const status = isHuf ? 'HUF' : 'Individual';
  const dob = toDDMMYYYY(ed.dob);

  // Universal client fields (present in every form incl. ITR-4 Sugam)
  setIfEmpty(win, 'cl_name', company.name);
  setIfEmpty(win, 'cl_pan', pan);
  setIfEmpty(win, 'cl_dob', dob);
  setIfEmpty(win, 'cl_status', status);

  // Full assessee master (ITR-1 / ITR-2 / ITR-3)
  setIfEmpty(win, 'asr_name', company.name);
  setIfEmpty(win, 'asr_pan', pan);
  setIfEmpty(win, 'asr_status', status);
  setIfEmpty(win, 'asr_dob', dob);
  setIfEmpty(win, 'asr_flat', ed.address);
  setIfEmpty(win, 'asr_city', ed.city);
  setIfEmpty(win, 'asr_state', ed.state);
  setIfEmpty(win, 'asr_pin', ed.pincode);
  setIfEmpty(win, 'asr_mobile', ed.phone);
  setIfEmpty(win, 'asr_email', ed.email);
  setIfEmpty(win, 'asr_aadhaar', ed.aadhaar);

  // Verifier — Karta signs for a HUF
  setIfEmpty(win, 'vfr_name', isHuf ? (ed.kartaName || company.name) : company.name);
  setIfEmpty(win, 'vfr_pan', pan);
}

const SKIP_TYPES = new Set(['button', 'submit', 'file', 'reset', 'image']);

/** Snapshot every identifiable, editable field in the form. */
function collectFields(doc: Document): Record<string, string> {
  const out: Record<string, string> = {};
  doc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea')
    .forEach((el) => {
      const inp = el as HTMLInputElement;
      if (!el.id || inp.readOnly || inp.disabled || SKIP_TYPES.has(inp.type)) return;
      if (inp.type === 'checkbox' || inp.type === 'radio') out[el.id] = inp.checked ? '1' : '0';
      else out[el.id] = el.value;
    });
  return out;
}

/** Re-apply a saved snapshot to the form (overwrites, firing input/change). */
function applyFields(win: Window, fields: Record<string, string>) {
  const doc = win.document;
  const EventCtor = (win as unknown as { Event: typeof Event }).Event;
  for (const [id, val] of Object.entries(fields)) {
    const el = doc.getElementById(id) as HTMLInputElement | null;
    if (!el || el.readOnly || el.disabled) continue;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = val === '1';
    else el.value = val;
    el.dispatchEvent(new EventCtor('input', { bubbles: true }));
    el.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   New A.Y. 2026-27 view — individual, sole proprietor, HUF
   ═══════════════════════════════════════════════════════════════════════════ */

function IndividualItrView({ company, forms }: { company: Company; forms: ItrKey[] }) {
  const companyId = company.id;
  const [active, setActive] = useState<ItrKey>(forms[0]);
  // Lazy-mount iframes: only load a form once its tab is first opened.
  const [mounted, setMounted] = useState<Set<ItrKey>>(() => new Set([forms[0]]));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const winRefs = useRef<Partial<Record<ItrKey, Window>>>({});
  const timers = useRef<Partial<Record<ItrKey, number>>>({});
  const mountedRef = useRef(true);

  const openForm = (key: ItrKey) => {
    setActive(key);
    setMounted((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  const saveForm = useCallback((key: ItrKey) => {
    const win = winRefs.current[key];
    if (!win) return;
    try {
      const current = collectFields(win.document);
      // Merge over the previous snapshot: dynamically-added rows (extra bank accounts,
      // capital-gains rows, …) may not exist in the DOM at this moment, so a plain
      // overwrite would silently erase them from storage and the Supabase mirror. Merging
      // keeps any previously-captured keys that aren't currently present.
      const prev = (getEntityData(companyId, ITR_MODULE, key)?.data as { fields?: Record<string, string> } | undefined)?.fields;
      const fields = prev ? { ...prev, ...current } : current;
      upsertEntityData(companyId, ITR_MODULE, key, { fields, savedAt: new Date().toISOString(), ay: AY_NEW });
      if (mountedRef.current) setSavedAt(new Date());
    } catch { /* ignore */ }
  }, [companyId]);

  const onFrameLoad = useCallback((key: ItrKey, el: HTMLIFrameElement) => {
    let win: Window | null = null;
    try { win = el.contentWindow; } catch { return; }
    if (!win) return;
    winRefs.current[key] = win;

    // 1) restore saved snapshot, 2) prefill empty fields from company master
    try {
      const rec = getEntityData(companyId, ITR_MODULE, key);
      const saved = rec?.data as { fields?: Record<string, string> } | undefined;
      if (saved?.fields) applyFields(win, saved.fields);
    } catch { /* ignore */ }
    try { prefillFromCompany(win, company); } catch { /* ignore */ }

    // 3) debounced autosave on any edit. The timer entry is deleted once it fires so
    //    `timers.current` only ever holds genuinely-pending saves.
    try {
      const handler = () => {
        window.clearTimeout(timers.current[key]);
        timers.current[key] = window.setTimeout(() => {
          delete timers.current[key];
          saveForm(key);
        }, 1500);
      };
      win.document.addEventListener('input', handler, true);
      win.document.addEventListener('change', handler, true);
    } catch { /* ignore */ }
  }, [company, companyId, saveForm]);

  // Flush only genuinely-pending autosaves on unmount (keys still holding a live timer).
  useEffect(() => {
    mountedRef.current = true; // reset on (re)mount — StrictMode runs setup twice
    const t = timers.current;
    const refs = winRefs.current;
    return () => {
      mountedRef.current = false;
      for (const key of Object.keys(t) as ItrKey[]) {
        if (t[key] == null) continue;
        window.clearTimeout(t[key]);
        delete t[key];
        if (refs[key]) saveForm(key);
      }
    };
  }, [saveForm]);

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label ?? company.entity_type;

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Income Tax</span>
          <span className="text-xs text-gray-400 truncate">
            · A.Y. {AY_NEW} · FY {FY_NEW} · {entityLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedAt && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-green-600">
              <CheckCircle className="h-3 w-3" /> Saved {savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => saveForm(active)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            title="Save this return now (also synced to your account)"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Form switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex gap-1 overflow-x-auto">
          {forms.map((key) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => openForm(key)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                {ITR_META[key].label}
              </button>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            A.Y. {AY_NEW}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <UploadCloud className="h-3 w-3" /> AIS import inside form
          </span>
        </div>
      </div>

      {/* Applicability note for the active form */}
      <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-1 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-600">{ITR_META[active].short}</span> — {ITR_META[active].note}
      </div>

      {/* Iframes */}
      <div className="relative flex-1 overflow-hidden bg-gray-50">
        {forms.filter((k) => mounted.has(k)).map((key) => (
          <iframe
            key={key}
            src={ITR_META[key].src}
            onLoad={(e) => onFrameLoad(key, e.currentTarget)}
            className={`absolute inset-0 h-full w-full border-none ${
              active === key ? 'z-10' : 'pointer-events-none z-0 opacity-0'
            }`}
            title={ITR_META[key].label}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Company view — ITR-6 (ported unchanged from the previous module)
   ═══════════════════════════════════════════════════════════════════════════ */

function CompanyItr6View({ company }: { company: Company }) {
  const [activeTab, setActiveTab] = useState<'calc' | 'itr'>('itr');
  const [taxPayload, setTaxPayload] = useState<Record<string, number> | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const itr6Ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    const key = `ca_itr6_notice_${company.id}`;
    if (!localStorage.getItem(key)) setShowLetter(true);
  }, [company?.id]);

  // Company-data bridge for the ITR-6 iframe to auto-fill.
  useEffect(() => {
    const bridge = {
      companyName: company.name,
      pan: company.entity_details?.pan || '',
      gstin: company.gst_details?.gstin || '',
      address: company.entity_details?.address || '',
      fy: '2024-25',
      ay: '2025-26',
    };
    localStorage.setItem('ca_tax_bridge', JSON.stringify(bridge));
  }, [company]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'TAX_DATA_UPDATED') setTaxPayload(event.data.payload);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!taxPayload || activeTab !== 'itr') return;
    itr6Ref.current?.contentWindow?.postMessage({ type: 'HYDRATE_ITR', payload: taxPayload }, '*');
  }, [activeTab, taxPayload]);

  const dismissLetter = () => {
    if (company?.id) localStorage.setItem(`ca_itr6_notice_${company.id}`, '1');
    setShowLetter(false);
  };

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">
      {showLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                  Income Tax &amp; ITR Filing Module
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">Important Notice</h2>
              <p className="text-sm text-blue-200 mt-0.5">
                Assessment Year 2025-26 &nbsp;·&nbsp; ITR-6 &nbsp;·&nbsp; Private Limited Company
              </p>
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-8 py-6 space-y-4 text-sm text-gray-700 leading-relaxed">
              <p className="font-medium text-gray-900 text-base">Dear Sir / Madam,</p>
              <p>
                We extend our warmest greetings and welcome you to the{' '}
                <strong>Income Tax &amp; ITR Filing</strong> module. This module is currently in its{' '}
                <strong>final stages of deployment</strong>, and our development team is diligently working
                towards the timely integration of all applicable ITR forms.
              </p>
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
                  Zero Manual Data Entry — Fully Automated
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-green-900">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    <span>
                      <strong>Your company data is imported automatically</strong> — details, financial
                      statements, P&amp;L, balance sheet and TDS records flow directly into the ITR form.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-green-900">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    <span>
                      <strong>Our AI will handle the manual work</strong> — intelligently filling, reviewing
                      and validating every schedule of your ITR form.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 flex gap-3">
                <Shield className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-1">
                    Your Data Security &amp; Privacy
                  </p>
                  <p className="text-gray-600">
                    All financial data is encoded using <strong>128-bit encryption</strong> and stored
                    exclusively on your device and account. Your records remain private and under your control.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                128-bit encrypted &nbsp;·&nbsp; Stored locally &nbsp;·&nbsp; Fully private
              </div>
              <button
                onClick={dismissLetter}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                I Understand, Proceed →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Income Tax</span>
          <span className="text-xs text-gray-400">· AY 2025-26 · ITR-6 · {ENTITY_TYPES[company.entity_type as EntityType]?.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">AY 2025-26</span>
          <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">ITR-6</span>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => setActiveTab('calc')}
          className={`flex items-center gap-1.5 border-b-2 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'calc' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" /> IT Calculator
        </button>
        <button
          onClick={() => setActiveTab('itr')}
          className={`flex items-center gap-1.5 border-b-2 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'itr' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> ITR-6 Form
        </button>
      </div>

      {taxPayload && (
        <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
            <CheckCircle className="h-3 w-3" /> Tax data synced
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-gray-500">Total Income: <b className="font-mono text-gray-900">₹{(taxPayload.totalIncome || 0).toLocaleString('en-IN')}</b></span>
            <span className="text-gray-500">Tax Payable: <b className="font-mono text-red-600">₹{(taxPayload.taxPayable || 0).toLocaleString('en-IN')}</b></span>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden bg-gray-50">
        <iframe
          src="/tax-utilities/it-calculator.html"
          className={`absolute inset-0 h-full w-full border-none ${activeTab === 'calc' ? 'z-10' : 'pointer-events-none z-0 opacity-0'}`}
          title="IT Calculator"
        />
        <iframe
          ref={itr6Ref}
          src="/tax-utilities/itr6.html"
          className={`absolute inset-0 h-full w-full border-none ${activeTab === 'itr' ? 'z-10' : 'pointer-events-none z-0 opacity-0'}`}
          title="ITR-6"
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Locked "coming soon" view — entity types whose forms aren't shipped yet
   ═══════════════════════════════════════════════════════════════════════════ */

function LockedItrView({ entityLabel, applicableItr }: { entityLabel: string; applicableItr: string }) {
  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">
      <div className="border-b border-gray-100 bg-white px-4 py-2 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-800">Income Tax Returns</span>
        <span className="text-xs text-gray-400">· {entityLabel}</span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200">
            <LockKeyhole className="h-9 w-9 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{applicableItr} — Coming Soon</h2>
          <p className="text-sm text-gray-500 mb-6">Applicable for <strong>{entityLabel}</strong></p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-left space-y-3 mb-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              The Income Tax &amp; ITR filing module for <strong>{entityLabel}</strong> ({applicableItr}) is
              currently under development and will be available in an upcoming release.
            </p>
            <ul className="space-y-2">
              {[
                `${applicableItr} filing with full schedule support`,
                'Auto-import from your financial statements and company records',
                'AI-assisted form filling — zero manual entry required',
                'Real-time validation before submission',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>128-bit encrypted · Stored locally · Only accessible by you</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Router — pick the right view for the company's entity type
   ═══════════════════════════════════════════════════════════════════════════ */

export default function IncomeTaxDashboard() {
  const { company, loading } = useCompany();

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const entityType = company.entity_type as EntityType;

  // 1) Companies → ITR-6 (unchanged)
  if (COMPANY_ENTITY_TYPES.includes(company.entity_type)) {
    return <CompanyItr6View company={company} />;
  }

  // 2) Individual / Sole proprietor / HUF → new A.Y. 2026-27 forms
  const forms = ENTITY_FORMS[entityType];
  if (forms && forms.length > 0) {
    return <IndividualItrView key={company.id} company={company} forms={forms} />;
  }

  // 3) Everything else → locked "coming soon"
  const entityLabel = ENTITY_TYPES[entityType]?.label || entityType;
  const applicableItr = ENTITY_ITR_MAP[entityType] || 'ITR-5 / ITR-7';
  return <LockedItrView entityLabel={entityLabel} applicableItr={applicableItr} />;
}
