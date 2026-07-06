import { useState, useRef, useLayoutEffect, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCompany as createCompanyLocal, createInitialBookPeriod } from '@/lib/offlineDb';
import { initEntityData } from '@/entities/initEntity';
import { ENTITY_TYPES, type EntityType } from '@/lib/constants/entityTypes';
import { INDIAN_STATES } from '@/lib/constants/indianStates';
import { lookupCompanyByCIN } from '@/lib/mca';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const LOCKED_ENTITY_TYPES = new Set(['huf', 'trust', 'society', 'section8', 'aop_boi', 'cooperative']);

const BUSINESS_NATURES = [
  'Trading','Manufacturing','Service','Professional',
  'Commission Agent','Contractor','Transport','Real Estate',
  'Agriculture','Education','Healthcare','IT/Software',
];

type WizardData = {
  entity_type: string;
  name: string; pan: string; address: string; city: string;
  state: string; pincode: string; phone: string; email: string;
  partners: { name: string; capitalAmount: number; profitSharingRatio: number; salary: number }[];
  capitalMethod: 'fixed' | 'fluctuating';
  cin: string; authorizedCapital: number; paidUpCapital: number; faceValuePerShare: number;
  kartaName: string; registrationNumber: string;
  tan: string; aadhaar: string; dob: string; tradeName: string; llpin: string; dateOfIncorporation: string;
  business_nature: string[]; accounting_method: 'mercantile' | 'cash';
  financial_year_start: string;
  gst_status: 'unregistered' | 'regular' | 'composition'; gstin: string;
  tds_applicable: boolean; tcs_applicable: boolean;
  inventory_enabled: boolean; valuation_method: 'fifo' | 'weighted_average';
};

const defaultData: WizardData = {
  entity_type: '', name: '', pan: '', address: '', city: '', state: '', pincode: '', phone: '', email: '',
  partners: [{ name: '', capitalAmount: 0, profitSharingRatio: 50, salary: 0 }, { name: '', capitalAmount: 0, profitSharingRatio: 50, salary: 0 }],
  capitalMethod: 'fluctuating', cin: '', authorizedCapital: 0, paidUpCapital: 0, faceValuePerShare: 10,
  kartaName: '', registrationNumber: '', business_nature: [], accounting_method: 'mercantile',
  tan: '', aadhaar: '', dob: '', tradeName: '', llpin: '', dateOfIncorporation: '',
  financial_year_start: 'april', gst_status: 'unregistered', gstin: '',
  tds_applicable: false, tcs_applicable: false, inventory_enabled: false, valuation_method: 'weighted_average',
};

