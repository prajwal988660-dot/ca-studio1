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
      const { error } = await supabase!.from(table).upsert(rows, { onConflict: 'id' });
      if (error && import.meta.env.DEV) console.warn(`[cloudSync] upsert ${table} failed:`, error.message);
    } catch (e) { if (import.meta.env.DEV) console.warn(`[cloudSync] upsert ${table} threw:`, e); }
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

/**
 * Pull the user's cloud rows and MERGE them into localStorage (union by id).
 * Non-destructive: local-only rows survive (they are pushed up separately by
 * pushLocalToCloud). For a row that exists both locally and in the cloud, the
 * newer `updated_at` wins; rows without an `updated_at` (book_periods,
 * custom_accounts) keep the local copy. This is what powers multi-device sync:
 * a fresh device (or one that was edited offline elsewhere) gains the other
 * device's rows without clobbering its own unsynced work.
 */
export async function mergeCloudIntoLocal(): Promise<{ ok: boolean; merged?: number; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  if (!(await currentUserId())) return { ok: false, error: 'Not signed in' };

  const local: Record<string, Row[]> =
    readLocalDb() ?? { companies: [], journal_entries: [], book_periods: [], entity_data: [], custom_accounts: [] };

  let merged = 0;
  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) return { ok: false, error: `${table}: ${error.message}` };

    const byId = new Map<string, Row>();
    for (const r of local[table] ?? []) byId.set(String(r.id), r);

    for (const cloudRow of (data as Row[]) ?? []) {
      const id = String(cloudRow.id);
      const existing = byId.get(id);
      if (!existing) { byId.set(id, cloudRow); merged++; continue; }
      const localTs = existing.updated_at ? Date.parse(String(existing.updated_at)) : 0;
      const cloudTs = cloudRow.updated_at ? Date.parse(String(cloudRow.updated_at)) : 0;
      if (cloudTs > localTs) { byId.set(id, cloudRow); merged++; }
    }
    local[table] = Array.from(byId.values());
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(OFFLINE_DB_STORAGE_KEY, JSON.stringify(local));
  }
  return { ok: true, merged };
}

/**
 * Full sign-in reconciliation: seed the cloud with this device's local rows,
 * then merge the cloud (including rows created on other devices) back down.
 * Best-effort and safe to call repeatedly; a no-op when offline / not signed in.
 * Callers should await this before routing into the app so the first render
 * already reflects the merged data.
 */
export async function syncOnSignIn(): Promise<void> {
  if (!supabase) return;
  try {
    const r = await pushLocalToCloud();
    if (!r.ok && import.meta.env.DEV) console.warn('[cloudSync] push failed:', r.error);
  } catch (e) { if (import.meta.env.DEV) console.warn('[cloudSync] push threw:', e); }
  try { await mergeCloudIntoLocal(); } catch (e) { if (import.meta.env.DEV) console.warn('[cloudSync] merge threw:', e); }
}
