// ============================================================================
// Cloud sync — optional Supabase mirror behind the offline-first localStorage DB.
//
// Design: localStorage (offlineDb.ts) stays the authoritative, synchronous store.
// These helpers *best-effort mirror* each mutation to Supabase WITHOUT changing
// offlineDb's synchronous signatures — they are fire-and-forget (never awaited,
// never throw). When Supabase isn't configured, or the user isn't signed in,
// every function is a silent no-op, so the app runs fully offline exactly as
// before. Activation = set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY and sign in.
// ============================================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { OFFLINE_DB_STORAGE_KEY } from '@/lib/offlineDb';

type Row = Record<string, unknown>;

/** Tables that live in the core offline DB blob, in FK-safe push order. */
export const SYNCED_TABLES = ['companies', 'book_periods', 'journal_entries', 'custom_accounts', 'entity_data'] as const;

/** True when Supabase env is present (schema *can* be used). */
export function isCloudConfigured(): boolean {
  return isSupabaseConfigured && !!supabase;
}

// ── current auth user (cached; refreshed on auth state change) ───────────────
let cachedUserId: string | null = null;
let authWired = false;

function wireAuthOnce() {
  if (authWired || !supabase) return;
  authWired = true;
  try {
    supabase.auth.onAuthStateChange((_evt, session) => { cachedUserId = session?.user?.id ?? null; });
  } catch { /* ignore */ }
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  wireAuthOnce();
  if (cachedUserId) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
    return cachedUserId;
  } catch {
    return null;
  }
}

// ── fire-and-forget mirror ops (never block, never throw) ────────────────────

/** Upsert one or many rows; stamps user_id for RLS. No-op when offline/logged out.
 *  Accepts any record shape (concrete Company/JournalEntry/etc.). */
export function mirrorUpsert(table: string, rowOrRows: Record<string, unknown> | Record<string, unknown>[] | unknown): void {
  if (!supabase) return;
  void (async () => {
    try {
      const uid = await currentUserId();
      if (!uid) return;
      const list = (Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]) as Record<string, unknown>[];
      const rows = list.map((r) => ({ ...r, user_id: uid }));
      if (!rows.length) return;
      await supabase!.from(table).upsert(rows, { onConflict: 'id' });
    } catch { /* best-effort mirror */ }
  })();
}

/** Delete one or many rows by id. Child rows cascade via FK when a company is deleted. */
export function mirrorDelete(table: string, idOrIds: string | string[]): void {
  if (!supabase) return;
  void (async () => {
    try {
      if (!(await currentUserId())) return;
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      if (!ids.length) return;
      await supabase!.from(table).delete().in('id', ids);
    } catch { /* best-effort */ }
  })();
}

/** Delete every row of a table for one company (e.g. delete-all journal entries). */
export function mirrorDeleteByCompany(table: string, companyId: string): void {
  if (!supabase) return;
  void (async () => {
    try {
      if (!(await currentUserId())) return;
      await supabase!.from(table).delete().eq('company_id', companyId);
    } catch { /* best-effort */ }
  })();
}

// ── one-time bulk migration (push) + fresh-device hydrate (pull) ─────────────

function readLocalDb(): Record<string, Row[]> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(OFFLINE_DB_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Push the whole local DB to the cloud (first sign-in migration). */
export async function pushLocalToCloud(): Promise<{ ok: boolean; pushed?: number; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Not signed in' };
  const db = readLocalDb();
  if (!db) return { ok: true, pushed: 0 };

  let pushed = 0;
  for (const table of SYNCED_TABLES) {
    const rows = (db[table] ?? []).map((r) => ({ ...r, user_id: uid }));
    if (!rows.length) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) return { ok: false, error: `${table}: ${error.message}` };
    pushed += rows.length;
  }
  return { ok: true, pushed };
}

/** Pull the user's cloud rows into localStorage (seed a fresh device). Overwrites the local blob. */
export async function pullCloudToLocal(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  if (!(await currentUserId())) return { ok: false, error: 'Not signed in' };

  const blob: Record<string, Row[]> = { companies: [], journal_entries: [], book_periods: [], entity_data: [], custom_accounts: [] };
  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) return { ok: false, error: `${table}: ${error.message}` };
    blob[table] = (data as Row[]) ?? [];
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(OFFLINE_DB_STORAGE_KEY, JSON.stringify(blob));
  }
  return { ok: true };
}