// ─── Shared field components ──────────────────────────────────────────────────
const Field = ({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-[10.5px] mt-1.5 font-medium flex items-center gap-1"><LucideIcons.AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

const inp = "w-full h-11 px-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 shadow-sm shadow-slate-100/50";

// Controlled text input that PRESERVES the caret position even when the value is
// transformed on every keystroke (e.g. UPPERCASE, digit-stripping). Without this,
// React re-assigns input.value after the transform and the caret jumps to the end,
// so editing in the middle of a PAN/CIN/GSTIN was impossible.
type TextInputProps = {
  value: string;
  onValueChange: (v: string) => void;
  transform?: (raw: string) => string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

const TextInput = ({ value, onValueChange, transform, ...rest }: TextInputProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const caretPos = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caretPos.current !== null && ref.current) {
      const pos = caretPos.current;
      try { ref.current.setSelectionRange(pos, pos); } catch { /* input type without selection support */ }
      caretPos.current = null;
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const rawCaret = el.selectionStart ?? raw.length;
    const next = transform ? transform(raw) : raw;
    // New caret = length of the transformed text that precedes the original caret.
    caretPos.current = transform ? transform(raw.slice(0, rawCaret)).length : rawCaret;
    onValueChange(next);
  };

  return <input ref={ref} value={value} onChange={handleChange} {...rest} />;
};

const toUpper = (s: string) => s.toUpperCase();
const digitsOnly = (s: string) => s.replace(/\D/g, '');

const cardCls = "page-card relative p-7 sm:p-8";

export default function CreateCompanyPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<WizardData>(defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lockedClicked, setLockedClicked] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [mcaFetching, setMcaFetching] = useState(false);
  const lastCin = useRef('');

  const upd = (f: Partial<WizardData>) => {
    setData(p => ({ ...p, ...f }));
    const keys = Object.keys(f);
    if (keys.length > 0) {
      setErrors(p => {
        const copy = { ...p };
        keys.forEach(k => delete copy[k]);
        return copy;
      });
    }
  };

  const isPartnership = data.entity_type === 'partnership' || data.entity_type === 'llp';
  const isCompany = ['opc','pvt_ltd','public_ltd','section8'].includes(data.entity_type);
  const isHUF = data.entity_type === 'huf';
  const isTrust = ['trust','society'].includes(data.entity_type);
  const isIndividual = data.entity_type === 'individual';
  const isProprietorship = data.entity_type === 'sole_proprietorship';

  // ─── Step definitions (built dynamically per entity type) ───────────────────
  const steps: { key: string; title: string; desc: string }[] = [
    { key: 'entity', title: 'Entity Type', desc: 'Choose the legal structure of the business.' },
    { key: 'details', title: 'Registration Details', desc: 'Identity, registration & location.' },
    ...(!isIndividual ? [{ key: 'business', title: 'Business & Accounting', desc: 'Activities and recognition method.' }] : []),
    { key: 'tax', title: 'Tax Configuration', desc: 'GST, TDS and TCS setup.' },
    ...(!isIndividual ? [{ key: 'inventory', title: 'Inventory Settings', desc: 'Stock tracking configuration.' }] : []),
  ];
  const currentKey = steps[step]?.key ?? 'entity';
  const isLastStep = step === steps.length - 1;

  const dateLabel = isIndividual ? 'Date of Birth'
    : isProprietorship ? 'Date of Commencement'
    : isPartnership ? 'Deed Date'
    : isTrust ? 'Registration Date'
    : 'Date of Incorporation';
  const dateErr = isIndividual ? errors.dob : errors.dateOfIncorporation;

  const focusFirstError = (errs: Record<string, string>) => {
    setTimeout(() => {
      const firstErrorKey = Object.keys(errs)[0];
      const element = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
    }, 100);
  };

  // ─── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (key: string): boolean => {
    const errs: Record<string, string> = {};

    if (key === 'entity') {
      if (!data.entity_type) {
        toast.error('Please select an Entity Type first.');
        setErrors({ entity_type: 'Required' });
        return false;
      }
      return true;
    }

    if (key === 'details') {
      if (!data.name.trim()) errs.name = 'Name is required';

      // PAN — mandatory + format
      if (!data.pan) {
        errs.pan = 'PAN is mandatory';
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan)) {
        errs.pan = 'Invalid PAN format';
      } else {
        const char4 = data.pan[3];
        if (isIndividual && char4 !== 'P') errs.pan = "Individual PAN 4th letter must be 'P'";
        if (isCompany && char4 !== 'C') errs.pan = "Company PAN 4th letter must be 'C'";
        if (isPartnership && char4 !== 'F') errs.pan = "Firm PAN 4th letter must be 'F'";
        if (isTrust && char4 !== 'T') errs.pan = "Trust PAN 4th letter must be 'T'";
      }

      // Date — mandatory
      if (isIndividual) {
        if (!data.dob) errs.dob = 'Date of birth is required';
      } else if (!data.dateOfIncorporation) {
        errs.dateOfIncorporation = `${dateLabel} is required`;
      }

      // Optional-but-validated fields
      if (data.tan && !/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(data.tan)) errs.tan = 'Invalid TAN format';
      if (isIndividual && data.aadhaar && !/^\d{12}$/.test(data.aadhaar)) errs.aadhaar = 'Must be 12 digits';
      if (isCompany && data.cin && data.cin.length !== 21) errs.cin = 'CIN must be 21 characters';
    }

    if (key === 'business') {
      if (!isIndividual && data.business_nature.length === 0) errs.business_nature = 'Select at least one business nature';
    }

    if (key === 'tax') {
      if (data.gst_status !== 'unregistered') {
        if (!data.gstin) errs.gstin = 'GSTIN required';
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin)) errs.gstin = 'Invalid GSTIN format';
        else if (data.pan && data.gstin.substring(2, 12) !== data.pan) errs.gstin = 'GSTIN does not match PAN';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please correct the highlighted fields.');
      focusFirstError(errs);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(currentKey)) return;
    setStep(s => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goToStep = (i: number) => {
    if (i <= step) { setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  // ─── Silent MCA auto-fill from CIN (no button / no result card) ─────────────
  const autoFillFromCIN = async (cinRaw: string) => {
    const cin = cinRaw.trim().toUpperCase();
    if (cin.length !== 21 || cin === lastCin.current) return;
    lastCin.current = cin;
    setMcaFetching(true);
    try {
      const info = await lookupCompanyByCIN(cin);
      if (!info) return;
      const patch: Partial<WizardData> = {};
      if (info.name) patch.name = info.name;
      if (info.email) patch.email = info.email;
      if (info.dateOfIncorporation) patch.dateOfIncorporation = info.dateOfIncorporation;
      if (info.address) patch.address = info.address;
      if (info.city) patch.city = info.city;
      if (info.pincode) patch.pincode = info.pincode;
      if (info.state) {
        const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === info.state!.toLowerCase());
        if (matched) patch.state = matched.name;
      }
      if (Object.keys(patch).length) upd(patch);
    } catch {
      /* silent — the user can still type details manually */
    } finally {
      setMcaFetching(false);
    }
  };

  const handleSave = async () => {
    // Validate every step before launching
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(steps[i].key)) { setStep(i); return; }
    }
    setSaving(true);
    try {
      const entityDetails: Record<string, unknown> = {
        pan: data.pan, address: data.address, city: data.city,
        state: data.state, pincode: data.pincode, phone: data.phone, email: data.email,
        tan: data.tan || undefined,
        tradeName: data.tradeName || undefined,
        dateOfIncorporation: data.dateOfIncorporation || undefined,
      };
      if (isIndividual) {
        entityDetails.aadhaar = data.aadhaar;
        entityDetails.dob = data.dob;
      }
      if (isPartnership) { entityDetails.partners = data.partners.filter(p => p.name); entityDetails.capitalMethod = data.capitalMethod; entityDetails.llpin = data.llpin; }
      if (isCompany) { entityDetails.cin = data.cin; entityDetails.shareCapital = { authorizedCapital: data.authorizedCapital, paidUpCapital: data.paidUpCapital, faceValuePerShare: data.faceValuePerShare, totalShares: data.paidUpCapital / (data.faceValuePerShare || 10), issuedCapital: data.paidUpCapital, subscribedCapital: data.paidUpCapital }; }
      if (isHUF) entityDetails.kartaName = data.kartaName;
      if (isTrust) entityDetails.registrationNumber = data.registrationNumber;
      const gstDetails: Record<string, unknown> = {};
      if (data.gst_status !== 'unregistered') { gstDetails.gstin = data.gstin; gstDetails.gstScheme = data.gst_status; }

      const company = createCompanyLocal({
        name: data.name, entity_type: data.entity_type as EntityType,
        entity_details: entityDetails as any, business_nature: data.business_nature,
        inventory_enabled: isIndividual ? false : data.inventory_enabled,
        inventory_config: { valuationMethod: data.valuation_method, pettyCashThreshold: 5000 },
        gst_status: data.gst_status, gst_details: gstDetails as any,
        tds_applicable: data.tds_applicable, tcs_applicable: data.tcs_applicable,
        accounting_method: isIndividual ? 'cash' : data.accounting_method, financial_year_start: data.financial_year_start,
      });
      createInitialBookPeriod(company.id);
      initEntityData(company);
      toast.success('Company created successfully!');
      navigate(`/company/${company.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create company');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(60rem_40rem_at_50%_-10%,_theme(colors.blue.50)_0%,_transparent_60%)]">
      <main className="max-w-3xl mx-auto px-6 py-8 sm:py-10">

        {/* ─── Hero header ──────────────────────────────────────────────────── */}
        <section className="hero relative px-6 sm:px-9 py-8 sm:py-9 mb-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full border border-white/5" />
          <div className="relative flex items-start gap-4">
            <Link to="/companies" className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="icon-badge shrink-0">
              <LucideIcons.Building2 className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="hero-muted text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5">New Workspace</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Create New <span className="hero-accent">Company</span>
              </h1>
              <p className="hero-muted text-sm font-medium mt-2">Step {step + 1} of {steps.length} · {steps[step]?.title}</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm shrink-0">
              <LucideIcons.ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Secure &amp; Local
            </span>
          </div>
          {/* Slim progress bar */}
          <div className="relative mt-7 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[#5B9BFF] transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </section>

        {/* ─── Stepper ─────────────────────────────────────────────────────── */}
        <nav className="mb-8 overflow-x-auto">
          <ol className="flex items-center min-w-max px-1">
            {steps.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <Fragment key={s.key}>
                  <li>
                    <button type="button" onClick={() => goToStep(i)} disabled={i > step}
                      className={`group flex items-center gap-2.5 ${i > step ? 'cursor-default' : 'cursor-pointer'}`}>
                      <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                        ${active ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                          : done ? 'bg-blue-50 border-blue-200 text-blue-600'
                          : 'bg-white border-slate-200 text-slate-400'}`}>
                        {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`hidden sm:block text-xs font-bold whitespace-nowrap transition-colors
                        ${active ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>{s.title}</span>
                    </button>
                  </li>
                  {i < steps.length - 1 && (
                    <li className="flex-1 mx-2 sm:mx-3 min-w-[20px]">
                      <div className={`h-0.5 rounded-full transition-colors duration-500 ${i < step ? 'bg-blue-300' : 'bg-slate-200'}`} />
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ol>
        </nav>

        {/* ─── Step card ───────────────────────────────────────────────────── */}
        <div className={`${cardCls} animate-in fade-in slide-in-from-bottom-2 duration-400`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />

          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
            <div className="icon-badge text-sm font-extrabold">
              {String(step + 1).padStart(2, '0')}
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {currentKey === 'entity' && 'Select Entity Type'}
                {currentKey === 'details' && 'Company & Registration Details'}
                {currentKey === 'business' && 'Business Nature & Accounting'}
                {currentKey === 'tax' && 'Tax Configuration'}
                {currentKey === 'inventory' && 'Inventory Settings'}
              </h2>
              <p className="text-xs text-slate-500">{steps[step]?.desc}</p>
            </div>
          </div>

          {/* ── STEP: Entity Type ── */}
          {currentKey === 'entity' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(ENTITY_TYPES).map(([key, config]) => {
                  const Icon = (LucideIcons as any)[config.icon] || LucideIcons.Building2;
                  const active = data.entity_type === key;
                  const isLocked = LOCKED_ENTITY_TYPES.has(key);
                  if (isLocked) {
                    return (
                      <button key={key} type="button"
                        onClick={() => setLockedClicked(lockedClicked === key ? null : key)}
                        className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-left transition-all relative group">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <LucideIcons.Lock className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <Icon className="h-6 w-6 mb-3 text-slate-300" strokeWidth={1.5} />
                        <p className="font-bold text-sm text-slate-400">{config.shortLabel}</p>
                        <p className="text-[11px] font-medium text-slate-300 mt-1 uppercase tracking-wider">{config.itrForm}</p>
                      </button>
                    );
                  }
                  return (
                    <button key={key} onClick={() => { upd({ entity_type: key }); setLockedClicked(null); }}
                      className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group
                        ${active
                          ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 shadow-md shadow-blue-500/10 -translate-y-0.5'
                          : 'border-gray-200 hover:border-blue-200 bg-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50'}`}>
                      {active && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -z-10" />}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${active ? 'bg-blue-600 text-white shadow-inner shadow-black/10' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                        <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                      </div>
                      <p className={`font-bold text-sm transition-colors ${active ? 'text-blue-900' : 'text-slate-700'}`}>{config.shortLabel}</p>
                      <p className={`text-[11px] font-medium mt-1 uppercase tracking-wider transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>{config.itrForm}</p>
                      {active && <p className="text-xs text-blue-700 mt-2 font-medium leading-snug animate-in fade-in slide-in-from-left-1 duration-300">{config.label}</p>}
                    </button>
                  );
                })}
              </div>
              {lockedClicked && (
                <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                  <LucideIcons.Unlock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span><strong>{ENTITY_TYPES[lockedClicked as EntityType]?.label}</strong> — will unlock with the trial version.</span>
                </div>
              )}
            </>
          )}

          {/* ── STEP: Registration Details ── */}
          {currentKey === 'details' && (
            <>
              {/* Corporate Identification Number — silently auto-fills the details below */}
              {isCompany && (
                <div className="mb-5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Corporate Identification Number (CIN)</label>
                  <div className="relative">
                    <TextInput
                      name="cin"
                      className={`${inp} font-mono uppercase tracking-wide pr-10 ${errors.cin ? 'border-red-500 focus:ring-red-500' : ''}`}
                      value={data.cin}
                      onValueChange={v => { upd({ cin: v }); if (v.length === 21) autoFillFromCIN(v); else lastCin.current = ''; }}
                      transform={toUpper}
                      placeholder="U12345KA2024PTC123456"
                      maxLength={21}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {mcaFetching
                        ? <div className="h-4 w-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        : data.cin.length === 21 && !errors.cin
                          ? <LucideIcons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : null}
                    </div>
                  </div>
                  {errors.cin
                    ? <p className="text-red-500 text-[10.5px] mt-1.5 font-medium flex items-center gap-1"><LucideIcons.AlertCircle className="w-3 h-3" />{errors.cin}</p>
                    : <p className="text-[10.5px] text-slate-400 mt-1.5 font-medium flex items-center gap-1"><LucideIcons.Sparkles className="w-3 h-3 text-blue-400" />Entity name, incorporation date, email &amp; address fill in automatically from the CIN.</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={isIndividual ? "Full Name *" : (isProprietorship ? "Proprietor Name *" : "Entity Name *")} error={errors.name} span2>
                  <input name="name" className={`${inp} ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`} value={data.name} onChange={e => upd({ name: e.target.value })} placeholder="Enter Name" />
                </Field>
                {isProprietorship && (
                  <Field label="Trade/Business Name" span2>
                    <input className={inp} value={data.tradeName} onChange={e => upd({ tradeName: e.target.value })} placeholder="e.g. Sharma Traders" />
                  </Field>
                )}

                <Field label="PAN *" error={errors.pan}>
                  <TextInput name="pan" className={`${inp} ${errors.pan ? 'border-red-500 focus:ring-red-500' : ''} font-mono uppercase`} value={data.pan} onValueChange={v => upd({ pan: v })} transform={toUpper} placeholder="ABCDE1234F" maxLength={10} />
                </Field>

                {/* Date — mandatory for all entity types */}
                <Field label={`${dateLabel} *`} error={dateErr}>
                  <input
                    name={isIndividual ? 'dob' : 'dateOfIncorporation'}
                    type="date"
                    className={`${inp} ${dateErr ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={isIndividual ? data.dob : data.dateOfIncorporation}
                    onChange={e => upd(isIndividual ? { dob: e.target.value } : { dateOfIncorporation: e.target.value })}
                  />
                </Field>

                {isIndividual && (
                  <Field label="Aadhaar" error={errors.aadhaar}>
                    <TextInput name="aadhaar" className={`${inp} ${errors.aadhaar ? 'border-red-500' : ''} font-mono`} value={data.aadhaar} onValueChange={v => upd({ aadhaar: v })} transform={digitsOnly} placeholder="123456789012" maxLength={12} />
                  </Field>
                )}

                {!isIndividual && (
                  <Field label="TAN" error={errors.tan}>
                    <TextInput name="tan" className={`${inp} font-mono uppercase ${errors.tan ? 'border-red-500' : ''}`} value={data.tan} onValueChange={v => upd({ tan: v })} transform={toUpper} placeholder="ABCD12345E" maxLength={10} />
                  </Field>
                )}

                {data.entity_type === 'llp' && (
                  <Field label="LLPIN" error={errors.llpin}>
                    <TextInput name="llpin" className={`${inp} font-mono uppercase`} value={data.llpin} onValueChange={v => upd({ llpin: v })} transform={toUpper} placeholder="AAA-1234" />
                  </Field>
                )}

                <Field label="Email">
                  <input className={inp} type="email" value={data.email} onChange={e => upd({ email: e.target.value })} placeholder="contact@example.com" />
                </Field>
                <Field label="Phone">
                  <input className={inp} value={data.phone} onChange={e => upd({ phone: e.target.value })} placeholder="9876543210" />
                </Field>
                <Field label="Address" span2>
                  <input className={inp} value={data.address} onChange={e => upd({ address: e.target.value })} placeholder="Street Address" />
                </Field>
                <Field label="State">
                  <select className={inp} value={data.state} onChange={e => upd({ state: e.target.value })}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s: any) => <option key={s.code ?? s} value={s.name ?? s}>{s.name ?? s}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <input className={inp} value={data.city} onChange={e => upd({ city: e.target.value })} placeholder="City" />
                </Field>
                <Field label="Pincode">
                  <TextInput className={`${inp} font-mono`} value={data.pincode} onValueChange={v => upd({ pincode: v })} transform={digitsOnly} placeholder="560001" maxLength={6} />
                </Field>
              </div>

              {/* Partnership partners */}
              {isPartnership && (
                <div className="border border-slate-200 rounded-2xl p-5 mt-6 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Partners Details</h3>
                    <button onClick={() => upd({ partners: [...data.partners, { name:'', capitalAmount:0, profitSharingRatio:0, salary:0 }] })}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                      <Plus className="h-3.5 w-3.5 text-slate-500" /> Add Partner
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-1.5">
                    {['Name','Capital (₹)','PSR (%)','Salary PA'].map(h => (
                      <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{h}</span>
                    ))}
                  </div>
                  {data.partners.map((p, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                      <input className={inp} value={p.name} onChange={e => { const ps=[...data.partners]; ps[i]={...ps[i],name:e.target.value}; upd({partners:ps}); }} placeholder={`Partner ${i+1}`} />
                      <input className={`${inp} font-mono`} type="number" value={p.capitalAmount||''} onChange={e => { const ps=[...data.partners]; ps[i]={...ps[i],capitalAmount:+e.target.value}; upd({partners:ps}); }} placeholder="0" />
                      <input className={`${inp} font-mono`} type="number" value={p.profitSharingRatio||''} onChange={e => { const ps=[...data.partners]; ps[i]={...ps[i],profitSharingRatio:+e.target.value}; upd({partners:ps}); }} placeholder="0" />
                      <div className="flex gap-1">
                        <input className={`${inp} font-mono flex-1`} type="number" value={p.salary||''} onChange={e => { const ps=[...data.partners]; ps[i]={...ps[i],salary:+e.target.value}; upd({partners:ps}); }} placeholder="0" />
                        {data.partners.length > 2 && (
                          <button onClick={() => upd({ partners: data.partners.filter((_,j) => j!==i) })} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200/60">
                    <span className="text-xs font-bold text-slate-500">Capital Method:</span>
                    {(['fixed','fluctuating'] as const).map(m => (
                      <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600" checked={data.capitalMethod===m} onChange={() => upd({ capitalMethod:m })} />
                        <span className="text-xs font-bold capitalize text-slate-700">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* HUF */}
              {isHUF && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <Field label="Karta Name">
                    <input className={inp} value={data.kartaName} onChange={e => upd({ kartaName:e.target.value })} placeholder="Karta Name" />
                  </Field>
                </div>
              )}

              {/* Trust/Society */}
              {isTrust && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <Field label="Registration Number">
                    <input className={inp} value={data.registrationNumber} onChange={e => upd({ registrationNumber:e.target.value })} placeholder="Registration Number" />
                  </Field>
                </div>
              )}
            </>
          )}

          {/* ── STEP: Business Nature & Accounting ── */}
          {currentKey === 'business' && (
            <>
              <div className="mb-8" id="business_nature">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Nature of Business *</label>
                {errors.business_nature && (
                  <p className="text-red-500 text-[10.5px] mb-3 font-medium flex items-center gap-1">
                    <LucideIcons.AlertCircle className="w-3 h-3" /> {errors.business_nature}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BUSINESS_NATURES.map(n => {
                    const active = data.business_nature.includes(n);
                    return (
                      <button key={n} onClick={() => upd({ business_nature: active ? data.business_nature.filter(x=>x!==n) : [...data.business_nature,n] })}
                        className={`p-3 rounded-xl border-2 text-left transition-all duration-300 relative overflow-hidden group
                          ${active
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm shadow-blue-500/10 -translate-y-0.5'
                            : 'border-slate-200 hover:border-blue-300 bg-white hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-200/50'}`}>
                        {active && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 rounded-bl-full -z-10" />}
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full transition-colors ${active ? 'bg-blue-600' : 'bg-slate-200 group-hover:bg-blue-400'}`} />
                          <span className={`text-[12px] font-bold transition-colors ${active ? 'text-blue-900' : 'text-slate-600 group-hover:text-slate-800'}`}>{n}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Accounting Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ['mercantile','Mercantile (Accrual)','Income & expenses recorded when earned/incurred', LucideIcons.BookOpenCheck],
                    ['cash','Cash Basis','Recorded when cash is received or paid', LucideIcons.Banknote],
                  ].map(([v, l, d, Icon]) => {
                    const active = data.accounting_method === v;
                    const I = Icon as any;
                    return (
                      <label key={v as string} className={`p-5 rounded-2xl border-2 cursor-pointer text-left transition-all duration-300 relative overflow-hidden group flex flex-col
                        ${active
                          ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-500/10 -translate-y-0.5'
                          : 'border-slate-200 hover:border-blue-300 bg-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50'}`}>
                        <input type="radio" className="sr-only" checked={active} onChange={() => upd({ accounting_method: v as any })} />
                        {active && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -z-10" />}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${active ? 'bg-blue-600 text-white shadow-inner shadow-black/10' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                          <I className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                        </div>
                        <span className={`text-sm font-bold transition-colors ${active ? 'text-blue-900' : 'text-slate-700'}`}>{l as string}</span>
                        <span className={`text-[11px] font-medium mt-1 transition-colors ${active ? 'text-blue-600' : 'text-slate-500'}`}>{d as string}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── STEP: Tax Configuration ── */}
          {currentKey === 'tax' && (
            <>
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">GST Status</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    ['unregistered','Unregistered'],
                    ['regular','Regular'],
                    ['composition','Composition'],
                  ].map(([v,l]) => (
                    <label key={v} className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${data.gst_status===v ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10 -translate-y-0.5' : 'border-slate-200 hover:border-blue-300 bg-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50'}`}>
                      <input type="radio" className="sr-only" checked={data.gst_status===v} onChange={() => upd({ gst_status:v as any })} />
                      <div className={`w-4 h-4 rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-colors ${data.gst_status===v ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`}>
                        {data.gst_status===v && <div className="w-2 h-2 rounded-full bg-blue-600 animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${data.gst_status===v ? 'text-blue-900' : 'text-slate-700'}`}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {data.gst_status !== 'unregistered' && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Field label="GSTIN *" error={errors.gstin}>
                    <TextInput name="gstin" className={`${inp} font-mono uppercase ${errors.gstin ? 'border-red-500 focus:ring-red-500' : ''}`} value={data.gstin} onValueChange={v => upd({ gstin: v })} transform={toUpper} placeholder="29AAAAA0000A1Z5" maxLength={15} />
                  </Field>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Withholding & Surcharges</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    ['tds_applicable','TDS Applicable','Tax deducted at source'],
                    ['tcs_applicable','TCS Applicable','Tax collected at source'],
                  ].map(([k,l,d]) => (
                    <label key={k} className={`flex-1 flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${data[k as keyof WizardData] ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10 -translate-y-0.5' : 'border-slate-200 hover:border-blue-300 bg-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50'}`}>
                      <input type="checkbox" className="mt-0.5 w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 transition-colors" checked={!!data[k as keyof WizardData]} onChange={e => upd({ [k]:e.target.checked } as any)} />
                      <div>
                        <p className={`text-sm font-bold transition-colors ${data[k as keyof WizardData] ? 'text-blue-900' : 'text-slate-800'}`}>{l}</p>
                        <p className={`text-[11px] font-medium mt-1 transition-colors ${data[k as keyof WizardData] ? 'text-blue-600' : 'text-slate-500'}`}>{d}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP: Inventory Settings ── */}
          {currentKey === 'inventory' && (
            <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${data.inventory_enabled
                ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-500/10'
                : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-md hover:shadow-slate-200/50'}`}>
              <input type="checkbox" className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 transition-colors" checked={data.inventory_enabled} onChange={e => upd({ inventory_enabled: e.target.checked })} />
              {data.inventory_enabled && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -z-10" />}
              <div className="flex-1">
                <p className={`text-sm font-bold transition-colors ${data.inventory_enabled ? 'text-blue-900' : 'text-slate-800'}`}>Enable Inventory Tracking</p>
                <p className={`text-[11px] font-medium mt-1 transition-colors ${data.inventory_enabled ? 'text-blue-600' : 'text-slate-500'}`}>Purchase & sales entries will automatically update stock levels</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${data.inventory_enabled ? 'bg-blue-600 text-white shadow-inner shadow-black/10' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                <LucideIcons.Package className="h-5 w-5" strokeWidth={data.inventory_enabled ? 2 : 1.5} />
              </div>
            </label>
          )}

          {/* ── Review summary (only on the final step) ── */}
          {isLastStep && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <LucideIcons.ClipboardCheck className="h-4 w-4 text-slate-400" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Review Summary</h3>
              </div>
              <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-inner shadow-white">
                {[
                  ['Entity Type', ENTITY_TYPES[data.entity_type as EntityType]?.label ?? '—'],
                  ['Name', data.name || '—'],
                  ...(isProprietorship ? [['Trade Name', data.tradeName || '—']] : []),
                  ['PAN', data.pan || '—'],
                  ...(isCompany && data.cin ? [['CIN', data.cin]] : []),
                  ...(isIndividual ? [['Aadhaar', data.aadhaar || '—']] : []),
                  ...(!isIndividual && data.tan ? [['TAN', data.tan]] : []),
                  [dateLabel, (isIndividual ? data.dob : data.dateOfIncorporation) || '—'],
                  ['State', data.state || '—'],
                  ['Financial Year', data.financial_year_start === 'april' ? 'Apr–Mar' : data.financial_year_start === 'july' ? 'Jul–Jun' : 'Jan–Dec'],
                  ...(!isIndividual ? [['Business Nature', data.business_nature.join(', ') || '—']] : []),
                  ['Accounting', data.accounting_method === 'mercantile' ? 'Mercantile (Accrual)' : 'Cash Basis'],
                  ['GST Status', `${data.gst_status}${data.gstin ? ` — ${data.gstin}` : ''}`],
                  ['TDS', data.tds_applicable ? 'Applicable' : 'Not applicable'],
                  ['TCS', data.tcs_applicable ? 'Applicable' : 'Not applicable'],
                  ...(!isIndividual ? [['Inventory', data.inventory_enabled ? 'Enabled' : 'Disabled']] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <span className="text-slate-500 font-medium">{label}</span>
                    <span className="font-bold text-slate-900 text-right ml-4 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer navigation ── */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
            {step > 0 ? (
              <button onClick={goBack}
                className="btn-pill-outline h-11 px-6 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : <span />}

            {!isLastStep ? (
              <button onClick={goNext} disabled={currentKey === 'entity' && !data.entity_type}
                className="btn-pill-primary h-11 px-8 disabled:opacity-50 disabled:cursor-not-allowed">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="btn-pill-primary h-11 px-8 disabled:opacity-60 disabled:cursor-not-allowed">
                {saving
                  ? <><div className="h-5 w-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                  : <><LucideIcons.Rocket className="h-4 w-4" /> Launch Company</>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
