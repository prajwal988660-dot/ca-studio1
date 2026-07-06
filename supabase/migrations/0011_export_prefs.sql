-- ============================================================================
-- CA Studio — 0011_export_prefs.sql
-- Per-company export preferences mirror for the offline-first localStorage store.
--
-- Mirrors the store written in
--   src/app/company/[id]/settings/page.tsx
--   (EXPORT_PREFS_KEY = 'ca_export_prefs_' + companyId)
-- which persists ONE blob per company: { exportFormat, showJECodes, companyLogo }.
--
-- Modelled as one row per company: id == company_id == the companyId, so an
-- upsert-by-id keeps exactly one row per company. All fields are scalar and are
-- promoted to their own columns (no jsonb blob needed).
--
-- Follows the 0001_core.sql conventions:
--   • id is TEXT and equals the companyId (uuid-format string coerces cleanly)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • index on (company_id)
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLE
-- ============================================================================

-- ── export_prefs (one blob per company) ──────────────────────────────────────
create table if not exists public.export_prefs (
  id            text primary key,               -- == companyId (one row/company)
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid not null,                  -- denormalised, set by trigger
  export_format text not null default 'pdf'
                  check (export_format in ('pdf','excel','csv')),
  show_je_codes boolean not null default false,
  company_logo  text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists export_prefs_company_idx
  on public.export_prefs (company_id);

-- ============================================================================
-- 2. TRIGGER — denormalised user_id stamping (reuses set_child_user_id)
-- ============================================================================

drop trigger if exists a_export_prefs_set_user_id on public.export_prefs;
create trigger a_export_prefs_set_user_id
  before insert or update on public.export_prefs
  for each row execute function public.set_child_user_id();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.export_prefs enable row level security;

drop policy if exists export_prefs_all on public.export_prefs;
create policy export_prefs_all on public.export_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0011_export_prefs.sql
-- ============================================================================
