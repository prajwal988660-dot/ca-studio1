import { GSTR1_CONFIG } from './config';
import type { GSTR1Filing } from './types';

function loadAll(): GSTR1Filing[] {
  try {
    return JSON.parse(localStorage.getItem(GSTR1_CONFIG.STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveAll(filings: GSTR1Filing[]) {
  localStorage.setItem(GSTR1_CONFIG.STORAGE_KEY, JSON.stringify(filings));
}

export function getOrCreateFiling(companyId: string, period: string, gstin: string): GSTR1Filing {
  const all = loadAll();
  const id = `${companyId}_${period}`;
  const existing = all.find((f) => f.id === id);
  if (existing) return existing;
  const fresh: GSTR1Filing = {
    id, company_id: companyId, period, gstin, status: 'draft',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    b2b: [], b2cl: [], b2cs: [], exp: [], cdnr: [], cdnur: [],
    nil: [], at: [], txpd: [], hsn: [], doc_issue: [],
    b2ba: [], b2cla: [], b2csa: [], expa: [], cdnra: [], cdnura: [],
    rcm_overrides: {},
  };
  all.push(fresh);
  saveAll(all);
  return fresh;
}

export function saveFiling(filing: GSTR1Filing) {
  const all = loadAll();
  const idx = all.findIndex((f) => f.id === filing.id);
  const updated = { ...filing, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated; else all.push(updated);
  saveAll(all);
}

export function getFiling(companyId: string, period: string): GSTR1Filing | null {
  return loadAll().find((f) => f.id === `${companyId}_${period}`) ?? null;
}

export function listFilings(companyId: string): GSTR1Filing[] {
  return loadAll().filter((f) => f.company_id === companyId);
}
