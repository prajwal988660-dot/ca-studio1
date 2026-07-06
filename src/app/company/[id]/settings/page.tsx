'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { getEntityConfig } from '@/lib/entityConfig';
import { getEntityData, upsertEntityData, getCustomAccounts, deleteCustomAccount, renameCustomAccount, updateAccountGroupInAllEntries } from '@/lib/offlineDb';
import { mirrorUpsert } from '@/lib/sync/cloudSync';
import { LEDGER_GROUPS, getAllDefaultAccounts } from '@/lib/coa';
import type { PrimaryGroup } from '@/lib/coa';
import type { CustomAccount } from '@/lib/offlineDb';
import type { EntityType, EntityDetails } from '@/types/company';
import { 
  Settings, 
  Calendar, 
  Table, 
  Lock, 
  Printer, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Search, 
  Info, 
  AlertTriangle, 
  AlertCircle,
  FileText,
  FileCheck,
  BarChart3,
  BookOpen
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

type Tab = 'general' | 'financial-year' | 'chart-of-accounts' | 'book-closing' | 'export' | 'ai-rules';

// ── COA Tab ──────────────────────────────────────────────────────────────────

const PG_ORDER: PrimaryGroup[] = ['Capital & Liabilities', 'Assets', 'Income', 'Expenses'];

function EditGroupDialog({ accountName, companyId, onClose }: { accountName: string; companyId: string; onClose: () => void }) {
  const [activePG, setActivePG] = useState<PrimaryGroup>('Assets');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const handleSave = () => {
    const g = LEDGER_GROUPS.find(x => x.id === selectedGroupId);
    if (!g) return;
    updateAccountGroupInAllEntries(companyId, accountName, g.scheduleIII, g.nature);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Edit Account Group</p>
            <p className="text-base font-black text-slate-900 mt-0.5 truncate max-w-sm">{accountName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex gap-2 flex-wrap mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {PG_ORDER.map(pg => (
              <button key={pg} type="button" onClick={() => { setActivePG(pg); setSelectedGroupId(''); }}
                className={`h-8 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${activePG === pg ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}>
                {pg}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {LEDGER_GROUPS.filter(g => g.primaryGroup === activePG).map(group => (
              <button key={group.id} type="button" onClick={() => setSelectedGroupId(group.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group/item
                  ${selectedGroupId === group.id 
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm shadow-blue-500/10' 
                    : 'border-slate-100 bg-slate-50/30 hover:border-blue-300 hover:bg-blue-50/10'}`}>
                {selectedGroupId === group.id && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 rounded-bl-full" />}
                <p className={`text-xs font-bold transition-colors ${selectedGroupId === group.id ? 'text-blue-900' : 'text-slate-700'}`}>{group.label}</p>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-snug group-hover/item:text-slate-550">{group.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="flex-1 h-11 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
          <button onClick={handleSave} disabled={!selectedGroupId} className="flex-1 h-11 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-md shadow-blue-500/10">Save Group</button>
        </div>
      </div>
    </div>
  );
}

function COATab({ companyId }: { companyId: string }) {
  const [custom, setCustom] = useState<CustomAccount[]>([]);
  const [tick, setTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [editGroupFor, setEditGroupFor] = useState<string | null>(null); // account name
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; acc: CustomAccount } | null>(null);
  const [defSearch, setDefSearch] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustom(getCustomAccounts(companyId));
  }, [companyId, tick]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  // close ctx menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [ctxMenu]);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const deleteSelected = () => {
    if (!window.confirm(`Delete ${selectedIds.size} account(s)? This only removes them from the registry — journal entries are unaffected.`)) return;
    selectedIds.forEach(id => deleteCustomAccount(companyId, id));
    setSelectedIds(new Set());
    setTick(t => t + 1);
  };

  const startRename = (acc: CustomAccount) => {
    setRenamingId(acc.id);
    setRenameVal(acc.name);
    setCtxMenu(null);
  };

  const commitRename = () => {
    if (!renamingId || !renameVal.trim()) { setRenamingId(null); return; }
    renameCustomAccount(companyId, renamingId, renameVal.trim());
    setRenamingId(null);
    setTick(t => t + 1);
  };

  const defaultAccounts = getAllDefaultAccounts();
  const filteredDefaults = defSearch
    ? defaultAccounts.filter(d => d.name.toLowerCase().includes(defSearch.toLowerCase()) || d.group.label.toLowerCase().includes(defSearch.toLowerCase()))
    : defaultAccounts;

  const allCustomSelected = custom.length > 0 && custom.every(a => selectedIds.has(a.id));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* Custom Accounts Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm shadow-slate-200/50 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
        
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Custom Created Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Accounts created via dynamic journal entries or migration scripts.</p>
          </div>
          {selectedIds.size > 0 && (
            <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-650 border border-red-200 rounded-xl bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
              <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size} Selected
            </button>
          )}
        </div>

        {custom.length === 0 ? (
          <div className="border border-dashed border-slate-200/85 rounded-2xl px-5 py-10 text-center text-xs text-slate-400">
            <Table className="h-8 w-8 text-slate-350 mx-auto mb-2.5" />
            No custom accounts created yet. Custom accounts appear when you create new ledgers in journal entries.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" checked={allCustomSelected} onChange={() => {
                      if (allCustomSelected) setSelectedIds(new Set());
                      else setSelectedIds(new Set(custom.map(a => a.id)));
                    }} className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
                  </th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Account Name</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Group</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Nature</th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                {custom.map(acc => (
                  <tr key={acc.id}
                    className={`hover:bg-blue-50/30 transition-colors ${selectedIds.has(acc.id) ? 'bg-blue-50/20' : ''}`}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, acc }); }}
                  >
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={selectedIds.has(acc.id)} onChange={() => toggleSelect(acc.id)} className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {renamingId === acc.id ? (
                        <input
                          ref={renameRef}
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                          className="h-8 w-full rounded-lg border border-blue-400 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="cursor-pointer hover:text-blue-600 hover:underline" onDoubleClick={() => startRename(acc)}>{acc.name}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{acc.account_group || '—'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold capitalize shadow-sm border
                        ${acc.nature === 'asset' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                          acc.nature === 'liability' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                          acc.nature === 'income' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                          'bg-amber-50 border-amber-100 text-amber-700'}`}>
                        {acc.nature || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => startRename(acc)} className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50/50 transition-colors">Rename</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-start gap-1.5 mt-3 text-[10.5px] text-slate-400">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span>Double-click any account name to rename inline. Right-click any row to open the context menu and edit the group mapping.</span>
        </div>
      </div>

      {/* Default Accounts Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm shadow-slate-200/50 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
        
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900">Default Registry Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Read-only standard ledger library mapping.</p>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={defSearch}
              onChange={e => setDefSearch(e.target.value)}
              placeholder="Search registry..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Account Name</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Schedule III Group</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Primary Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
              {filteredDefaults.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-3 font-bold text-slate-800">{d.name}</td>
                  <td className="p-3 text-slate-500 font-medium">{d.group.label}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border shadow-sm
                      ${d.group.primaryGroup === 'Assets' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        d.group.primaryGroup === 'Capital & Liabilities' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                        d.group.primaryGroup === 'Income' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                        'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      {d.group.primaryGroup}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDefaults.length === 0 && (
                <tr><td colSpan={3} className="p-5 text-center text-slate-400">No registry accounts match your search query.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context menu for custom account */}
      {ctxMenu && (
        <div
          className="fixed z-[90] bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-slate-100 mb-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[160px]">{ctxMenu.acc.name}</p>
          </div>
          <button className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50/50 hover:text-blue-700 font-bold transition-colors flex items-center gap-2.5"
            onClick={() => { startRename(ctxMenu.acc); setCtxMenu(null); }}>
            <svg className="h-4 w-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
            Rename Account
          </button>
          <button className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50/50 hover:text-blue-700 font-bold transition-colors flex items-center gap-2.5"
            onClick={() => { setEditGroupFor(ctxMenu.acc.name); setCtxMenu(null); }}>
            <svg className="h-4 w-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
            Edit Group Mapping
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button className="w-full text-left px-4 py-2.5 text-xs text-red-650 hover:bg-red-50 hover:text-red-700 font-bold transition-colors flex items-center gap-2.5"
            onClick={() => {
              if (window.confirm(`Delete "${ctxMenu.acc.name}" from the registry? Journal entries are unaffected.`)) {
                deleteCustomAccount(companyId, ctxMenu.acc.id);
                setTick(t => t + 1);
              }
              setCtxMenu(null);
            }}>
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      )}

      {editGroupFor && (
        <EditGroupDialog accountName={editGroupFor} companyId={companyId} onClose={() => { setEditGroupFor(null); setTick(t => t + 1); }} />
      )}
    </div>
  );
}

// ─── Shared field components ──────────────────────────────────────────────────
const Field = ({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-[10.5px] mt-1.5 font-medium flex items-center gap-1"><LucideIcons.AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

const inp = "w-full h-11 px-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 shadow-sm shadow-slate-100/50";

export default function SettingsPage() {
  const { company, companyId, loading: companyLoading, updateCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General settings state
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [disclosureLevel, setDisclosureLevel] = useState<'I' | 'II' | 'III' | 'IV' | ''>('');

  // Financial Year
  const [fyStartMonth, setFyStartMonth] = useState('4'); // April

  // Book Closing
  const [closingDate, setClosingDate] = useState('');
  const [closingNarration, setClosingNarration] = useState('Being closing entries for the financial year');

  // Export preferences
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [showJECodes, setShowJECodes] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [exportSaveStatus, setExportSaveStatus] = useState<'idle' | 'saved'>('idle');

  // AI Rules
  const [aiRules, setAiRules] = useState('');
  const [aiRulesSaveStatus, setAiRulesSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize form from company once when company loads
  useEffect(() => {
    if (!company) return;
    setCompanyName(company.name);
    setAddress(company.entity_details?.address || '');
    setPan(company.entity_details?.pan || '');
    setGstin(company.gst_details?.gstin || '');
    const level = (company.entity_details as { disclosureLevel?: 'I' | 'II' | 'III' | 'IV' } | undefined)?.disclosureLevel;
    setDisclosureLevel(level || '');
  }, [company?.id]);

  const handleSaveGeneral = useCallback(async () => {
    if (!companyId || !company) return;
    setSaveStatus('saving');
    try {
      const entityDetails: EntityDetails = {
        ...company.entity_details,
        address: address || undefined,
        pan: pan || undefined,
        ...(disclosureLevel ? { disclosureLevel: disclosureLevel as 'I' | 'II' | 'III' | 'IV' } : {}),
      };
      await updateCompany({
        name: companyName.trim() || company.name,
        entity_details: entityDetails,
        gst_details: { ...company.gst_details, gstin: gstin.trim() || undefined },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [companyId, company, companyName, address, pan, gstin, disclosureLevel, updateCompany]);

  const EXPORT_PREFS_KEY = 'ca_export_prefs_';
  useEffect(() => {
    if (!companyId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(EXPORT_PREFS_KEY + companyId);
      if (raw) {
        const p = JSON.parse(raw) as { exportFormat?: string; showJECodes?: boolean; companyLogo?: string };
        if (p.exportFormat && ['pdf', 'excel', 'csv'].includes(p.exportFormat)) setExportFormat(p.exportFormat as 'pdf' | 'excel' | 'csv');
        if (typeof p.showJECodes === 'boolean') setShowJECodes(p.showJECodes);
        if (typeof p.companyLogo === 'string') setCompanyLogo(p.companyLogo);
      }
    } catch {
      // ignore
    }
  }, [companyId]);

  // Load AI Rules
  useEffect(() => {
    if (!companyId) return;
    try {
      const record = getEntityData(companyId, 'settings', 'ai_rules');
      if (record) {
        const data = record.data as { rules?: string };
        setAiRules(data?.rules || '');
      }
    } catch { /* ignore */ }
  }, [companyId]);

  const handleSaveAiRules = useCallback(() => {
    if (!companyId) return;
    setAiRulesSaveStatus('saving');
    try {
      upsertEntityData(companyId, 'settings', 'ai_rules', { rules: aiRules });
      setAiRulesSaveStatus('saved');
      setTimeout(() => setAiRulesSaveStatus('idle'), 2000);
    } catch {
      setAiRulesSaveStatus('error');
      setTimeout(() => setAiRulesSaveStatus('idle'), 3000);
    }
  }, [companyId, aiRules]);

  const handleSaveExportPrefs = useCallback(() => {
    if (!companyId || typeof window === 'undefined') return;
    try {
      localStorage.setItem(EXPORT_PREFS_KEY + companyId, JSON.stringify({ exportFormat, showJECodes, companyLogo }));
      setExportSaveStatus('saved');
      setTimeout(() => setExportSaveStatus('idle'), 2000);
    } catch {
      // ignore
    }
    // Fire-and-forget cloud mirror (one blob row per company; never throws, no-op offline/logged-out).
    try {
      mirrorUpsert('export_prefs', {
        id: companyId,
        company_id: companyId,
        export_format: exportFormat,
        show_je_codes: showJECodes,
        company_logo: companyLogo,
      });
    } catch { /* best-effort mirror */ }
  }, [companyId, exportFormat, showJECodes, companyLogo]);

  if (companyLoading || !company) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const entityConfig = getEntityConfig(company.entity_type);
  const showDisclosureLevel = entityConfig?.nav?.relatedPartyByLevel === true;

  const tabs: { key: Tab; label: string; icon: string; isLocked?: boolean }[] = [
    { key: 'general', label: 'General', icon: 'Settings' },
    { key: 'financial-year', label: 'Financial Year', icon: 'Calendar' },
    { key: 'chart-of-accounts', label: 'Chart of Accounts', icon: 'Table' },
    { key: 'book-closing', label: 'Book Closing', icon: 'FolderClosed', isLocked: true },
    { key: 'export', label: 'Export & Print', icon: 'Printer' },
    { key: 'ai-rules', label: 'AI Rules', icon: 'Sparkles', isLocked: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={`${entityLabel} — configure parameters, statutory preferences, and ledger registries`} />

      <div className="flex flex-col md:flex-row gap-8 items-start mt-6">
        
        {/* Left Side: Navigation Links */}
        <nav className="w-full md:w-64 shrink-0 space-y-2.5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm shadow-slate-100/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1.5 mb-3">Settings Categories</p>
          {tabs.map(tab => {
            const Icon = (LucideIcons as any)[tab.icon] || Settings;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} 
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group text-left
                  ${active 
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-bold shadow-sm ring-1 ring-blue-100/50' 
                    : 'border-transparent hover:border-slate-200 bg-white hover:bg-slate-50/50 text-slate-600 hover:text-slate-800'}`}>
                {active && <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-bl-full -z-10" />}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-blue-600 text-white shadow-inner shadow-black/10' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                  <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2 : 1.5} />
                </div>
                <span className="text-sm font-bold pr-6">{tab.label}</span>
                {tab.isLocked && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-350 group-hover:text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Active Settings Panel */}
        <div className="flex-1 w-full">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm shadow-slate-200/50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">General Information</h2>
                  <p className="text-xs text-slate-500">Basic identification parameters and registry configurations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Company / Entity Name">
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={inp} />
                </Field>
                <Field label="Entity Type">
                  <input type="text" value={entityLabel} readOnly className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-450 cursor-not-allowed" />
                </Field>
                <Field label="Address" span2>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="w-full py-3 px-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 transition-all duration-200 focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 shadow-sm shadow-slate-100/50 resize-y" />
                </Field>
                <Field label="PAN">
                  <input type="text" value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} className={`${inp} font-mono uppercase`} />
                </Field>
                <Field label="GSTIN">
                  <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className={`${inp} font-mono uppercase`} />
                </Field>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-150">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Statutory & System Configuration</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'ITR Form', val: entityConfig.itrForm, Icon: FileText },
                    { label: 'Audit Form', val: entityConfig.nav.auditForm, Icon: FileCheck },
                    { label: 'P&L Format', val: entityConfig.nav.profitLossFormat, Icon: BarChart3 },
                    { label: 'BS Format', val: entityConfig.nav.balanceSheetFormat, Icon: BookOpen }
                  ].map(({ label, val, Icon }) => {
                    return (
                      <div key={label} className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-start shadow-sm hover:border-blue-200 hover:bg-blue-50/10 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                        <span className="text-sm font-black text-slate-800 mt-1">{val || '—'}</span>
                      </div>
                    );
                  })}
                </div>
                {showDisclosureLevel && (
                  <div className="mt-6 bg-slate-50/30 border border-slate-200/60 rounded-2xl p-5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">ICAI disclosure level (non-corporate)</label>
                    <select value={disclosureLevel} onChange={e => setDisclosureLevel(e.target.value as any)} className="w-full max-w-sm h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600 focus:bg-white shadow-sm shadow-slate-100/50">
                      <option value="">— Not set —</option>
                      <option value="I">Level I (Turnover &gt; ₹50cr / Borrowings &gt; ₹10cr)</option>
                      <option value="II">Level II</option>
                      <option value="III">Level III</option>
                      <option value="IV">Level IV</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-2">Level I or II enables Related Party, Accounting Policies, and AS Checklist in navigation tabs.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleSaveGeneral}
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center gap-2 h-11 px-7 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:scale-[1.01] transition-all disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? (
                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving changes...</>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
                {saveStatus === 'saved' && <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5 animate-in fade-in duration-300"><Check className="h-4 w-4" /> Changes saved successfully.</span>}
                {saveStatus === 'error' && <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5 animate-in fade-in duration-300"><AlertCircle className="h-4 w-4" /> Failed to save general configurations.</span>}
              </div>
            </div>
          )}

          {/* Financial Year Tab */}
          {activeTab === 'financial-year' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm shadow-slate-200/50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Financial Year Settings</h2>
                  <p className="text-xs text-slate-500">Configure accounting dates, cycles, and standard year ranges.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Financial Year Start Month">
                  <select value={fyStartMonth} onChange={e => setFyStartMonth(e.target.value)} className={inp}>
                    <option value="1">January</option>
                    <option value="4">April (Default India)</option>
                    <option value="7">July</option>
                    <option value="10">October</option>
                  </select>
                </Field>
                <Field label="Current FY Start">
                  <input type="text" value={company.financial_year_start || '—'} readOnly className="w-full h-11 px-3.5 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50 text-slate-450 cursor-not-allowed" />
                </Field>
              </div>

              <div className="bg-blue-50/40 border border-blue-150 rounded-2xl p-5 text-sm text-blue-800 flex items-start gap-3 mt-6">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">India Statutory Format Notice</p>
                  <p className="text-xs text-blue-700/95 mt-1 leading-relaxed">In India, the standard financial year runs from April 1 to March 31. Modifying the start month alters calendar calculations, ledger periods, and tax schedules across all worksheets.</p>
                </div>
              </div>
            </div>
          )}

          {/* Chart of Accounts Tab */}
          {activeTab === 'chart-of-accounts' && companyId && (
            <COATab companyId={companyId} />
          )}

          {/* Book Closing Tab */}
          {activeTab === 'book-closing' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm shadow-slate-200/50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Book Closing & Year-End</h2>
                  <p className="text-xs text-slate-500">Close nominal ledger codes, compute net values, and post reserves.</p>
                </div>
              </div>

              {/* Premium Lock Banner */}
              <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm shadow-slate-100/50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Closing Entries Generation Locked</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Year-end closing journal generation is locked under your organization's current plan. You can view closing parameters below, but automated closure is disabled.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Closing accounts warning</p>
                  <p className="text-xs text-amber-700/95 mt-1 leading-relaxed">Book closing consolidates Nominal Ledger accounts and creates closing entries that transfer net profit/loss into Capital & Reserves. Perform this operation only after validating all ledger and journal entries.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                <Field label="Closing Date">
                  <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} disabled className={`${inp} bg-slate-50 text-slate-400 cursor-not-allowed`} />
                </Field>
                <Field label="Narration Description">
                  <input type="text" value={closingNarration} onChange={e => setClosingNarration(e.target.value)} disabled className={`${inp} bg-slate-50 text-slate-400 cursor-not-allowed`} />
                </Field>
              </div>

              <div className="mt-6 space-y-2 bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Summary of generated transactions</p>
                <ul className="text-xs text-slate-600 space-y-2.5 mt-2 list-none">
                  <li className="flex items-center gap-2 font-medium"><Check className="h-3.5 w-3.5 text-emerald-500" /> Transfer revenue account balances to Trading / P&L Account</li>
                  <li className="flex items-center gap-2 font-medium"><Check className="h-3.5 w-3.5 text-emerald-500" /> Transfer expense account balances to Trading / P&L Account</li>
                  <li className="flex items-center gap-2 font-medium"><Check className="h-3.5 w-3.5 text-emerald-500" /> Transfer final calculated net profit/loss to Capital/Reserves</li>
                  <li className="flex items-center gap-2 font-medium"><Check className="h-3.5 w-3.5 text-emerald-500" /> Reset and lock nominal ledger balances</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
                <button disabled className="inline-flex items-center gap-2 h-11 px-6 text-sm font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed shadow-none">
                  <Lock className="h-4 w-4 shrink-0 text-slate-450" />
                  Generate Closing Entries (Locked)
                </button>
                <button disabled className="inline-flex items-center gap-2 h-11 px-6 text-sm font-bold bg-slate-50 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed shadow-none">
                  <Lock className="h-4 w-4 shrink-0 text-slate-450" />
                  Preview First (Locked)
                </button>
              </div>
            </div>
          )}

          {/* Export & Print Tab */}
          {activeTab === 'export' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm shadow-slate-200/50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Export & Print Preferences</h2>
                  <p className="text-xs text-slate-500">Set layout formats, page branding, and internal column visibility.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Default Export Format</label>
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden w-fit shadow-sm bg-slate-50/50 p-1 gap-1">
                    {(['pdf', 'excel', 'csv'] as const).map(fmt => (
                      <button 
                        key={fmt} 
                        onClick={() => setExportFormat(fmt)} 
                        className={`px-5 py-2 text-xs font-bold rounded-lg uppercase transition-all duration-200
                          ${exportFormat === fmt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Show JE Codes in Exports</label>
                  <div>
                    <button 
                      onClick={() => setShowJECodes(!showJECodes)} 
                      className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all border duration-200
                        ${showJECodes 
                          ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/50' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50'}`}
                    >
                      {showJECodes ? 'Yes (Not Recommended)' : 'No (Recommended)'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2 leading-snug">JE-XXXX IDs are system database keys and shouldn't appear in audits or standard print-outs.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Field label="Company Logo URL (for header documents)">
                  <input type="text" value={companyLogo} onChange={e => setCompanyLogo(e.target.value)} placeholder="https://domain.com/assets/logo.png" className={inp} />
                </Field>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" onClick={handleSaveExportPrefs} className="inline-flex items-center gap-2 h-11 px-7 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:scale-[1.01] transition-all">
                  Save Preferences
                </button>
                {exportSaveStatus === 'saved' && <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5 animate-in fade-in duration-300"><Check className="h-4 w-4" /> Preferences saved.</span>}
              </div>
            </div>
          )}

          {/* AI Rules Tab */}
          {activeTab === 'ai-rules' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm shadow-slate-200/50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">AI Rules for CARP Agent</h2>
                  <p className="text-xs text-slate-500">Inject custom operating directives that the CARP AI agent will respect when posting to this workspace.</p>
                </div>
              </div>

              {/* Premium Lock Banner */}
              <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm shadow-slate-100/50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">CARP AI Configuration Locked</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Custom AI directives configuration is locked under your organization's current plan. You can view the guidelines and examples below, but saving custom rules is disabled.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50/40 border border-blue-150 rounded-2xl p-5 text-sm text-blue-805">
                <p className="font-bold flex items-center gap-1.5 mb-2"><Sparkles className="h-4 w-4 text-blue-600 animate-pulse" /> Custom Directive Examples</p>
                <ul className="text-xs text-blue-700/95 space-y-1 list-disc list-inside leading-relaxed">
                  <li>TDS on professional fees is Section 194J at 10%.</li>
                  <li>Use WDV depreciation method for all computer assets.</li>
                  <li>GST rate for IT service code 998311 is 18%.</li>
                  <li>Always use account "Reserves & Surplus" instead of "Retained Earnings".</li>
                  <li>Partner salary details: Partner A ₹20,000/mo, Partner B ₹15,000/mo.</li>
                </ul>
              </div>

              <div className="mt-6">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Custom AI Directives</label>
                <textarea
                  value={aiRules}
                  onChange={e => setAiRules(e.target.value)}
                  rows={8}
                  disabled
                  placeholder="Enter custom directives here (one per line)..."
                  className="w-full px-4 py-3.5 text-sm border border-slate-200 rounded-2xl bg-slate-50 text-slate-400 cursor-not-allowed font-mono resize-y shadow-inner leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 h-11 px-7 text-sm font-bold bg-slate-150 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed shadow-none"
                >
                  <Lock className="h-4 w-4 shrink-0 text-slate-450" />
                  Save Rules (Locked)
                </button>
                {aiRules && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center h-11 px-5 text-sm font-bold bg-white border border-slate-200 text-slate-450 rounded-xl cursor-not-allowed shadow-none"
                  >
                    <Lock className="h-4 w-4 shrink-0 mr-1.5 text-slate-450" />
                    Clear Rules
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
