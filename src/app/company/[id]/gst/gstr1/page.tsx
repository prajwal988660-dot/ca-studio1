'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { getOrCreateFiling, saveFiling } from '@/lib/gstr1/gstr1Db';
import { autoFillFromInvoices } from '@/lib/gstr1/autoFillFromInvoices';
import { listInvoicesV2, deleteInvoiceV2, updateInvoiceV2 } from '@/lib/accounting/gstInvoices';
import type { InvoiceV2, DocType } from '@/lib/accounting/gstInvoices';
import { validateFiling } from '@/lib/gstr1/gstr1Validate';
import { generateGstr1Json } from '@/lib/gstr1/gstr1Json';
import { STATE_CODES, UQC_OPTIONS } from '@/lib/gstr1/config';
import type {
  GSTR1Filing, B2BInvoice, B2CLInvoice, B2CSSummary, EXPInvoice,
  CDNRNote, CDNURNote, NilSummary, ATAdvance, HSNSummary,
} from '@/lib/gstr1/types';
import type { ValidationError } from '@/lib/gstr1/gstr1Validate';

// ── Period helpers ────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function currentPeriod() {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
}
function periodLabel(p: string) {
  return `${MONTH_NAMES[parseInt(p.slice(0,2),10)-1]} ${p.slice(2)}`;
}
function prevPeriod(p: string) {
  const d = new Date(parseInt(p.slice(2),10), parseInt(p.slice(0,2),10)-2, 1);
  return `${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
}
function nextPeriod(p: string) {
  const d = new Date(parseInt(p.slice(2),10), parseInt(p.slice(0,2),10), 1);
  return `${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
}
function periodToRange(p: string) {
  const mm = parseInt(p.slice(0,2),10), yyyy = parseInt(p.slice(2),10);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { fromDate: fmt(new Date(yyyy,mm-1,1)), toDate: fmt(new Date(yyyy,mm,0)) };
}

// ── Common constants ──────────────────────────────────────────────────────────

const STATE_OPTS = Object.entries(STATE_CODES).map(([v,l]) => ({ value: v, label: `${v} – ${l}` }));
const RATE_OPTS = ['0','0.1','0.25','1','1.5','3','5','6','7.5','12','18','28','40'].map(r => ({ value: r, label: `${r}%` }));
const INV_TYPE_OPTS = [
  { value:'R', label:'R – Regular' },
  { value:'SEWP', label:'SEWP – SEZ with payment' },
  { value:'SEWOP', label:'SEWOP – SEZ without payment' },
  { value:'DE', label:'DE – Deemed Export' },
];

// ── Tiny UI primitives ────────────────────────────────────────────────────────

function Th({ ch, right }: { ch?: string; right?: boolean }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 ${right?'text-right':'text-left'}`}>
      {ch}
    </th>
  );
}
function Td({ children, mono, right, dim }: { children: React.ReactNode; mono?: boolean; right?: boolean; dim?: boolean }) {
  return (
    <td className={`px-3 py-1.5 text-sm border-b border-gray-100 ${mono?'font-mono text-[12px] tabular-nums':''} ${right?'text-right':''} ${dim?'text-gray-400':''}`}>
      {children}
    </td>
  );
}
function F({ label, children, className='' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder, className='' }: { value: string|number; onChange:(v:string)=>void; placeholder?:string; className?:string }) {
  return <input className={`border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-400 ${className}`} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />;
}
function Sel({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-400" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function RCMPill({ val, onClick, disabled }: { val:'Y'|'N'; onClick?:()=>void; disabled?:boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      title={val==='Y'?'Reverse Charge Mechanism: ON — click to turn off':'Reverse Charge Mechanism: OFF — click to turn on'}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${val==='Y'?'bg-orange-100 text-orange-700 border-orange-300':'bg-gray-100 text-gray-400 border-gray-200'} ${disabled?'cursor-default':'cursor-pointer hover:opacity-80'}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${val==='Y'?'bg-orange-500':'bg-gray-300'}`}/>
      RCM {val==='Y'?'ON':'OFF'}
    </button>
  );
}
function RCMToggle({ val, onChange, label }: { val:'Y'|'N'; onChange:(v:'Y'|'N')=>void; label?:string }) {
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" onClick={()=>onChange(val==='Y'?'N':'Y')}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none ${val==='Y'?'bg-orange-500':'bg-gray-300'}`}>
        <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${val==='Y'?'translate-x-4':'translate-x-0.5'}`} />
      </button>
      <div>
        <span className={`text-xs font-semibold block ${val==='Y'?'text-orange-700':'text-gray-500'}`}>{label??'Reverse Charge (RCM)'}: {val==='Y'?'Yes (ON)':'No (OFF)'}</span>
        <span className="text-[10px] text-gray-400">{val==='Y'?'Buyer pays GST directly to govt':'Supplier pays GST normally'}</span>
      </div>
    </div>
  );
}
// Divider between main section and amendments
function AmendDivider({ section, tableNum }: { section:string; tableNum:string }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-3">
      <div className="flex-1 h-px bg-amber-200" />
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
        <AmendBadge />
        <span className="text-xs font-bold text-amber-700">Amendments — {section} · Table {tableNum}</span>
      </div>
      <div className="flex-1 h-px bg-amber-200" />
    </div>
  );
}
function DelBtn({ onClick }: { onClick:()=>void }) {
  return <button type="button" onClick={onClick} className="text-red-400 hover:text-red-600 font-bold px-1 text-base leading-none">×</button>;
}
function BooksBadge() {
  return <span className="text-[9px] font-semibold text-blue-500 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase tracking-wide">books</span>;
}
function AmendBadge() {
  return <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 uppercase tracking-wide">amended</span>;
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ taxable, igst, cgst, sgst }: { taxable:number; igst:number; cgst:number; sgst:number }) {
  if (taxable === 0 && igst === 0 && cgst === 0 && sgst === 0) return null;
  const cards = [
    { label:'Taxable Value', val:taxable, color:'blue' },
    { label:'IGST', val:igst, color:'purple' },
    { label:'CGST', val:cgst, color:'green' },
    { label:'SGST/UTGST', val:sgst, color:'teal' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      {cards.map(c => (
        <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{c.label}</p>
          <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">{formatIndianCurrency(c.val)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Add-row form container ────────────────────────────────────────────────────

function AddPanel({ onClose, children, isAmend }: { onClose:()=>void; children:React.ReactNode; isAmend?:boolean }) {
  return (
    <div className={`mt-3 border border-dashed rounded-xl p-4 ${isAmend?'border-amber-300 bg-amber-50/40':'border-blue-300 bg-blue-50/40'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold ${isAmend?'text-amber-700':'text-blue-700'}`}>{isAmend?'Amendment Entry':'New Entry'}</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 leading-none font-bold text-base">×</button>
      </div>
      {children}
    </div>
  );
}
function EditPanel({ onClose, children }: { onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="border border-dashed border-green-300 rounded-xl bg-green-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-green-700">Edit Entry</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 leading-none font-bold text-base">×</button>
      </div>
      {children}
    </div>
  );
}
function AddBtns({ onSave, onClear }: { onSave:()=>void; onClear:()=>void }) {
  return (
    <div className="flex gap-2 mt-3">
      <button type="button" onClick={onSave} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add</button>
      <button type="button" onClick={onClear} className="px-4 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">Clear</button>
    </div>
  );
}
function SaveCancelBtns({ onSave, onCancel }: { onSave:()=>void; onCancel:()=>void }) {
  return (
    <div className="flex gap-2 mt-3">
      <button type="button" onClick={onSave} className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">Save</button>
      <button type="button" onClick={onCancel} className="px-4 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
    </div>
  );
}

// ── DatePicker ─────────────────────────────────────────────────────────────────

function DatePicker({ value, onChange, period }: { value:string; onChange:(v:string)=>void; period?:string }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = value && value.length===10 ? (() => { const [dd,mm,yy]=value.split('-').map(Number); return {day:dd,month:mm-1,year:yy}; })() : null;
  const [calYear, setCalYear] = useState<number>(() => parsed?.year ?? (period?parseInt(period.slice(2)):today.getFullYear()));
  const [calMonth, setCalMonth] = useState<number>(() => parsed?.month ?? (period?parseInt(period.slice(0,2))-1:today.getMonth()));
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const pMM = period?.slice(0,2); const pYYYY = period?.slice(2);
  const isInPeriod = !period || !parsed ? true : String(parsed.month+1).padStart(2,'0')===pMM && String(parsed.year)===pYYYY;
  const selectDay = (day:number) => { onChange(`${String(day).padStart(2,'0')}-${String(calMonth+1).padStart(2,'0')}-${calYear}`); setOpen(false); };
  const prevCal = () => { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextCal = () => { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };
  return (
    <div className="relative">
      <div className={`flex items-center border rounded px-2 py-1 focus-within:border-blue-400 ${!isInPeriod?'border-amber-400 bg-amber-50/40':'border-gray-300'}`}>
        <input className="flex-1 outline-none bg-transparent text-sm min-w-0" value={value} onChange={e=>onChange(e.target.value)}
          placeholder="DD-MM-YYYY" onKeyDown={e=>{if(e.key==='Enter'){setOpen(false);(e.target as HTMLInputElement).blur();}}} />
        <button type="button" onMouseDown={e=>{e.preventDefault();setOpen(o=>!o);}} className="text-gray-400 hover:text-blue-500 px-0.5 shrink-0 text-sm">📅</button>
      </div>
      {!isInPeriod && <p className="text-[10px] text-amber-600 mt-0.5">⚠ Outside filing period</p>}
      {open && (
        <div className="absolute top-full left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-60 mt-1" onMouseDown={e=>e.preventDefault()}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevCal} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded font-bold">‹</button>
            <span className="text-xs font-bold text-gray-800">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button type="button" onClick={nextCal} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded font-bold">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} className="text-center text-[9px] font-semibold text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({length:firstDow}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=i+1;
              const ddmmyyyy=`${String(day).padStart(2,'0')}-${String(calMonth+1).padStart(2,'0')}-${calYear}`;
              const isSel=value===ddmmyyyy;
              const inPeriodMo=!period||(String(calMonth+1).padStart(2,'0')===pMM&&String(calYear)===pYYYY);
              return <button key={day} type="button" onClick={()=>selectDay(day)}
                className={`text-center text-xs py-1 rounded font-medium transition-colors ${isSel?'bg-blue-600 text-white':inPeriodMo?'hover:bg-blue-50 text-gray-700':'hover:bg-amber-50 text-amber-500'}`}>{day}</button>;
            })}
          </div>
          <div className="mt-2 pt-1.5 border-t border-gray-100 flex justify-between">
            <button type="button" onClick={()=>{setCalMonth(today.getMonth());setCalYear(today.getFullYear());}} className="text-[10px] text-blue-500 hover:text-blue-700">Today</button>
            <button type="button" onClick={()=>setOpen(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Period Picker Modal ────────────────────────────────────────────────────────

function PeriodPickerModal({ period, onSelect, onClose }: { period:string; onSelect:(p:string)=>void; onClose:()=>void }) {
  const today = new Date();
  const pMM = parseInt(period.slice(0,2)); const pYYYY = parseInt(period.slice(2));
  const [fy, setFY] = useState<number>(pMM>=4?pYYYY:pYYYY-1);
  const fyMonths = [
    {m:4,l:'Apr'},{m:5,l:'May'},{m:6,l:'Jun'},{m:7,l:'Jul'},{m:8,l:'Aug'},{m:9,l:'Sep'},
    {m:10,l:'Oct'},{m:11,l:'Nov'},{m:12,l:'Dec'},{m:1,l:'Jan'},{m:2,l:'Feb'},{m:3,l:'Mar'},
  ].map(({m,l})=>{ const y=m>=4?fy:fy+1; return {m,l,p:`${String(m).padStart(2,'0')}${y}`,y}; });
  const isFuture=(p:string)=>{ const y=parseInt(p.slice(2)),mm=parseInt(p.slice(0,2)); return y>today.getFullYear()||(y===today.getFullYear()&&mm>today.getMonth()+1); };
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-72" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={()=>setFY(f=>f-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg">‹</button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">FY {fy}–{String(fy+1).slice(2)}</p>
            <p className="text-[10px] text-gray-400">Apr {fy} – Mar {fy+1}</p>
          </div>
          <button type="button" onClick={()=>setFY(f=>f+1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg">›</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {fyMonths.map(({l,p,y})=>{
            const isActive=p===period; const fut=isFuture(p);
            return <button key={p} type="button" disabled={fut} onClick={()=>{if(!fut){onSelect(p);onClose();}}}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive?'bg-blue-600 text-white shadow-sm':fut?'text-gray-300 cursor-not-allowed':'hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-300'}`}>
              <div>{l}</div><div className="text-[9px] opacity-60">{y}</div>
            </button>;
          })}
        </div>
        <button type="button" onClick={onClose} className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 py-1">Close</button>
      </div>
    </div>
  );
}

// ── Tax auto-calculation helper ────────────────────────────────────────────────
function calcTax(txval:number, rt:number, isInter:boolean, isDiff:boolean, diffPct:number) {
  const eff = isDiff ? rt * diffPct / 100 : rt;
  if (isInter) return { iamt: Math.round(txval * eff / 100 * 100)/100, camt:undefined, samt:undefined };
  return { iamt:undefined, camt: Math.round(txval * eff / 200 * 100)/100, samt: Math.round(txval * eff / 200 * 100)/100 };
}

// ── B2B Section ───────────────────────────────────────────────────────────────

type B2BDraft = B2BInvoice;

function B2BSection({ autoRows, filing, onChange, period, companyStateCode, onDeleteAuto, onUpdateAuto, allInvoices }: {
  autoRows: B2BInvoice[];
  filing: GSTR1Filing;
  onChange: (f: GSTR1Filing) => void;
  period: string;
  companyStateCode: string;
  onDeleteAuto: (id: string) => void;
  onUpdateAuto: (id: string, draft: Partial<InvoiceV2>) => void;
  allInvoices: InvoiceV2[];
}) {
  const blank = (): B2BDraft => ({ id:uid(), ctin:'', inv_typ:'R', inum:'', idt:'', val:0, pos:'27', rchrg:'N', itms:[{num:1,itm_det:{rt:18,txval:0}}] });
  const blankAmend = (): B2BInvoice => ({ ...blank(), isAmended:true, origInvNum:'', origInvDt:'' });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<B2BDraft>(blank());
  const [isDiff, setIsDiff] = useState(false);
  const [diffPct, setDiffPct] = useState(65);
  const [addingAmend, setAddingAmend] = useState(false);
  const [draftAmend, setDraftAmend] = useState<B2BInvoice>(blankAmend());
  const [editId, setEditId] = useState<string|null>(null);
  const [editDraft, setEditDraft] = useState<B2BInvoice>(blank());
  const [editAutoId, setEditAutoId] = useState<string|null>(null);
  const [editAutoDraft, setEditAutoDraft] = useState<B2BInvoice>(blank());

  // Detect inter-state from GSTIN vs company
  const isInterFromGstin = (ctin:string) => ctin.length >= 2 && ctin.slice(0,2) !== companyStateCode;

  const allRows = [...autoRows, ...filing.b2b];
  const amendRows = filing.b2ba ?? [];
  const totalTxval = allRows.reduce((s,r)=>s+(r.itms[0]?.itm_det.txval??0),0);
  const totalIgst  = allRows.reduce((s,r)=>s+(r.itms[0]?.itm_det.iamt??0),0);
  const totalCgst  = allRows.reduce((s,r)=>s+(r.itms[0]?.itm_det.camt??0),0);
  const totalSgst  = allRows.reduce((s,r)=>s+(r.itms[0]?.itm_det.samt??0),0);

  const toggleRCMauto = (id:string) => { const cur=filing.rcm_overrides?.[id]??'N'; onChange({...filing,rcm_overrides:{...filing.rcm_overrides,[id]:cur==='N'?'Y':'N'}}); };
  const toggleRCMmanual = (id:string) => onChange({...filing,b2b:filing.b2b.map(r=>r.id===id?{...r,rchrg:r.rchrg==='N'?'Y':'N'}:r)});
  const del = (id:string) => onChange({...filing,b2b:filing.b2b.filter(r=>r.id!==id)});
  const delAmend = (id:string) => onChange({...filing,b2ba:(filing.b2ba??[]).filter(r=>r.id!==id)});
  const itm = (base:B2BInvoice, v:Partial<typeof base.itms[0]['itm_det']>) => [{num:1,itm_det:{...base.itms[0].itm_det,...v}}];

  // Auto-compute taxes for draft
  const applyAutoTax = (d:B2BDraft, txval:number, rt:number) => {
    const inter = isInterFromGstin(d.ctin);
    const t = calcTax(txval, rt, inter, isDiff, diffPct);
    return {...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,txval,...t}}]};
  };

  const startEdit = (row:B2BInvoice) => { setEditId(row.id); setEditDraft({...row}); };
  const saveEdit = () => { onChange({...filing,b2b:filing.b2b.map(r=>r.id===editId?editDraft:r)}); setEditId(null); };
  const saveAdd = () => { onChange({...filing,b2b:[...filing.b2b,draft]}); setDraft(blank()); setAdding(false); setIsDiff(false); };
  const startEditAuto = (row: B2BInvoice) => {
    const inv = allInvoices.find((x) => x.id === row.id);
    if (!inv) return;
    setEditAutoId(row.id);
    setEditAutoDraft({ ...row });
  };
  const saveEditAuto = () => {
    if (!editAutoId) return;
    // Convert DD-MM-YYYY back to YYYY-MM-DD for invoice storage
    const ddmmyyyy = editAutoDraft.idt;
    let invoice_date = '';
    if (ddmmyyyy && ddmmyyyy.length === 10) {
      const [dd,mm,yy] = ddmmyyyy.split('-');
      invoice_date = `${yy}-${mm}-${dd}`;
    }
    onUpdateAuto(editAutoId, {
      buyer_gstin: editAutoDraft.ctin || undefined,
      invoice_no: editAutoDraft.inum,
      invoice_date: invoice_date || undefined,
      place_of_supply: editAutoDraft.pos,
      reverse_charge: editAutoDraft.rchrg === 'Y',
    } as Partial<InvoiceV2>);
    setEditAutoId(null);
  };
  const saveAmend = () => { onChange({...filing,b2ba:[...amendRows,{...draftAmend,isAmended:true}]}); setDraftAmend(blankAmend()); setAddingAmend(false); };

  const B2BForm = ({ d, setD, isPeriodLocked, onSave, onClear, saveLabel }:{ d:B2BInvoice; setD:(v:B2BInvoice)=>void; isPeriodLocked:boolean; onSave:()=>void; onClear:()=>void; saveLabel:string }) => {
    const inter = isInterFromGstin(d.ctin);
    const rt = d.itms[0]?.itm_det.rt ?? 18;
    const txval = d.itms[0]?.itm_det.txval ?? 0;
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <F label="GSTIN of Recipient">
            <Inp value={d.ctin} onChange={v=>{ const ctin=v.toUpperCase(); const inter2=ctin.length>=2&&ctin.slice(0,2)!==companyStateCode; const pos=ctin.length>=2?ctin.slice(0,2):d.pos; const t=calcTax(txval,rt,inter2,isDiff,diffPct); setD({...d,ctin,pos,itms:[{num:1,itm_det:{...d.itms[0].itm_det,...t}}]}); }} placeholder="29AAAAA0000A1Z5" />
            {d.ctin.length>=2&&<p className={`text-[10px] mt-0.5 font-semibold ${inter?'text-purple-600':'text-green-600'}`}>{inter?'Inter-state → IGST':'Intra-state → CGST + SGST'}</p>}
          </F>
          <F label="Invoice No."><Inp value={d.inum} onChange={v=>setD({...d,inum:v})} placeholder="INV-001" /></F>
          <F label="Invoice Date"><DatePicker value={d.idt} onChange={v=>setD({...d,idt:v})} period={isPeriodLocked?period:undefined} /></F>
          <F label="Invoice Value (₹)"><Inp value={d.val||''} onChange={v=>setD({...d,val:parseFloat(v)||0})} className="text-right" /></F>
          <F label="Place of Supply">
            <Sel value={d.pos} onChange={v=>setD({...d,pos:v})} options={STATE_OPTS} />
            <p className="text-[9px] text-gray-400 mt-0.5">Auto-set from GSTIN; edit if needed</p>
          </F>
          <F label="Invoice Type"><Sel value={d.inv_typ} onChange={v=>setD({...d,inv_typ:v as B2BInvoice['inv_typ']})} options={INV_TYPE_OPTS} /></F>
          <F label="Tax Rate (%)">
            <Sel value={String(rt)} onChange={v=>{ const r=parseFloat(v); const t=calcTax(txval,r,inter,isDiff,diffPct); setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,rt:r,...t}}]}); }} options={RATE_OPTS} />
          </F>
          <F label="Taxable Value (₹)">
            <Inp value={txval||''} onChange={v=>{ const tv=parseFloat(v)||0; const t=calcTax(tv,rt,inter,isDiff,diffPct); setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,txval:tv,...t}}]}); }} className="text-right" />
          </F>
          {inter
            ? <F label="IGST (₹) — auto-calculated"><Inp value={d.itms[0]?.itm_det.iamt??''} onChange={v=>setD({...d,itms:itm(d,{iamt:parseFloat(v)||undefined})})} className="text-right bg-blue-50" /></F>
            : <>
                <F label="CGST (₹) — auto-calculated"><Inp value={d.itms[0]?.itm_det.camt??''} onChange={v=>setD({...d,itms:itm(d,{camt:parseFloat(v)||undefined})})} className="text-right bg-blue-50" /></F>
                <F label="SGST/UTGST (₹) — auto-calculated"><Inp value={d.itms[0]?.itm_det.samt??''} onChange={v=>setD({...d,itms:itm(d,{samt:parseFloat(v)||undefined})})} className="text-right bg-blue-50" /></F>
              </>
          }
          <F label="Cess (₹)"><Inp value={d.itms[0]?.itm_det.csamt||''} onChange={v=>setD({...d,itms:itm(d,{csamt:parseFloat(v)||undefined})})} placeholder="0" className="text-right" /></F>
        </div>
        {/* Differential rate */}
        <div className="mt-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <button type="button" onClick={()=>{ setIsDiff(v=>!v); const t=calcTax(txval,rt,inter,!isDiff,diffPct); setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,...t}}]}); }}
              className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${isDiff?'bg-indigo-500':'bg-gray-300'}`}>
              <span className={`inline-block w-3 h-3 rounded-full bg-white shadow transform transition-transform mt-0.5 ${isDiff?'translate-x-3':'translate-x-0.5'}`} />
            </button>
            <span className="text-[11px] text-gray-600 font-medium">Supply eligible for differential % of existing tax rate? (Govt. notified)</span>
          </div>
          {isDiff&&(
            <div className="mt-2 flex items-center gap-3">
              <F label="Applicable % of Tax Rate" className="w-40">
                <Inp value={diffPct} onChange={v=>{ const dp=parseFloat(v)||65; setDiffPct(dp); const t=calcTax(txval,rt,inter,true,dp); setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,...t}}]}); }} className="text-right" placeholder="65" />
              </F>
              <p className="text-[10px] text-indigo-600 mt-4">Effective rate = {rt}% × {diffPct}% = {Math.round(rt*diffPct)/100}%</p>
            </div>
          )}
        </div>
        {/* RCM */}
        <div className="mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
          <RCMToggle val={d.rchrg} onChange={v=>setD({...d,rchrg:v})} />
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onSave} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">{saveLabel}</button>
          <button type="button" onClick={onClear} className="px-4 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">Clear</button>
        </div>
      </>
    );
  };

  const B2BRow = ({ row, idx, isAuto }: { row:B2BInvoice; idx:number; isAuto:boolean }) => {
    const rcm = isAuto ? (filing.rcm_overrides?.[row.id]??'N') : row.rchrg;
    const inter = row.itms[0]?.itm_det.iamt != null && (row.itms[0]?.itm_det.iamt??0) > 0;
    return (
      <tr className={`border-b border-gray-100 ${isAuto?'bg-blue-50/30 hover:bg-blue-50/60':`hover:bg-gray-50 ${idx%2===1?'bg-gray-50/40':''}`}`}>
        <Td dim><span className="text-[10px] tabular-nums">{idx+1}</span></Td>
        <Td mono>
          <div className="flex items-center gap-1">{isAuto&&<BooksBadge />}<span className="text-[11px]">{row.ctin||'—'}</span></div>
          <div className={`text-[9px] font-semibold mt-0.5 ${inter?'text-purple-500':'text-green-500'}`}>{inter?'Inter-state':'Intra-state'}</div>
        </Td>
        <Td><span className="font-medium">{row.inum}</span></Td>
        <Td dim>{row.idt}</Td>
        <Td right mono>{formatIndianCurrency(row.val)}</Td>
        <Td dim><span className="text-[10px]">{STATE_CODES[row.pos]?.split(' ')[0]||row.pos}</span></Td>
        <Td dim><span className="text-[11px] bg-gray-100 px-1 rounded">{row.inv_typ}</span></Td>
        <Td dim>{row.itms[0]?.itm_det.rt}%</Td>
        <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.txval??0)}</Td>
        <Td right mono>{row.itms[0]?.itm_det.iamt?formatIndianCurrency(row.itms[0].itm_det.iamt):'—'}</Td>
        <Td right mono>{row.itms[0]?.itm_det.camt?formatIndianCurrency(row.itms[0].itm_det.camt):'—'}</Td>
        <Td right mono>{row.itms[0]?.itm_det.samt?formatIndianCurrency(row.itms[0].itm_det.samt):'—'}</Td>
        <Td right mono dim>{row.itms[0]?.itm_det.csamt?formatIndianCurrency(row.itms[0].itm_det.csamt):'—'}</Td>
        <Td>
          <div className="flex items-center gap-1">
            <RCMPill val={rcm} onClick={()=>isAuto?toggleRCMauto(row.id):toggleRCMmanual(row.id)} />
            {isAuto
              ? <>
                  <button type="button" onClick={()=>editAutoId===row.id?setEditAutoId(null):startEditAuto(row)} className="text-gray-400 hover:text-blue-600 px-1 text-[13px]" title="Edit invoice">✎</button>
                  <DelBtn onClick={()=>{ if(window.confirm('Delete this auto-imported invoice from the GST register? Journal entries are not affected.')) onDeleteAuto(row.id); }} />
                </>
              : <><button type="button" onClick={()=>startEdit(row)} className="text-gray-400 hover:text-blue-600 px-1 text-[13px]">✎</button><DelBtn onClick={()=>del(row.id)} /></>
            }
          </div>
        </Td>
      </tr>
    );
  };

  return (
    <div>
      <SummaryStrip taxable={totalTxval} igst={totalIgst} cgst={totalCgst} sgst={totalSgst} />
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="#" /><Th ch="GSTIN / State" /><Th ch="Invoice No." /><Th ch="Invoice Date" /><Th ch="Value" right /><Th ch="POS" /><Th ch="Type" /><Th ch="Rate" /><Th ch="Taxable" right /><Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST" right /><Th ch="Cess" right /><Th ch="RCM" />
          </tr></thead>
          <tbody>
            {autoRows.map((row,i) => (
              <React.Fragment key={row.id}>
                <B2BRow row={row} idx={i} isAuto={true} />
                {editAutoId===row.id && (
                  <tr className="bg-green-50 border-b border-green-200">
                    <td colSpan={14} className="p-3">
                      <EditPanel onClose={()=>setEditAutoId(null)}>
                        <p className="text-[10px] text-gray-400 mb-2">Editing GST-level fields only. Journal entries are not affected.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          <F label="GSTIN of Recipient"><Inp value={editAutoDraft.ctin} onChange={v=>setEditAutoDraft({...editAutoDraft,ctin:v.toUpperCase()})} placeholder="29AAAAA0000A1Z5" /></F>
                          <F label="Invoice No."><Inp value={editAutoDraft.inum} onChange={v=>setEditAutoDraft({...editAutoDraft,inum:v})} /></F>
                          <F label="Invoice Date"><DatePicker value={editAutoDraft.idt} onChange={v=>setEditAutoDraft({...editAutoDraft,idt:v})} period={period} /></F>
                          <F label="Place of Supply"><Sel value={editAutoDraft.pos} onChange={v=>setEditAutoDraft({...editAutoDraft,pos:v})} options={STATE_OPTS} /></F>
                        </div>
                        <div className="mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                          <RCMToggle val={editAutoDraft.rchrg} onChange={v=>setEditAutoDraft({...editAutoDraft,rchrg:v})} />
                        </div>
                        <SaveCancelBtns onSave={saveEditAuto} onCancel={()=>setEditAutoId(null)} />
                      </EditPanel>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filing.b2b.map((row,i) => editId===row.id ? (
              <tr key={row.id} className="bg-green-50 border-b border-green-200">
                <td colSpan={14} className="p-3">
                  <EditPanel onClose={()=>setEditId(null)}>
                    <B2BForm d={editDraft} setD={setEditDraft} isPeriodLocked={true} onSave={saveEdit} onClear={()=>setEditDraft(blank())} saveLabel="Save Changes" />
                  </EditPanel>
                </td>
              </tr>
            ) : <B2BRow key={row.id} row={row} idx={autoRows.length+i} isAuto={false} />)}
            {allRows.length===0&&<tr><td colSpan={14} className="px-4 py-8 text-center text-sm text-gray-400">No B2B entries for this period</td></tr>}
          </tbody>
        </table>
      </div>

      {!adding
        ? <button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add new B2B entry</button>
        : <AddPanel onClose={()=>{setDraft(blank());setAdding(false);setIsDiff(false);}}>
            <B2BForm d={draft} setD={setDraft} isPeriodLocked={true} onSave={saveAdd} onClear={()=>setDraft(blank())} saveLabel="Add Entry" />
          </AddPanel>
      }

      {/* ── Amendments (B2BA) — Table 4A — separate section ── */}
      <AmendDivider section="B2BA" tableNum="4A" />

      {amendRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-amber-200 shadow-sm mb-3">
          <table className="w-full text-sm">
            <thead><tr className="bg-amber-50">
              <Th ch="#" /><Th ch="Original Inv No." /><Th ch="Orig. Date (prev. period)" /><Th ch="Amended Inv No." /><Th ch="Amended Date" /><Th ch="GSTIN" /><Th ch="POS" /><Th ch="Rate" /><Th ch="Taxable" right /><Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST" right /><Th ch="RCM" />
            </tr></thead>
            <tbody>
              {amendRows.map((row,i) => (
                <tr key={row.id} className={`border-b border-amber-100 ${i%2===0?'bg-white':'bg-amber-50/30'} hover:bg-amber-50/60`}>
                  <Td dim>{i+1}</Td>
                  <Td><span className="font-mono text-[11px] font-semibold">{row.origInvNum}</span></Td>
                  <Td dim><span className="text-amber-700">{row.origInvDt}</span></Td>
                  <Td><span className="font-medium">{row.inum}</span></Td>
                  <Td dim>{row.idt}</Td>
                  <Td mono><span className="text-[11px]">{row.ctin||'—'}</span></Td>
                  <Td dim><span className="text-[10px]">{STATE_CODES[row.pos]?.split(' ')[0]||row.pos}</span></Td>
                  <Td dim>{row.itms[0]?.itm_det.rt}%</Td>
                  <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.txval??0)}</Td>
                  <Td right mono>{row.itms[0]?.itm_det.iamt?formatIndianCurrency(row.itms[0].itm_det.iamt):'—'}</Td>
                  <Td right mono>{row.itms[0]?.itm_det.camt?formatIndianCurrency(row.itms[0].itm_det.camt):'—'}</Td>
                  <Td right mono>{row.itms[0]?.itm_det.samt?formatIndianCurrency(row.itms[0].itm_det.samt):'—'}</Td>
                  <Td><div className="flex items-center gap-1"><RCMPill val={row.rchrg} onClick={()=>onChange({...filing,b2ba:amendRows.map(r=>r.id===row.id?{...r,rchrg:r.rchrg==='N'?'Y':'N'}:r)})} /><DelBtn onClick={()=>delAmend(row.id)} /></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {amendRows.length === 0 && !addingAmend && (
        <p className="text-sm text-gray-400 italic mb-2">No amendments for this period.</p>
      )}

      {!addingAmend
        ? <button type="button" onClick={()=>setAddingAmend(true)} className="text-sm text-amber-600 hover:text-amber-800 font-medium">+ Click here to add an amendment</button>
        : <AddPanel isAmend={true} onClose={()=>{setDraftAmend(blankAmend());setAddingAmend(false);}}>
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">Fill original invoice details (from a previous filed period) + the corrected/amended details below.</p>
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 rounded-lg border border-amber-200 mb-3">
              <F label="Original Invoice No. (being amended)"><Inp value={draftAmend.origInvNum||''} onChange={v=>setDraftAmend({...draftAmend,origInvNum:v})} placeholder="Old INV-001" /></F>
              <F label="Original Invoice Date (previous period)"><DatePicker value={draftAmend.origInvDt||''} onChange={v=>setDraftAmend({...draftAmend,origInvDt:v})} /></F>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <F label="GSTIN of Recipient"><Inp value={draftAmend.ctin} onChange={v=>setDraftAmend({...draftAmend,ctin:v.toUpperCase()})} placeholder="29AAAAA0000A1Z5" /></F>
              <F label="Amended Invoice No."><Inp value={draftAmend.inum} onChange={v=>setDraftAmend({...draftAmend,inum:v})} placeholder="INV-001A" /></F>
              <F label="Amended Invoice Date"><DatePicker value={draftAmend.idt} onChange={v=>setDraftAmend({...draftAmend,idt:v})} period={period} /></F>
              <F label="Invoice Value (₹)"><Inp value={draftAmend.val||''} onChange={v=>setDraftAmend({...draftAmend,val:parseFloat(v)||0})} className="text-right" /></F>
              <F label="Place of Supply"><Sel value={draftAmend.pos} onChange={v=>setDraftAmend({...draftAmend,pos:v})} options={STATE_OPTS} /></F>
              <F label="Invoice Type"><Sel value={draftAmend.inv_typ} onChange={v=>setDraftAmend({...draftAmend,inv_typ:v as B2BInvoice['inv_typ']})} options={INV_TYPE_OPTS} /></F>
              <F label="Rate (%)"><Sel value={String(draftAmend.itms[0]?.itm_det.rt??18)} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,rt:parseFloat(v)}}]})} options={RATE_OPTS} /></F>
              <F label="Taxable Value (₹)"><Inp value={draftAmend.itms[0]?.itm_det.txval||''} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,txval:parseFloat(v)||0}}]})} className="text-right" /></F>
              <F label="IGST (₹)"><Inp value={draftAmend.itms[0]?.itm_det.iamt||''} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,iamt:parseFloat(v)||undefined}}]})} className="text-right" placeholder="0" /></F>
              <F label="CGST (₹)"><Inp value={draftAmend.itms[0]?.itm_det.camt||''} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,camt:parseFloat(v)||undefined}}]})} className="text-right" placeholder="0" /></F>
              <F label="SGST (₹)"><Inp value={draftAmend.itms[0]?.itm_det.samt||''} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,samt:parseFloat(v)||undefined}}]})} className="text-right" placeholder="0" /></F>
            </div>
            <AddBtns onSave={saveAmend} onClear={()=>setDraftAmend(blankAmend())} />
          </AddPanel>
      }
    </div>
  );
}

// ── B2CL Section ──────────────────────────────────────────────────────────────

function B2CLSection({ autoRows, filing, onChange, period, companyStateCode, onDeleteAuto }: {
  autoRows:B2CLInvoice[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void; period:string; companyStateCode:string; onDeleteAuto:(id:string)=>void;
}) {
  const defaultPOS = companyStateCode === '29' ? '27' : '29'; // default to a different state
  const blk = (): B2CLInvoice => ({ id:uid(), inum:'', idt:'', val:0, pos:defaultPOS, itms:[{num:1,itm_det:{rt:18,txval:0,iamt:0}}] });
  const blkAmend = (): B2CLInvoice => ({ ...blk(), isAmended:true, origInvNum:'', origInvDt:'' });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<B2CLInvoice>(blk());
  const [addingAmend, setAddingAmend] = useState(false);
  const [draftAmend, setDraftAmend] = useState<B2CLInvoice>(blkAmend());
  const [editId, setEditId] = useState<string|null>(null);
  const [editDraft, setEditDraft] = useState<B2CLInvoice>(blk());

  const all = [...autoRows, ...filing.b2cl];
  const amendRows = filing.b2cla ?? [];
  const totalTxval = all.reduce((s,r)=>s+(r.itms[0]?.itm_det.txval??0),0);
  const totalIgst  = all.reduce((s,r)=>s+(r.itms[0]?.itm_det.iamt??0),0);

  // B2CL is always inter-state → always IGST
  const autoIgst = (txval:number, rt:number) => Math.round(txval*rt/100*100)/100;
  const itmD = (base:B2CLInvoice, v:Partial<typeof base.itms[0]['itm_det']>) => [{num:1,itm_det:{...base.itms[0].itm_det,...v}}];
  const aboveThreshold = (txval:number) => txval > 100000;

  const saveAdd  = () => { onChange({...filing,b2cl:[...filing.b2cl,draft]}); setDraft(blk()); setAdding(false); };
  const saveAmend= () => { onChange({...filing,b2cla:[...amendRows,{...draftAmend,isAmended:true}]}); setDraftAmend(blkAmend()); setAddingAmend(false); };
  const del      = (id:string) => onChange({...filing,b2cl:filing.b2cl.filter(r=>r.id!==id)});
  const delAmend = (id:string) => onChange({...filing,b2cla:(filing.b2cla??[]).filter(r=>r.id!==id)});
  const startEdit= (row:B2CLInvoice) => { setEditId(row.id); setEditDraft({...row}); };
  const saveEdit = () => { onChange({...filing,b2cl:filing.b2cl.map(r=>r.id===editId?editDraft:r)}); setEditId(null); };

  return (
    <div>
      {/* B2CL rule note */}
      <div className="mb-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex gap-2 text-[11px] text-purple-800">
        <span className="shrink-0">ℹ</span>
        <span><strong>B2CL Rule (Table 5):</strong> Inter-state supplies to <em>unregistered</em> persons where taxable value exceeds <strong>₹1,00,000</strong>. Always IGST (no CGST/SGST). Invoices below ₹1L threshold go to B2CS instead.</span>
      </div>

      <SummaryStrip taxable={totalTxval} igst={totalIgst} cgst={0} sgst={0} />

      {/* Main table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="#" /><Th ch="Invoice No." /><Th ch="Invoice Date" /><Th ch="Invoice Value" right /><Th ch="Place of Supply" /><Th ch="Rate%" /><Th ch="Taxable Value" right /><Th ch="IGST (Inter-state)" right /><Th ch="Cess" right /><Th />
          </tr></thead>
          <tbody>
            {autoRows.map((row,i)=>(
              <tr key={row.id} className="bg-blue-50/30 hover:bg-blue-50/60 border-b border-gray-100">
                <Td dim><span className="text-[10px]">{i+1}</span></Td>
                <Td><div className="flex items-center gap-1.5"><BooksBadge /><span className="font-medium">{row.inum}</span></div></Td>
                <Td dim>{row.idt}</Td>
                <Td right mono>{formatIndianCurrency(row.val)}</Td>
                <Td dim><span className="text-[11px] text-purple-600">{STATE_CODES[row.pos]?.split(' ')[0]||row.pos}</span></Td>
                <Td dim>{row.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.txval??0)}</Td>
                <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.iamt??0)}</Td>
                <Td right mono dim>—</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>{ if(window.confirm('Delete this auto-imported invoice? Journal entries are not affected.')) onDeleteAuto(row.id); }} /></td>
              </tr>
            ))}
            {filing.b2cl.map((row,i) => editId===row.id ? (
              <tr key={row.id} className="bg-green-50 border-b border-green-200">
                <td colSpan={10} className="p-3">
                  <EditPanel onClose={()=>setEditId(null)}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <F label="Invoice No."><Inp value={editDraft.inum} onChange={v=>setEditDraft({...editDraft,inum:v})} /></F>
                      <F label="Invoice Date"><DatePicker value={editDraft.idt} onChange={v=>setEditDraft({...editDraft,idt:v})} period={period} /></F>
                      <F label="Value (₹)"><Inp value={editDraft.val||''} onChange={v=>setEditDraft({...editDraft,val:parseFloat(v)||0})} className="text-right" /></F>
                      <F label="Place of Supply (inter-state)">
                        <Sel value={editDraft.pos} onChange={v=>setEditDraft({...editDraft,pos:v})} options={STATE_OPTS.filter(s=>s.value!==companyStateCode)} />
                      </F>
                      <F label="Rate (%)">
                        <Sel value={String(editDraft.itms[0]?.itm_det.rt??18)} onChange={v=>{ const rt=parseFloat(v); const iamt=autoIgst(editDraft.itms[0]?.itm_det.txval??0,rt); setEditDraft({...editDraft,itms:itmD(editDraft,{rt,iamt})}); }} options={RATE_OPTS} />
                      </F>
                      <F label="Taxable (₹)">
                        <Inp value={editDraft.itms[0]?.itm_det.txval||''} onChange={v=>{ const tv=parseFloat(v)||0; const iamt=autoIgst(tv,editDraft.itms[0]?.itm_det.rt??18); setEditDraft({...editDraft,itms:itmD(editDraft,{txval:tv,iamt})}); }} className="text-right" />
                        {(editDraft.itms[0]?.itm_det.txval??0)>0&&!aboveThreshold(editDraft.itms[0]?.itm_det.txval??0)&&<p className="text-[10px] text-amber-600 mt-0.5">⚠ Below ₹1L — should be in B2CS</p>}
                      </F>
                      <F label="IGST (₹) — auto-calc">
                        <Inp value={editDraft.itms[0]?.itm_det.iamt||''} onChange={v=>setEditDraft({...editDraft,itms:itmD(editDraft,{iamt:parseFloat(v)||0})})} className="text-right bg-purple-50" />
                      </F>
                    </div>
                    <SaveCancelBtns onSave={saveEdit} onCancel={()=>setEditId(null)} />
                  </EditPanel>
                </td>
              </tr>
            ) : (
              <tr key={row.id} className={`hover:bg-gray-50 border-b border-gray-100 ${i%2===1?'bg-gray-50/40':''}`}>
                <Td dim><span className="text-[10px]">{autoRows.length+i+1}</span></Td>
                <Td><span className="font-medium">{row.inum}</span></Td>
                <Td dim>{row.idt}</Td>
                <Td right mono>{formatIndianCurrency(row.val)}</Td>
                <Td dim><span className="text-[11px] text-purple-600">{STATE_CODES[row.pos]?.split(' ')[0]||row.pos}</span></Td>
                <Td dim>{row.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>
                  <div>{formatIndianCurrency(row.itms[0]?.itm_det.txval??0)}</div>
                  {!aboveThreshold(row.itms[0]?.itm_det.txval??0)&&<div className="text-[9px] text-amber-500">⚠ below ₹1L</div>}
                </Td>
                <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.iamt??0)}</Td>
                <Td right mono dim>{row.itms[0]?.itm_det.csamt?formatIndianCurrency(row.itms[0].itm_det.csamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={()=>startEdit(row)} className="text-gray-400 hover:text-blue-600 px-1 text-[13px]" title="Edit">✎</button>
                    <DelBtn onClick={()=>del(row.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {all.length===0&&<tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">No B2CL invoices for this period</td></tr>}
          </tbody>
        </table>
      </div>

      {!adding
        ? <button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add new B2CL entry</button>
        : <AddPanel onClose={()=>{setDraft(blk());setAdding(false);}}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <F label="Invoice No."><Inp value={draft.inum} onChange={v=>setDraft({...draft,inum:v})} placeholder="INV-001" /></F>
              <F label="Invoice Date"><DatePicker value={draft.idt} onChange={v=>setDraft({...draft,idt:v})} period={period} /></F>
              <F label="Invoice Value (₹)"><Inp value={draft.val||''} onChange={v=>setDraft({...draft,val:parseFloat(v)||0})} className="text-right" /></F>
              <F label="Place of Supply (inter-state only)">
                <Sel value={draft.pos} onChange={v=>setDraft({...draft,pos:v})} options={STATE_OPTS.filter(s=>s.value!==companyStateCode)} />
                <p className="text-[9px] text-purple-600 mt-0.5">Different state from yours → IGST applies</p>
              </F>
              <F label="Tax Rate (%)">
                <Sel value={String(draft.itms[0]?.itm_det.rt??18)} onChange={v=>{ const rt=parseFloat(v); const iamt=autoIgst(draft.itms[0]?.itm_det.txval??0,rt); setDraft({...draft,itms:itmD(draft,{rt,iamt})}); }} options={RATE_OPTS} />
              </F>
              <F label="Taxable Value (₹)">
                <Inp value={draft.itms[0]?.itm_det.txval||''} onChange={v=>{ const tv=parseFloat(v)||0; const iamt=autoIgst(tv,draft.itms[0]?.itm_det.rt??18); setDraft({...draft,itms:itmD(draft,{txval:tv,iamt})}); }} className="text-right" />
                {(draft.itms[0]?.itm_det.txval??0)>0&&!aboveThreshold(draft.itms[0]?.itm_det.txval??0)&&<p className="text-[10px] text-amber-600 mt-0.5">⚠ Below ₹1,00,000 — use B2CS instead</p>}
              </F>
              <F label="IGST (₹) — auto-calculated">
                <Inp value={draft.itms[0]?.itm_det.iamt||''} onChange={v=>setDraft({...draft,itms:itmD(draft,{iamt:parseFloat(v)||0})})} className="text-right bg-purple-50" />
              </F>
              <F label="Cess (₹)"><Inp value={draft.itms[0]?.itm_det.csamt||''} onChange={v=>setDraft({...draft,itms:itmD(draft,{csamt:parseFloat(v)||undefined})})} placeholder="0" className="text-right" /></F>
            </div>
            <AddBtns onSave={saveAdd} onClear={()=>setDraft(blk())} />
          </AddPanel>
      }

      {/* ── Amendments (B2CLA) — Table 5A — separate section ── */}
      <AmendDivider section="B2CLA" tableNum="5A" />

      {amendRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-amber-200 shadow-sm mb-3">
          <table className="w-full text-sm">
            <thead><tr className="bg-amber-50">
              <Th ch="#" /><Th ch="Original Inv No." /><Th ch="Orig. Date (prev. period)" /><Th ch="Amended Inv No." /><Th ch="Amended Date" /><Th ch="POS" /><Th ch="Rate" /><Th ch="Taxable" right /><Th ch="IGST" right /><Th />
            </tr></thead>
            <tbody>
              {amendRows.map((row,i)=>(
                <tr key={row.id} className={`border-b border-amber-100 ${i%2===0?'bg-white':'bg-amber-50/30'} hover:bg-amber-50/60`}>
                  <Td dim>{i+1}</Td>
                  <Td><span className="font-mono text-[11px] font-semibold">{row.origInvNum}</span></Td>
                  <Td dim><span className="text-amber-700">{row.origInvDt}</span></Td>
                  <Td><span className="font-medium">{row.inum}</span></Td>
                  <Td dim>{row.idt}</Td>
                  <Td dim><span className="text-[11px] text-purple-600">{STATE_CODES[row.pos]?.split(' ')[0]||row.pos}</span></Td>
                  <Td dim>{row.itms[0]?.itm_det.rt}%</Td>
                  <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.txval??0)}</Td>
                  <Td right mono>{formatIndianCurrency(row.itms[0]?.itm_det.iamt??0)}</Td>
                  <td className="px-2 border-b border-amber-100"><DelBtn onClick={()=>delAmend(row.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {amendRows.length===0&&!addingAmend&&<p className="text-sm text-gray-400 italic mb-2">No amendments for this period.</p>}

      {!addingAmend
        ? <button type="button" onClick={()=>setAddingAmend(true)} className="text-sm text-amber-600 hover:text-amber-800 font-medium">+ Click here to add an amendment</button>
        : <AddPanel isAmend={true} onClose={()=>{setDraftAmend(blkAmend());setAddingAmend(false);}}>
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">Fill original invoice details (from a previously filed period) + the corrected/amended values below.</p>
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 rounded-lg border border-amber-200 mb-3">
              <F label="Original Invoice No. (being amended)"><Inp value={draftAmend.origInvNum||''} onChange={v=>setDraftAmend({...draftAmend,origInvNum:v})} placeholder="Old INV-001" /></F>
              <F label="Original Invoice Date (previous period)"><DatePicker value={draftAmend.origInvDt||''} onChange={v=>setDraftAmend({...draftAmend,origInvDt:v})} /></F>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <F label="Amended Invoice No."><Inp value={draftAmend.inum} onChange={v=>setDraftAmend({...draftAmend,inum:v})} placeholder="INV-001A" /></F>
              <F label="Amended Invoice Date"><DatePicker value={draftAmend.idt} onChange={v=>setDraftAmend({...draftAmend,idt:v})} period={period} /></F>
              <F label="Invoice Value (₹)"><Inp value={draftAmend.val||''} onChange={v=>setDraftAmend({...draftAmend,val:parseFloat(v)||0})} className="text-right" /></F>
              <F label="Place of Supply">
                <Sel value={draftAmend.pos} onChange={v=>setDraftAmend({...draftAmend,pos:v})} options={STATE_OPTS.filter(s=>s.value!==companyStateCode)} />
              </F>
              <F label="Rate (%)">
                <Sel value={String(draftAmend.itms[0]?.itm_det.rt??18)} onChange={v=>{ const rt=parseFloat(v); const iamt=autoIgst(draftAmend.itms[0]?.itm_det.txval??0,rt); setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,rt,iamt}}]}); }} options={RATE_OPTS} />
              </F>
              <F label="Taxable Value (₹)">
                <Inp value={draftAmend.itms[0]?.itm_det.txval||''} onChange={v=>{ const tv=parseFloat(v)||0; const iamt=autoIgst(tv,draftAmend.itms[0]?.itm_det.rt??18); setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,txval:tv,iamt}}]}); }} className="text-right" />
              </F>
              <F label="IGST (₹) — auto-calculated">
                <Inp value={draftAmend.itms[0]?.itm_det.iamt||''} onChange={v=>setDraftAmend({...draftAmend,itms:[{num:1,itm_det:{...draftAmend.itms[0].itm_det,iamt:parseFloat(v)||0}}]})} className="text-right bg-purple-50" />
              </F>
            </div>
            <AddBtns onSave={saveAmend} onClear={()=>setDraftAmend(blkAmend())} />
          </AddPanel>
      }
    </div>
  );
}

// ── B2CS Section ──────────────────────────────────────────────────────────────

function B2CSSection({ autoRows, filing, onChange }: { autoRows:B2CSSummary[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void }) {
  const [adding, setAdding] = useState(false);
  const blk = (): B2CSSummary => ({ id:uid(), sply_ty:'INTRA', pos:'27', rt:18, txval:0 });
  const [d, setD] = useState<B2CSSummary>(blk());
  const all = [...autoRows, ...filing.b2cs];
  const totalTxval = all.reduce((s,r)=>s+r.txval,0);
  const totalIgst = all.reduce((s,r)=>s+(r.iamt??0),0);
  const totalCgst = all.reduce((s,r)=>s+(r.camt??0),0);
  const totalSgst = all.reduce((s,r)=>s+(r.samt??0),0);
  const add = () => { onChange({...filing,b2cs:[...filing.b2cs,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,b2cs:filing.b2cs.filter(r=>r.id!==id)});

  return (
    <div>
      <SummaryStrip taxable={totalTxval} igst={totalIgst} cgst={totalCgst} sgst={totalSgst} />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="Type" /><Th ch="Place of Supply" /><Th ch="Rate%" /><Th ch="Taxable Value" right /><Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST/UTGST" right /><Th ch="Cess" right />
          </tr></thead>
          <tbody>
            {autoRows.map(r=>(
              <tr key={r.id} className="bg-blue-50/30 hover:bg-blue-50/60">
                <Td><div className="flex items-center gap-1.5"><BooksBadge />{r.sply_ty}</div></Td>
                <Td dim>{STATE_CODES[r.pos]||r.pos}</Td><Td dim>{r.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.txval)}</Td>
                <Td right mono>{r.iamt?formatIndianCurrency(r.iamt):'—'}</Td>
                <Td right mono>{r.camt?formatIndianCurrency(r.camt):'—'}</Td>
                <Td right mono>{r.samt?formatIndianCurrency(r.samt):'—'}</Td>
                <Td right mono dim>—</Td>
              </tr>
            ))}
            {filing.b2cs.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>{r.sply_ty}</Td>
                <Td dim>{STATE_CODES[r.pos]||r.pos}</Td><Td dim>{r.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.txval)}</Td>
                <Td right mono>{r.iamt?formatIndianCurrency(r.iamt):'—'}</Td>
                <Td right mono>{r.camt?formatIndianCurrency(r.camt):'—'}</Td>
                <Td right mono>{r.samt?formatIndianCurrency(r.samt):'—'}</Td>
                <Td right mono dim>{r.csamt?formatIndianCurrency(r.csamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {all.length===0&&<tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No B2CS supplies for this period</td></tr>}
          </tbody>
        </table>
      </div>
      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add B2CS entry</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <F label="Supply Type — sets IGST or CGST+SGST">
              <div className="flex gap-2 mt-0.5">
                {(['INTRA','INTER'] as const).map(t=>(
                  <button key={t} type="button" onClick={()=>{ const isInter=t==='INTER'; const rt=d.rt; const tv=d.txval; const iamt=isInter?Math.round(tv*rt/100*100)/100:undefined; const camt=!isInter?Math.round(tv*rt/200*100)/100:undefined; const samt=camt; setD({...d,sply_ty:t,iamt,camt,samt}); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${d.sply_ty===t?(t==='INTER'?'bg-purple-600 text-white border-purple-600':'bg-green-600 text-white border-green-600'):'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {t}<span className="opacity-70 text-[9px] block">{t==='INTER'?'→ IGST':'→ CGST+SGST'}</span>
                  </button>
                ))}
              </div>
            </F>
            <F label="Place of Supply"><Sel value={d.pos} onChange={v=>setD({...d,pos:v})} options={STATE_OPTS} /></F>
            <F label="Rate (%)">
              <Sel value={String(d.rt)} onChange={v=>{ const rt=parseFloat(v); const isInter=d.sply_ty==='INTER'; const iamt=isInter?Math.round(d.txval*rt/100*100)/100:undefined; const camt=!isInter?Math.round(d.txval*rt/200*100)/100:undefined; setD({...d,rt,iamt,camt,samt:camt}); }} options={RATE_OPTS} />
            </F>
            <F label="Taxable Value (₹)">
              <Inp value={d.txval||''} onChange={v=>{ const tv=parseFloat(v)||0; const isInter=d.sply_ty==='INTER'; const iamt=isInter?Math.round(tv*d.rt/100*100)/100:undefined; const camt=!isInter?Math.round(tv*d.rt/200*100)/100:undefined; setD({...d,txval:tv,iamt,camt,samt:camt}); }} className="text-right" />
            </F>
            {d.sply_ty==='INTER'
              ? <F label="IGST (₹) — auto-calculated"><Inp value={d.iamt??''} onChange={v=>setD({...d,iamt:parseFloat(v)||undefined})} placeholder="0" className="text-right bg-purple-50" /></F>
              : <>
                  <F label="CGST (₹) — auto-calculated"><Inp value={d.camt??''} onChange={v=>setD({...d,camt:parseFloat(v)||undefined})} placeholder="0" className="text-right bg-green-50" /></F>
                  <F label="SGST/UTGST (₹) — auto-calculated"><Inp value={d.samt??''} onChange={v=>setD({...d,samt:parseFloat(v)||undefined})} placeholder="0" className="text-right bg-green-50" /></F>
                </>
            }
            <F label="Cess (₹)"><Inp value={d.csamt||''} onChange={v=>setD({...d,csamt:parseFloat(v)||undefined})} placeholder="0" className="text-right" /></F>
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}

// ── EXP Section ───────────────────────────────────────────────────────────────

function EXPSection({ autoRows, filing, onChange, onDeleteAuto }: { autoRows: EXPInvoice[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void; onDeleteAuto:(id:string)=>void }) {
  const [adding, setAdding] = useState(false);
  const blk = (): EXPInvoice => ({ id:uid(), exp_typ:'WOPAY', inum:'', idt:'', val:0, itms:[{txval:0,rt:0}] });
  const [d, setD] = useState<EXPInvoice>(blk());
  const add = () => { onChange({...filing,exp:[...filing.exp,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,exp:filing.exp.filter(r=>r.id!==id)});
  const allRows = [...autoRows, ...filing.exp];
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="Export Type" /><Th ch="Invoice No." /><Th ch="Invoice Date" /><Th ch="Invoice Value" right /><Th ch="Shipping Bill No." /><Th ch="Shipping Bill Date" /><Th ch="Port Code" /><Th ch="Rate%" /><Th ch="Taxable Value" right /><Th ch="IGST" right /><Th />
          </tr></thead>
          <tbody>
            {autoRows.map(r=>(
              <tr key={r.id} className="bg-blue-50/30 hover:bg-blue-50/60">
                <Td>{r.exp_typ}</Td><Td><div className="flex items-center gap-1"><BooksBadge />{r.inum}</div></Td><Td dim>{r.idt}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td dim>{r.sbnum||'—'}</Td><Td dim>{r.sbdt||'—'}</Td><Td dim>{r.sbpcode||'—'}</Td>
                <Td dim>{r.itms[0]?.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.itms[0]?.txval??0)}</Td>
                <Td right mono>{r.itms[0]?.iamt?formatIndianCurrency(r.itms[0].iamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>{ if(window.confirm('Delete this auto-imported export invoice? Journal entries are not affected.')) onDeleteAuto(r.id); }} /></td>
              </tr>
            ))}
            {filing.exp.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>{r.exp_typ}</Td><Td>{r.inum}</Td><Td dim>{r.idt}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td dim>{r.sbnum||'—'}</Td><Td dim>{r.sbdt||'—'}</Td><Td dim>{r.sbpcode||'—'}</Td>
                <Td dim>{r.itms[0]?.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.itms[0]?.txval??0)}</Td>
                <Td right mono>{r.itms[0]?.iamt?formatIndianCurrency(r.itms[0].iamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {allRows.length===0&&<tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">No exports for this period</td></tr>}
          </tbody>
        </table>
      </div>
      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add export entry</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="Export Type"><Sel value={d.exp_typ} onChange={v=>setD({...d,exp_typ:v as 'WPAY'|'WOPAY'})} options={[{value:'WOPAY',label:'WOPAY – Without Payment'},{value:'WPAY',label:'WPAY – With Payment'}]} /></F>
            <F label="Invoice No."><Inp value={d.inum} onChange={v=>setD({...d,inum:v})} placeholder="INV-001" /></F>
            <F label="Invoice Date"><DatePicker value={d.idt} onChange={v=>setD({...d,idt:v})} /></F>
            <F label="Invoice Value (₹)"><Inp value={d.val||''} onChange={v=>setD({...d,val:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Shipping Bill No."><Inp value={d.sbnum||''} onChange={v=>setD({...d,sbnum:v})} /></F>
            <F label="Shipping Bill Date"><DatePicker value={d.sbdt||''} onChange={v=>setD({...d,sbdt:v})} /></F>
            <F label="Port Code"><Inp value={d.sbpcode||''} onChange={v=>setD({...d,sbpcode:v})} placeholder="INBOM4" /></F>
            <F label="Rate (%)"><Sel value={String(d.itms[0]?.rt??0)} onChange={v=>setD({...d,itms:[{...d.itms[0],rt:parseFloat(v)}]})} options={RATE_OPTS} /></F>
            <F label="Taxable Value (₹)"><Inp value={d.itms[0]?.txval||''} onChange={v=>setD({...d,itms:[{...d.itms[0],txval:parseFloat(v)||0}]})} className="text-right" /></F>
            <F label="IGST (₹)"><Inp value={d.itms[0]?.iamt||''} onChange={v=>setD({...d,itms:[{...d.itms[0],iamt:parseFloat(v)||undefined}]})} className="text-right" placeholder="0" /></F>
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}

// ── CDNR Section ──────────────────────────────────────────────────────────────

function CDNRSection({ autoRows, filing, onChange, onDeleteAuto }: { autoRows: CDNRNote[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void; onDeleteAuto:(id:string)=>void }) {
  const [adding, setAdding] = useState(false);
  const blk = (): CDNRNote => ({ id:uid(), ctin:'', ntty:'C', nt:[{ntnum:'',ntdt:'',val:0,itms:[{num:1,itm_det:{rt:18,txval:0}}]}] });
  const [d, setD] = useState<CDNRNote>(blk());
  const nt0 = d.nt[0];
  const add = () => { onChange({...filing,cdnr:[...filing.cdnr,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,cdnr:filing.cdnr.filter(r=>r.id!==id)});
  const setNt = (v: Partial<typeof nt0>) => setD({...d,nt:[{...nt0,...v}]});
  const setItm = (v: Partial<typeof nt0.itms[0]['itm_det']>) => setD({...d,nt:[{...nt0,itms:[{num:1,itm_det:{...nt0.itms[0].itm_det,...v}}]}]});
  const allRows = [...autoRows, ...filing.cdnr];
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="GSTIN of Recipient" /><Th ch="Note No." /><Th ch="Note Date" /><Th ch="Note Type" /><Th ch="Note Value" right /><Th ch="Rate%" /><Th ch="Taxable" right /><Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST" right /><Th />
          </tr></thead>
          <tbody>
            {autoRows.map(r=>(
              <tr key={r.id} className="bg-blue-50/30 hover:bg-blue-50/60">
                <Td mono><div className="flex items-center gap-1"><BooksBadge /><span className="text-[11px]">{r.ctin}</span></div></Td><Td>{r.nt[0]?.ntnum}</Td><Td dim>{r.nt[0]?.ntdt}</Td>
                <Td><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.ntty==='C'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.ntty==='C'?'Credit':'Debit'}</span></Td>
                <Td right mono>{formatIndianCurrency(r.nt[0]?.val??0)}</Td>
                <Td dim>{r.nt[0]?.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.nt[0]?.itms[0]?.itm_det.txval??0)}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.iamt?formatIndianCurrency(r.nt[0].itms[0].itm_det.iamt):'—'}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.camt?formatIndianCurrency(r.nt[0].itms[0].itm_det.camt):'—'}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.samt?formatIndianCurrency(r.nt[0].itms[0].itm_det.samt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>{ if(window.confirm('Delete this auto-imported credit/debit note? Journal entries are not affected.')) onDeleteAuto(r.id); }} /></td>
              </tr>
            ))}
            {filing.cdnr.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <Td mono>{r.ctin}</Td><Td>{r.nt[0]?.ntnum}</Td><Td dim>{r.nt[0]?.ntdt}</Td>
                <Td><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.ntty==='C'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.ntty==='C'?'Credit':'Debit'}</span></Td>
                <Td right mono>{formatIndianCurrency(r.nt[0]?.val??0)}</Td>
                <Td dim>{r.nt[0]?.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.nt[0]?.itms[0]?.itm_det.txval??0)}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.iamt?formatIndianCurrency(r.nt[0].itms[0].itm_det.iamt):'—'}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.camt?formatIndianCurrency(r.nt[0].itms[0].itm_det.camt):'—'}</Td>
                <Td right mono>{r.nt[0]?.itms[0]?.itm_det.samt?formatIndianCurrency(r.nt[0].itms[0].itm_det.samt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {allRows.length===0&&<tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">No credit/debit notes to registered persons</td></tr>}
          </tbody>
        </table>
      </div>
      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add note</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="GSTIN of Recipient"><Inp value={d.ctin} onChange={v=>setD({...d,ctin:v.toUpperCase()})} placeholder="29AAAAA0000A1Z5" /></F>
            <F label="Note No."><Inp value={nt0.ntnum} onChange={v=>setNt({ntnum:v})} placeholder="CN-001" /></F>
            <F label="Note Date"><DatePicker value={nt0.ntdt} onChange={v=>setNt({ntdt:v})} /></F>
            <F label="Note Type"><Sel value={d.ntty} onChange={v=>setD({...d,ntty:v as 'C'|'D'})} options={[{value:'C',label:'C – Credit Note'},{value:'D',label:'D – Debit Note'}]} /></F>
            <F label="Note Value (₹)"><Inp value={nt0.val||''} onChange={v=>setNt({val:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Rate (%)"><Sel value={String(nt0.itms[0]?.itm_det.rt??18)} onChange={v=>setItm({rt:parseFloat(v)})} options={RATE_OPTS} /></F>
            <F label="Taxable Value (₹)"><Inp value={nt0.itms[0]?.itm_det.txval||''} onChange={v=>setItm({txval:parseFloat(v)||0})} className="text-right" /></F>
            <F label="IGST (₹)"><Inp value={nt0.itms[0]?.itm_det.iamt||''} onChange={v=>setItm({iamt:parseFloat(v)||undefined})} placeholder="0" className="text-right" /></F>
            <F label="CGST (₹)"><Inp value={nt0.itms[0]?.itm_det.camt||''} onChange={v=>setItm({camt:parseFloat(v)||undefined})} placeholder="0" className="text-right" /></F>
            <F label="SGST (₹)"><Inp value={nt0.itms[0]?.itm_det.samt||''} onChange={v=>setItm({samt:parseFloat(v)||undefined})} placeholder="0" className="text-right" /></F>
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}

// ── NIL Section ───────────────────────────────────────────────────────────────

const NIL_TYPES: NilSummary['sply_ty'][] = ['INTRB2B','INTRB2C','INTRAB2B','INTRAB2C'];
const NIL_LABELS: Record<string,string> = { INTRB2B:'Inter-state B2B', INTRB2C:'Inter-state B2C', INTRAB2B:'Intra-state B2B', INTRAB2C:'Intra-state B2C' };

function NILSection({ filing, onChange }: { filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void }) {
  const rows = NIL_TYPES.map(t => filing.nil.find(n=>n.sply_ty===t) ?? { id:`nil_${t}`, sply_ty:t, nil_amt:0, expt_amt:0, ngsup_amt:0 });
  const upd = (t:string, f:'nil_amt'|'expt_amt'|'ngsup_amt', v:number) =>
    onChange({...filing,nil:rows.map(r=>r.sply_ty===t?{...r,[f]:v}:r)});
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead><tr><Th ch="Supply Type" /><Th ch="Nil Rated (₹)" right /><Th ch="Exempt (₹)" right /><Th ch="Non-GST (₹)" right /></tr></thead>
        <tbody>{rows.map(row=>(
          <tr key={row.sply_ty} className="border-b border-gray-100">
            <Td>{NIL_LABELS[row.sply_ty]}</Td>
            <td className="px-2 py-1"><Inp value={row.nil_amt||''} onChange={v=>upd(row.sply_ty,'nil_amt',parseFloat(v)||0)} className="text-right" placeholder="0" /></td>
            <td className="px-2 py-1"><Inp value={row.expt_amt||''} onChange={v=>upd(row.sply_ty,'expt_amt',parseFloat(v)||0)} className="text-right" placeholder="0" /></td>
            <td className="px-2 py-1"><Inp value={row.ngsup_amt||''} onChange={v=>upd(row.sply_ty,'ngsup_amt',parseFloat(v)||0)} className="text-right" placeholder="0" /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── AT / TXPD Section ─────────────────────────────────────────────────────────

function ATTXPDSection({ section, filing, onChange }: { section:'at'|'txpd'; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void }) {
  const rows = filing[section] as ATAdvance[];
  const [adding, setAdding] = useState(false);
  const blk = () => ({ id:uid(), pos:'27', sply_ty:'INTRA' as 'INTRA'|'INTER', itms:[{rt:18,ad_amt:0,iamt:undefined as number|undefined,camt:undefined as number|undefined,samt:undefined as number|undefined}] });
  const [d, setD] = useState(blk());
  const isAT = section === 'at';

  const autoCalcAT = (adAmt:number, rt:number, splyTy:'INTRA'|'INTER') => {
    if (splyTy==='INTER') return { iamt:Math.round(adAmt*rt/100*100)/100, camt:undefined as number|undefined, samt:undefined as number|undefined };
    const half = Math.round(adAmt*rt/200*100)/100;
    return { iamt:undefined as number|undefined, camt:half, samt:half };
  };
  const applyCalc = (prev:ReturnType<typeof blk>, adAmt:number, rt:number, splyTy:'INTRA'|'INTER') => {
    const t = autoCalcAT(adAmt, rt, splyTy);
    return {...prev, sply_ty:splyTy, itms:[{...prev.itms[0], ad_amt:adAmt, rt, ...t}]};
  };

  const add = () => { onChange({...filing,[section]:[...rows,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,[section]:rows.filter(r=>r.id!==id)});

  return (
    <div>
      {/* Info banner */}
      <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-[11px] text-blue-700">
        <span className="shrink-0">ℹ</span>
        <span>
          {isAT
            ? <><strong>Table 11A — Tax Liability on Advances Received:</strong> Under CGST Act (Section 12/13), GST is applicable on advance receipts for services and notified goods at the time of receipt. Report gross advance + GST paid. Once supply is completed &amp; invoice raised, adjust this amount in Table 11B below.</>
            : <><strong>Table 11B — Advance Adjusted Against Supply:</strong> Report advances from prior periods now adjusted against actual supply invoices. This reverses the tax paid on advances and avoids double taxation.</>
          }
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr>
            <Th ch="Place of Supply" /><Th ch="Supply Type" /><Th ch="Rate%" />
            <Th ch={isAT?'Gross Advance Received (₹)':'Advance Adjusted (₹)'} right />
            <Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST/UTGST" right /><Th />
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50 border-b border-gray-100">
                <Td dim>{STATE_CODES[r.pos]?.split(' ').slice(0,2).join(' ')||r.pos}</Td>
                <Td>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.sply_ty==='INTER'?'bg-purple-100 text-purple-700':'bg-green-100 text-green-700'}`}>
                    {r.sply_ty}
                  </span>
                </Td>
                <Td dim>{r.itms[0]?.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.itms[0]?.ad_amt??0)}</Td>
                <Td right mono>{r.itms[0]?.iamt?formatIndianCurrency(r.itms[0].iamt):'—'}</Td>
                <Td right mono>{r.itms[0]?.camt?formatIndianCurrency(r.itms[0].camt):'—'}</Td>
                <Td right mono>{r.itms[0]?.samt?formatIndianCurrency(r.itms[0].samt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No {isAT?'advance receipts':'advance adjustments'} for this period</td></tr>}
          </tbody>
        </table>
      </div>

      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add entry</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="Place of Supply">
              <Sel value={d.pos} onChange={v=>setD({...d,pos:v})} options={STATE_OPTS} />
            </F>
            <F label="Supply Type — determines IGST or CGST+SGST">
              <div className="flex gap-2 mt-0.5">
                {(['INTRA','INTER'] as const).map(t=>(
                  <button key={t} type="button"
                    onClick={()=>setD(prev=>applyCalc(prev,prev.itms[0]?.ad_amt??0,prev.itms[0]?.rt??18,t))}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${d.sply_ty===t?(t==='INTER'?'bg-purple-600 text-white border-purple-600':'bg-green-600 text-white border-green-600'):'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {t}<span className="opacity-70 text-[9px] block">{t==='INTER'?'→ IGST':'→ CGST+SGST'}</span>
                  </button>
                ))}
              </div>
            </F>
            <F label="Tax Rate (%)">
              <Sel value={String(d.itms[0]?.rt??18)} onChange={v=>setD(prev=>applyCalc(prev,prev.itms[0]?.ad_amt??0,parseFloat(v),prev.sply_ty))} options={RATE_OPTS} />
            </F>
            <F label={isAT?'Gross Advance Received (₹)':'Advance Being Adjusted (₹)'}>
              <Inp value={d.itms[0]?.ad_amt||''} onChange={v=>setD(prev=>applyCalc(prev,parseFloat(v)||0,prev.itms[0]?.rt??18,prev.sply_ty))} className="text-right" placeholder="0" />
            </F>
            {d.sply_ty==='INTER'
              ? <F label="IGST (₹) — auto-calculated">
                  <Inp value={d.itms[0]?.iamt??''} onChange={v=>setD({...d,itms:[{...d.itms[0],iamt:parseFloat(v)||undefined}]})} className="text-right bg-purple-50" />
                </F>
              : <>
                  <F label="CGST (₹) — auto-calculated">
                    <Inp value={d.itms[0]?.camt??''} onChange={v=>setD({...d,itms:[{...d.itms[0],camt:parseFloat(v)||undefined}]})} className="text-right bg-green-50" />
                  </F>
                  <F label="SGST/UTGST (₹) — auto-calculated">
                    <Inp value={d.itms[0]?.samt??''} onChange={v=>setD({...d,itms:[{...d.itms[0],samt:parseFloat(v)||undefined}]})} className="text-right bg-green-50" />
                  </F>
                </>
            }
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}

// ── HSN Section ───────────────────────────────────────────────────────────────

function HSNSection({ autoRows, filing, onChange }: { autoRows: HSNSummary[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void }) {
  const [adding, setAdding] = useState(false);
  const allHsn = [...autoRows, ...filing.hsn];
  const blk = (): HSNSummary => ({ id:uid(), num:allHsn.length+1, hsn_sc:'', desc:'', uqc:'NOS', qty:0, val:0, txval:0, iamt:0, camt:0, samt:0, csamt:0 });
  const [d, setD] = useState<HSNSummary>(blk());
  const add = () => { onChange({...filing,hsn:[...filing.hsn,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,hsn:filing.hsn.filter(r=>r.id!==id)});
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr><Th ch="HSN/SAC Code" /><Th ch="Description" /><Th ch="UQC" /><Th ch="Qty" right /><Th ch="Total Value" right /><Th ch="Taxable Value" right /><Th ch="IGST" right /><Th ch="CGST" right /><Th ch="SGST/UTGST" right /><Th ch="Cess" right /><Th /></tr></thead>
          <tbody>
            {autoRows.map(r=>(
              <tr key={r.id} className="bg-blue-50/30 hover:bg-blue-50/60">
                <Td mono><div className="flex items-center gap-1"><BooksBadge />{r.hsn_sc}</div></Td><Td>{r.desc}</Td><Td dim>{r.uqc}</Td>
                <Td right mono>{r.qty}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td right mono>{formatIndianCurrency(r.txval)}</Td>
                <Td right mono>{formatIndianCurrency(r.iamt)}</Td>
                <Td right mono>{formatIndianCurrency(r.camt)}</Td>
                <Td right mono>{formatIndianCurrency(r.samt)}</Td>
                <Td right mono dim>{formatIndianCurrency(r.csamt)}</Td>
                <td className="px-2 border-b border-gray-100" />
              </tr>
            ))}
            {filing.hsn.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <Td mono>{r.hsn_sc}</Td><Td>{r.desc}</Td><Td dim>{r.uqc}</Td>
                <Td right mono>{r.qty}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td right mono>{formatIndianCurrency(r.txval)}</Td>
                <Td right mono>{formatIndianCurrency(r.iamt)}</Td>
                <Td right mono>{formatIndianCurrency(r.camt)}</Td>
                <Td right mono>{formatIndianCurrency(r.samt)}</Td>
                <Td right mono dim>{formatIndianCurrency(r.csamt)}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {allHsn.length===0&&<tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">No HSN/SAC entries</td></tr>}
          </tbody>
        </table>
      </div>
      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add HSN entry</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <F label="HSN/SAC Code"><Inp value={d.hsn_sc} onChange={v=>setD({...d,hsn_sc:v})} placeholder="8471" /></F>
            <F label="Description"><Inp value={d.desc} onChange={v=>setD({...d,desc:v})} placeholder="Laptops & computers" /></F>
            <F label="Unit (UQC)"><Sel value={d.uqc} onChange={v=>setD({...d,uqc:v})} options={UQC_OPTIONS.map(u=>({value:u,label:u}))} /></F>
            <F label="Quantity"><Inp value={d.qty||''} onChange={v=>setD({...d,qty:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Total Value (₹)"><Inp value={d.val||''} onChange={v=>setD({...d,val:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Taxable Value (₹)"><Inp value={d.txval||''} onChange={v=>setD({...d,txval:parseFloat(v)||0})} className="text-right" /></F>
            <F label="IGST (₹)"><Inp value={d.iamt||''} onChange={v=>setD({...d,iamt:parseFloat(v)||0})} className="text-right" /></F>
            <F label="CGST (₹)"><Inp value={d.camt||''} onChange={v=>setD({...d,camt:parseFloat(v)||0})} className="text-right" /></F>
            <F label="SGST (₹)"><Inp value={d.samt||''} onChange={v=>setD({...d,samt:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Cess (₹)"><Inp value={d.csamt||''} onChange={v=>setD({...d,csamt:parseFloat(v)||0})} className="text-right" /></F>
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}

// ── DOC Section ───────────────────────────────────────────────────────────────

const DOC_TYPES = ['Tax Invoice','Credit Note','Debit Note','Receipt Voucher','Delivery Challan','Payment Voucher'];

function DocSection({ filing, onChange, allInvoices }: { filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void; allInvoices: InvoiceV2[] }) {
  // Auto-compute serial number ranges from invoices for this period
  const [mm, yyyy] = [filing.period.slice(0,2), filing.period.slice(2)];
  const monthStr = `${yyyy}-${mm}`;
  const periodInvs = allInvoices.filter(inv => inv.invoice_date.startsWith(monthStr));

  const autoSerial = (docTypes: DocType[]): { from: string; to: string; totnum: number; cancel: number } => {
    const matching = periodInvs.filter(inv => docTypes.includes(inv.doc_type));
    if (matching.length === 0) return { from: '', to: '', totnum: 0, cancel: 0 };
    const sorted = matching.sort((a, b) => a.invoice_no.localeCompare(b.invoice_no));
    const cancelled = matching.filter(inv => inv.status === 'CANCELLED').length;
    return { from: sorted[0].invoice_no, to: sorted[sorted.length - 1].invoice_no, totnum: matching.length, cancel: cancelled };
  };

  // doc_num: 1=Tax Invoice, 2=Credit Note, 3=Debit Note, 4=Receipt Voucher, 5=Delivery Challan, 6=Payment Voucher
  const docTypeMap: Record<number, DocType[]> = {
    1: ['TAX_INVOICE', 'BILL_OF_SUPPLY'],
    2: ['CREDIT_NOTE'],
    3: ['DEBIT_NOTE'],
    4: ['RECEIPT_VOUCHER'],
    5: ['DELIVERY_CHALLAN'],
    6: ['PAYMENT_VOUCHER'],
  };

  const docs = DOC_TYPES.map((_,i) => {
    const saved = filing.doc_issue.find(d=>d.doc_num===i+1);
    if (saved) return saved;
    const auto = autoSerial(docTypeMap[i + 1] ?? []);
    return { id:`doc_${i+1}`, doc_num:i+1, docs:[{num:1, from:auto.from, to:auto.to, totnum:auto.totnum, cancel:auto.cancel, net_issue:auto.totnum - auto.cancel}] };
  });
  const upd = (doc_num:number, field:string, val:string|number) => {
    const updated = docs.map(d => {
      if (d.doc_num!==doc_num) return d;
      const nd = { ...d.docs[0], [field]:val };
      nd.net_issue = (field==='totnum'?Number(val):nd.totnum) - (field==='cancel'?Number(val):nd.cancel);
      return { ...d, docs:[nd] };
    });
    onChange({...filing,doc_issue:updated});
  };
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr><Th ch="Document Type" /><Th ch="Sr. No. From" /><Th ch="Sr. No. To" /><Th ch="Total Issued" right /><Th ch="Cancelled" right /><Th ch="Net Issued" right /></tr></thead>
          <tbody>{docs.map(doc=>(
            <tr key={doc.doc_num} className="border-b border-gray-100">
              <Td>{DOC_TYPES[doc.doc_num-1]}</Td>
              <td className="px-2 py-1 border-b border-gray-100"><Inp value={doc.docs[0]?.from??''} onChange={v=>upd(doc.doc_num,'from',v)} placeholder="001" /></td>
              <td className="px-2 py-1 border-b border-gray-100"><Inp value={doc.docs[0]?.to??''} onChange={v=>upd(doc.doc_num,'to',v)} placeholder="100" /></td>
              <td className="px-2 py-1 border-b border-gray-100"><Inp value={doc.docs[0]?.totnum??0} onChange={v=>upd(doc.doc_num,'totnum',parseInt(v)||0)} className="text-right" /></td>
              <td className="px-2 py-1 border-b border-gray-100"><Inp value={doc.docs[0]?.cancel??0} onChange={v=>upd(doc.doc_num,'cancel',parseInt(v)||0)} className="text-right" /></td>
              <td className="px-3 py-2 text-right font-mono text-sm border-b border-gray-100 font-semibold">{doc.docs[0]?.net_issue??0}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {periodInvs.length > 0 && (
        <p className="mt-2 text-[11px] text-blue-600"><span className="inline-block w-2 h-2 bg-blue-200 rounded-full mr-1" />Serial numbers auto-populated from {periodInvs.length} invoice(s) in this period</p>
      )}
    </div>
  );
}

// ── Validation modal ──────────────────────────────────────────────────────────

function ValidationModal({ errors, onClose }: { errors:ValidationError[]; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{errors.length===0?'✓ Validation Passed':`${errors.length} Validation Error${errors.length>1?'s':''}`}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        {errors.length===0
          ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">All checks passed. Ready to download JSON.</p>
          : <div className="space-y-2 max-h-72 overflow-y-auto">{errors.map((e,i)=>(
              <div key={i} className="flex gap-2 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="font-semibold text-red-700 shrink-0">[{e.section}]</span>
                {e.row&&<span className="text-gray-500 shrink-0">{e.row}:</span>}
                <span className="text-red-800">{e.message}</span>
              </div>
            ))}</div>
        }
        <button type="button" onClick={onClose} className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg">Close</button>
      </div>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

// ── Overview / Summary Section ────────────────────────────────────────────────

function OverviewSection({ fullFiling, period, onNavigate }: {
  fullFiling: GSTR1Filing;
  period: string;
  onNavigate: (tab: 'b2b'|'b2cl'|'b2cs'|'exp'|'cdnr'|'cdnur'|'nil'|'at'|'txpd'|'hsn'|'doc') => void;
}) {
  // Compute totals per section
  const b2bTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const inv of fullFiling.b2b) for (const i of inv.itms) {
      txval+=i.itm_det.txval; igst+=i.itm_det.iamt??0; cgst+=i.itm_det.camt??0; sgst+=i.itm_det.samt??0; cess+=i.itm_det.csamt??0;
    }
    return { count: fullFiling.b2b.length, txval, igst, cgst, sgst, cess };
  })();
  const b2clTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const inv of fullFiling.b2cl) for (const i of inv.itms) {
      txval+=i.itm_det.txval; igst+=i.itm_det.iamt??0; cgst+=i.itm_det.camt??0; sgst+=i.itm_det.samt??0; cess+=i.itm_det.csamt??0;
    }
    return { count: fullFiling.b2cl.length, txval, igst, cgst, sgst, cess };
  })();
  const b2csTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const s of fullFiling.b2cs) {
      txval+=s.txval; igst+=s.iamt??0; cgst+=s.camt??0; sgst+=s.samt??0; cess+=s.csamt??0;
    }
    return { count: fullFiling.b2cs.length, txval, igst, cgst, sgst, cess };
  })();
  const expTotals = (() => {
    let txval=0, igst=0;
    for (const e of fullFiling.exp) for (const i of e.itms) { txval+=i.txval; igst+=i.iamt??0; }
    return { count: fullFiling.exp.length, txval, igst, cgst:0, sgst:0, cess:0 };
  })();
  const cdnrTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0, count=0;
    for (const n of fullFiling.cdnr) { count+=n.nt.length; for (const nt of n.nt) for (const i of nt.itms) {
      txval+=i.itm_det.txval; igst+=i.itm_det.iamt??0; cgst+=i.itm_det.camt??0; sgst+=i.itm_det.samt??0; cess+=i.itm_det.csamt??0;
    }}
    return { count, txval, igst, cgst, sgst, cess };
  })();
  const cdnurTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const n of fullFiling.cdnur) for (const i of n.itms) {
      txval+=i.itm_det.txval; igst+=i.itm_det.iamt??0; cgst+=i.itm_det.camt??0; sgst+=i.itm_det.samt??0; cess+=i.itm_det.csamt??0;
    }
    return { count: fullFiling.cdnur.length, txval, igst, cgst, sgst, cess };
  })();
  const nilTotals = (() => {
    let nil_amt=0, expt_amt=0, ngsup_amt=0;
    for (const n of fullFiling.nil) { nil_amt+=n.nil_amt; expt_amt+=n.expt_amt; ngsup_amt+=n.ngsup_amt; }
    return { count: fullFiling.nil.length, txval: nil_amt+expt_amt+ngsup_amt, igst:0, cgst:0, sgst:0, cess:0, isNil:true };
  })();
  const atTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const a of fullFiling.at) for (const i of a.itms) {
      txval+=i.ad_amt; igst+=i.iamt??0; cgst+=i.camt??0; sgst+=i.samt??0; cess+=i.csamt??0;
    }
    return { count: fullFiling.at.length, txval, igst, cgst, sgst, cess };
  })();
  const txpdTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const a of fullFiling.txpd) for (const i of a.itms) {
      txval+=i.ad_amt; igst+=i.iamt??0; cgst+=i.camt??0; sgst+=i.samt??0; cess+=i.csamt??0;
    }
    return { count: fullFiling.txpd.length, txval, igst, cgst, sgst, cess };
  })();
  const hsnTotals = (() => {
    let txval=0, igst=0, cgst=0, sgst=0, cess=0;
    for (const h of fullFiling.hsn) { txval+=h.txval; igst+=h.iamt; cgst+=h.camt; sgst+=h.samt; cess+=h.csamt; }
    return { count: fullFiling.hsn.length, txval, igst, cgst, sgst, cess };
  })();

  type SectionRow = { key:'b2b'|'b2cl'|'b2cs'|'exp'|'cdnr'|'cdnur'|'nil'|'at'|'txpd'|'hsn'|'doc'; label:string; tableNum:string; count:number; txval:number; igst:number; cgst:number; sgst:number; cess:number; isNil?:boolean };
  const rows: SectionRow[] = [
    { key:'b2b',   label:'B2B — Registered',          tableNum:'4',   ...b2bTotals },
    { key:'b2cl',  label:'B2CL — Inter-state >₹1L',   tableNum:'5',   ...b2clTotals },
    { key:'b2cs',  label:'B2CS — Other Unregistered',  tableNum:'7',   ...b2csTotals },
    { key:'exp',   label:'EXP — Exports',              tableNum:'6A',  ...expTotals },
    { key:'cdnr',  label:'CDNR — Notes (Registered)',  tableNum:'9B',  ...cdnrTotals },
    { key:'cdnur', label:'CDNUR — Notes (Unregistered)',tableNum:'9B', ...cdnurTotals },
    { key:'nil',   label:'NIL — Nil / Exempt',         tableNum:'8',   ...nilTotals },
    { key:'at',    label:'AT — Advance Tax',           tableNum:'11A', ...atTotals },
    { key:'txpd',  label:'TXPD — Advance Adjusted',   tableNum:'11B', ...txpdTotals },
    { key:'hsn',   label:'HSN — HSN Summary',         tableNum:'12',  ...hsnTotals },
    { key:'doc',   label:'DOC — Document Issue',       tableNum:'13',  count: fullFiling.doc_issue.length, txval:0, igst:0, cgst:0, sgst:0, cess:0 },
  ];

  // Grand totals (tax-bearing sections only)
  const grand = rows.filter(r=>!r.isNil && r.key!=='doc').reduce(
    (acc,r) => ({ txval:acc.txval+r.txval, igst:acc.igst+r.igst, cgst:acc.cgst+r.cgst, sgst:acc.sgst+r.sgst, cess:acc.cess+r.cess }),
    { txval:0, igst:0, cgst:0, sgst:0, cess:0 }
  );
  const grandTax = grand.igst + grand.cgst + grand.sgst + grand.cess;

  const r2 = (n:number) => Math.round(n*100)/100;

  const topCards = [
    { label:'Total Taxable Value', val:grand.txval, color:'blue-600' },
    { label:'Total IGST',          val:grand.igst,  color:'purple-600' },
    { label:'Total CGST',          val:grand.cgst,  color:'green-600' },
    { label:'Total SGST/UTGST',    val:grand.sgst,  color:'teal-600' },
    { label:'Total Cess',          val:grand.cess,  color:'orange-500' },
    { label:'Total Output Tax',    val:grandTax,    color:'red-600' },
  ];

  return (
    <div>
      {/* Period label */}
      <p className="text-xs text-gray-500 mb-3">
        Summary for <span className="font-semibold text-gray-700">{MONTH_NAMES[parseInt(period.slice(0,2),10)-1]} {period.slice(2)}</span>
        {fullFiling.gstin && <> — GSTIN: <span className="font-mono font-semibold text-gray-700">{fullFiling.gstin}</span></>}
      </p>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        {topCards.map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-tight">{c.label}</p>
            <p className={`text-base font-bold font-mono mt-1 text-${c.color}`}>{formatIndianCurrency(r2(c.val))}</p>
          </div>
        ))}
      </div>

      {/* Section-wise table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <Th ch="Section" />
              <Th ch="Table" />
              <Th ch="Records" right />
              <Th ch="Taxable Value" right />
              <Th ch="IGST" right />
              <Th ch="CGST" right />
              <Th ch="SGST/UTGST" right />
              <Th ch="Cess" right />
              <Th ch="Total Tax" right />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const totalTax = row.igst + row.cgst + row.sgst + row.cess;
              const hasData = row.count > 0;
              return (
                <tr key={row.key}
                  onClick={() => onNavigate(row.key)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${hasData?'hover:bg-blue-50':'hover:bg-gray-50 opacity-50'}`}>
                  <Td>
                    <span className={`font-semibold text-xs ${hasData?'text-blue-700':'text-gray-400'}`}>
                      {row.label}
                    </span>
                  </Td>
                  <Td dim><span className="text-[11px]">{row.tableNum}</span></Td>
                  <Td right>
                    {hasData
                      ? <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold bg-blue-100 text-blue-700 rounded-full">{row.count}</span>
                      : <span className="text-gray-300 text-[11px]">–</span>}
                  </Td>
                  {row.isNil
                    ? <><Td right mono><span className="text-gray-500">{hasData?formatIndianCurrency(r2(row.txval)):'–'}</span></Td><Td right dim><span className="text-[11px]">N/A</span></Td><Td right dim><span className="text-[11px]">N/A</span></Td><Td right dim><span className="text-[11px]">N/A</span></Td><Td right dim><span className="text-[11px]">N/A</span></Td><Td right dim><span className="text-[11px]">N/A</span></Td></>
                    : <>
                        <Td right mono>{hasData||row.txval>0?formatIndianCurrency(r2(row.txval)):<span className="text-gray-300">–</span>}</Td>
                        <Td right mono>{row.igst>0?formatIndianCurrency(r2(row.igst)):<span className="text-gray-300">–</span>}</Td>
                        <Td right mono>{row.cgst>0?formatIndianCurrency(r2(row.cgst)):<span className="text-gray-300">–</span>}</Td>
                        <Td right mono>{row.sgst>0?formatIndianCurrency(r2(row.sgst)):<span className="text-gray-300">–</span>}</Td>
                        <Td right mono>{row.cess>0?formatIndianCurrency(r2(row.cess)):<span className="text-gray-300">–</span>}</Td>
                        <Td right mono>{totalTax>0?<span className="font-semibold">{formatIndianCurrency(r2(totalTax))}</span>:<span className="text-gray-300">–</span>}</Td>
                      </>
                  }
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide" colSpan={3}>Grand Total</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-gray-900">{formatIndianCurrency(r2(grand.txval))}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-purple-700">{formatIndianCurrency(r2(grand.igst))}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-green-700">{formatIndianCurrency(r2(grand.cgst))}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-teal-700">{formatIndianCurrency(r2(grand.sgst))}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-orange-600">{formatIndianCurrency(r2(grand.cess))}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-bold text-red-700">{formatIndianCurrency(r2(grandTax))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 mt-2">Click any row to jump to that section. HSN totals may overlap with B2B/B2CL/B2CS — do not double-count.</p>
    </div>
  );
}

type TabKey = 'overview'|'b2b'|'b2cl'|'b2cs'|'exp'|'cdnr'|'cdnur'|'nil'|'at'|'txpd'|'hsn'|'doc';

const TABS: { key:TabKey; label:string; tableNum:string }[] = [
  { key:'overview',label:'Overview',tableNum:'' },
  { key:'b2b',  label:'B2B',  tableNum:'4' },
  { key:'b2cl', label:'B2CL', tableNum:'5' },
  { key:'b2cs', label:'B2CS', tableNum:'7' },
  { key:'exp',  label:'EXP',  tableNum:'6A' },
  { key:'cdnr', label:'CDNR', tableNum:'9B' },
  { key:'cdnur',label:'CDNUR',tableNum:'9B' },
  { key:'nil',  label:'NIL',  tableNum:'8' },
  { key:'at',   label:'Advance Tax', tableNum:'11A' },
  { key:'txpd', label:'Adv. Adjusted', tableNum:'11B' },
  { key:'hsn',  label:'HSN',  tableNum:'12' },
  { key:'doc',  label:'DOC',  tableNum:'13' },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GSTR1Page() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [filing, setFiling] = useState<GSTR1Filing | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const gstin = company?.gst_details?.gstin ?? '';
  const companyStateCode = gstin.slice(0,2) || '27';
  const [invTick, setInvTick] = useState(0);

  // Load all invoices for this company (memoised on companyId + period + invTick)
  const allInvoices = useMemo(
    () => (companyId ? listInvoicesV2(companyId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, period, invTick],
  );

  const deleteAutoInv = (id: string) => { deleteInvoiceV2(id); setInvTick((t) => t + 1); };
  const updateAutoInv = (id: string, draft: Parameters<typeof updateInvoiceV2>[1]) => { updateInvoiceV2(id, draft); setInvTick((t) => t + 1); };

  useEffect(() => {
    if (!companyId) return;
    const f = getOrCreateFiling(companyId, period, gstin);
    // Backfill new fields for old filings
    if (!f.b2ba) f.b2ba = [];
    if (!f.b2cla) f.b2cla = [];
    if (!f.b2csa) f.b2csa = [];
    if (!f.expa) f.expa = [];
    if (!f.cdnra) f.cdnra = [];
    if (!f.cdnura) f.cdnura = [];
    if (!f.rcm_overrides) f.rcm_overrides = {};
    setFiling(f);
  }, [companyId, period, gstin]);

  // Live auto data from invoice registers
  const liveData = useMemo(() => {
    if (!filing) return null;
    return autoFillFromInvoices(allInvoices, filing, companyStateCode);
  }, [allInvoices, filing, companyStateCode]);

  const autoB2B = liveData?.b2b ?? [];
  const autoB2CL = liveData?.b2cl ?? [];
  const autoB2CS = liveData?.b2cs ?? [];
  const autoCDNR = liveData?.cdnr ?? [];
  const autoCDNUR = liveData?.cdnur ?? [];
  const autoEXP = liveData?.exp ?? [];
  const autoHSN = liveData?.hsn ?? [];

  const handleChange = useCallback((updated: GSTR1Filing) => {
    setFiling(updated);
    saveFiling(updated);
  }, []);

  // Combined filing for JSON (auto rows get RCM overrides applied)
  const fullFiling = useMemo((): GSTR1Filing | null => {
    if (!filing) return null;
    const autoB2BWithRCM = autoB2B.map(r => ({
      ...r,
      rchrg: filing.rcm_overrides?.[r.id] ?? r.rchrg,
    }));
    return {
      ...filing,
      b2b: [...autoB2BWithRCM, ...filing.b2b],
      b2cl: [...autoB2CL, ...filing.b2cl],
      b2cs: [...autoB2CS, ...filing.b2cs],
      cdnr: [...autoCDNR, ...filing.cdnr],
      cdnur: [...autoCDNUR, ...filing.cdnur],
      exp: [...autoEXP, ...filing.exp],
      hsn: [...autoHSN, ...filing.hsn],
    };
  }, [filing, autoB2B, autoB2CL, autoB2CS, autoCDNR, autoCDNUR, autoEXP, autoHSN]);

  const handleValidate = () => {
    if (!fullFiling) return;
    setValidationErrors(validateFiling(fullFiling));
  };

  const handleDownloadJson = () => {
    if (!fullFiling) return;
    const json = generateGstr1Json(fullFiling);
    const blob = new Blob([json], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${fullFiling.gstin||companyId}_${fullFiling.period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tab count badges
  const tabCount = (key: TabKey): number => {
    if (!filing) return 0;
    const autoCount = key==='b2b'?autoB2B.length:key==='b2cl'?autoB2CL.length:key==='b2cs'?autoB2CS.length:0;
    const manualMap: Partial<Record<TabKey,number>> = {
      b2b:filing.b2b.length, b2cl:filing.b2cl.length, b2cs:filing.b2cs.length,
      exp:filing.exp.length, cdnr:filing.cdnr.length, cdnur:filing.cdnur.length,
      at:filing.at.length, txpd:filing.txpd.length, hsn:filing.hsn.length,
      doc:filing.doc_issue.filter(d=>d.docs[0]?.totnum>0).length,
      nil:filing.nil.filter(n=>n.nil_amt>0||n.expt_amt>0||n.ngsup_amt>0).length,
    };
    return autoCount + (manualMap[key]??0);
  };

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!filing) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title="GSTR-1" description="Outward supply return">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={()=>setShowPeriodPicker(true)}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors">
            <span className="text-base">📅</span>
            <span className="text-sm font-semibold text-gray-800">{periodLabel(period)}</span>
            <span className="text-gray-400 text-xs">▾</span>
          </button>
          {showPeriodPicker && <PeriodPickerModal period={period} onSelect={p=>{setPeriod(p);setShowPeriodPicker(false);}} onClose={()=>setShowPeriodPicker(false)} />}
          <button type="button" onClick={handleValidate} className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Validate</button>
          <button type="button" onClick={handleDownloadJson} className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">↓ JSON</button>
        </div>
      </PageHeader>

      {!gstin && (
        <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          GSTIN not set — go to Company Settings to add it before filing.
        </div>
      )}

      {/* Horizontal tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-gray-200 scrollbar-hide">
        {TABS.map(tab => {
          const count = tabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} type="button" onClick={()=>setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${isActive?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              <span>{tab.label}</span>
              <span className="text-[10px] text-gray-400 hidden">Tbl {tab.tableNum}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive?'bg-blue-500 text-blue-100':'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section title */}
      {activeTab !== 'overview' && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 font-medium">
            {TABS.find(t=>t.key===activeTab)?.tableNum && <>Table {TABS.find(t=>t.key===activeTab)?.tableNum} — </>}
            {activeTab==='b2b'?'Supplies to Registered Persons':activeTab==='b2cl'?'Inter-state Supplies to Unregistered (>₹1L)':activeTab==='b2cs'?'Other Supplies to Unregistered':activeTab==='exp'?'Export Supplies':activeTab==='cdnr'?'Credit/Debit Notes (Registered)':activeTab==='cdnur'?'Credit/Debit Notes (Unregistered)':activeTab==='nil'?'Nil/Exempt/Non-GST Supplies':activeTab==='at'?'Tax Liability on Advances Received (Table 11A)':activeTab==='txpd'?'Advance Amount Adjusted Against Tax Paid Earlier (Table 11B)':activeTab==='hsn'?'HSN-wise Summary':'Document Issue Summary'}
          </p>
          {(activeTab==='b2b'||activeTab==='b2cl'||activeTab==='b2cs'||activeTab==='cdnr'||activeTab==='cdnur'||activeTab==='exp'||activeTab==='hsn') && (
            <p className="text-[11px] text-blue-600 mt-0.5"><span className="inline-block w-2 h-2 bg-blue-200 rounded-full mr-1" />Rows with <strong>books</strong> badge are auto-populated from the invoice register</p>
          )}
        </div>
      )}

      {/* Section panels */}
      {activeTab==='overview' && fullFiling && <OverviewSection fullFiling={fullFiling} period={period} onNavigate={(tab)=>setActiveTab(tab)} />}
      {activeTab==='b2b'  && <B2BSection autoRows={autoB2B} filing={filing} onChange={handleChange} period={period} companyStateCode={companyStateCode} onDeleteAuto={deleteAutoInv} onUpdateAuto={updateAutoInv} allInvoices={allInvoices} />}
      {activeTab==='b2cl' && <B2CLSection autoRows={autoB2CL} filing={filing} onChange={handleChange} period={period} companyStateCode={companyStateCode} onDeleteAuto={deleteAutoInv} />}
      {activeTab==='b2cs' && <B2CSSection autoRows={autoB2CS} filing={filing} onChange={handleChange} />}
      {activeTab==='exp'  && <EXPSection autoRows={autoEXP} filing={filing} onChange={handleChange} onDeleteAuto={deleteAutoInv} />}
      {activeTab==='cdnr' && <CDNRSection autoRows={autoCDNR} filing={filing} onChange={handleChange} onDeleteAuto={deleteAutoInv} />}
      {activeTab==='cdnur'&& <CDNURPanel autoRows={autoCDNUR} filing={filing} onChange={handleChange} onDeleteAuto={deleteAutoInv} />}
      {activeTab==='nil'  && <NILSection filing={filing} onChange={handleChange} />}
      {activeTab==='at'   && <ATTXPDSection section="at"   filing={filing} onChange={handleChange} />}
      {activeTab==='txpd' && <ATTXPDSection section="txpd" filing={filing} onChange={handleChange} />}
      {activeTab==='hsn'  && <HSNSection autoRows={autoHSN} filing={filing} onChange={handleChange} />}
      {activeTab==='doc'  && <DocSection filing={filing} onChange={handleChange} allInvoices={allInvoices} />}

      {validationErrors !== null && <ValidationModal errors={validationErrors} onClose={()=>setValidationErrors(null)} />}
    </div>
  );
}

// ── CDNUR panel (inline, to avoid re-declaring type) ─────────────────────────

function CDNURPanel({ autoRows, filing, onChange, onDeleteAuto }: { autoRows: CDNURNote[]; filing:GSTR1Filing; onChange:(f:GSTR1Filing)=>void; onDeleteAuto:(id:string)=>void }) {
  type N = CDNURNote;
  const [adding, setAdding] = useState(false);
  const blk = (): N => ({ id:uid(), ntty:'C', typ:'B2CL', ntnum:'', ntdt:'', val:0, pos:'27', itms:[{num:1,itm_det:{rt:18,txval:0}}] });
  const [d, setD] = useState<N>(blk());
  const add = () => { onChange({...filing,cdnur:[...filing.cdnur,d]}); setD(blk()); setAdding(false); };
  const del = (id:string) => onChange({...filing,cdnur:filing.cdnur.filter(r=>r.id!==id)});
  const allRows = [...autoRows, ...filing.cdnur];
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr><Th ch="UR Type" /><Th ch="Note No." /><Th ch="Note Date" /><Th ch="Note Type" /><Th ch="Place of Supply" /><Th ch="Note Value" right /><Th ch="Rate%" /><Th ch="Taxable" right /><Th ch="IGST" right /><Th /></tr></thead>
          <tbody>
            {autoRows.map(r=>(
              <tr key={r.id} className="bg-blue-50/30 hover:bg-blue-50/60">
                <Td dim>{r.typ}</Td><Td><div className="flex items-center gap-1"><BooksBadge />{r.ntnum}</div></Td><Td dim>{r.ntdt}</Td>
                <Td><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.ntty==='C'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.ntty==='C'?'Credit':'Debit'}</span></Td>
                <Td dim>{STATE_CODES[r.pos]||r.pos}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td dim>{r.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.itms[0]?.itm_det.txval??0)}</Td>
                <Td right mono>{r.itms[0]?.itm_det.iamt?formatIndianCurrency(r.itms[0].itm_det.iamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>{ if(window.confirm('Delete this auto-imported credit/debit note? Journal entries are not affected.')) onDeleteAuto(r.id); }} /></td>
              </tr>
            ))}
            {filing.cdnur.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <Td dim>{r.typ}</Td><Td>{r.ntnum}</Td><Td dim>{r.ntdt}</Td>
                <Td><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.ntty==='C'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.ntty==='C'?'Credit':'Debit'}</span></Td>
                <Td dim>{STATE_CODES[r.pos]||r.pos}</Td>
                <Td right mono>{formatIndianCurrency(r.val)}</Td>
                <Td dim>{r.itms[0]?.itm_det.rt}%</Td>
                <Td right mono>{formatIndianCurrency(r.itms[0]?.itm_det.txval??0)}</Td>
                <Td right mono>{r.itms[0]?.itm_det.iamt?formatIndianCurrency(r.itms[0].itm_det.iamt):'—'}</Td>
                <td className="px-2 border-b border-gray-100"><DelBtn onClick={()=>del(r.id)} /></td>
              </tr>
            ))}
            {allRows.length===0&&<tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">No credit/debit notes to unregistered persons</td></tr>}
          </tbody>
        </table>
      </div>
      {!adding&&<button type="button" onClick={()=>setAdding(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add note</button>}
      {adding&&(
        <AddPanel onClose={()=>setAdding(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="UR Type"><Sel value={d.typ} onChange={v=>setD({...d,typ:v as N['typ']})} options={[{value:'B2CL',label:'B2CL'},{value:'EXPWP',label:'EXPWP'},{value:'EXPWOP',label:'EXPWOP'}]} /></F>
            <F label="Note Type"><Sel value={d.ntty} onChange={v=>setD({...d,ntty:v as 'C'|'D'})} options={[{value:'C',label:'C – Credit'},{value:'D',label:'D – Debit'}]} /></F>
            <F label="Note No."><Inp value={d.ntnum} onChange={v=>setD({...d,ntnum:v})} placeholder="CN-001" /></F>
            <F label="Note Date"><DatePicker value={d.ntdt} onChange={v=>setD({...d,ntdt:v})} /></F>
            <F label="Place of Supply"><Sel value={d.pos} onChange={v=>setD({...d,pos:v})} options={STATE_OPTS} /></F>
            <F label="Note Value (₹)"><Inp value={d.val||''} onChange={v=>setD({...d,val:parseFloat(v)||0})} className="text-right" /></F>
            <F label="Rate (%)"><Sel value={String(d.itms[0]?.itm_det.rt??18)} onChange={v=>setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,rt:parseFloat(v)}}]})} options={RATE_OPTS} /></F>
            <F label="Taxable Value (₹)"><Inp value={d.itms[0]?.itm_det.txval||''} onChange={v=>setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,txval:parseFloat(v)||0}}]})} className="text-right" /></F>
            <F label="IGST (₹)"><Inp value={d.itms[0]?.itm_det.iamt||''} onChange={v=>setD({...d,itms:[{num:1,itm_det:{...d.itms[0].itm_det,iamt:parseFloat(v)||undefined}}]})} className="text-right" /></F>
          </div>
          <AddBtns onSave={add} onClear={()=>setD(blk())} />
        </AddPanel>
      )}
    </div>
  );
}
