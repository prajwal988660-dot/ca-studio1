-- ============================================================================
-- CA Studio — 0006_gstr1.sql
-- GSTR-1 filings mirror for the offline-first localStorage store.
--
-- Mirrors the store in src/lib/gstr1/gstr1Db.ts (STORAGE_KEY = 'gstr1_filings_v1'),
-- which persists rows of the TS `GSTR1Filing` interface. Each filing uses a
-- COMPOSITE app id `${companyId}_${period}` (one filing per company+period), so
-- the primary key `id` is TEXT (not a uuid). The whole filing payload (the many
-- section arrays: b2b, b2cl, b2cs, exp, cdnr, …, plus rcm_overrides) is stored as
-- a single JSONB `data` blob; `period` is denormalised as a scalar for filtering.
--
-- Follows the 0001_core.sql / 0002_gst_invoices.sql conventions exactly:
--   • id is TEXT (app-generated composite string id, not a uuid)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • updated_at bumped by the existing public.set_updated_at() trigger
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ── gstr1_filings ────────────────────────────────────────────────────────────
-- One row per company+period filing (id = `${companyId}_${period}`).
create table if not exists public.gstr1_filings (
  id          text primary key,               -- app composite id `${companyId}_${period}`
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null,                  -- denormalised, set by trigger
  period      text not null default '',       -- filing period (denormalised scalar)
  data        jsonb not null default '{}'::jsonb, -- full GSTR1Filing payload
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists gstr1_filings_company_idx
  on public.gstr1_filings (company_id);
create index if not exists gstr1_filings_company_period_idx
  on public.gstr1_filings (company_id, period);

-- ── triggers ─────────────────────────────────────────────────────────────────
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated), using
-- the existing function from 0001_core.sql.
drop trigger if exists a_gstr1_filings_set_user_id on public.gstr1_filings;
create trigger a_gstr1_filings_set_user_id
  before insert or update on public.gstr1_filings
  for each row execute function public.set_child_user_id();

-- Bump updated_at on every UPDATE (reuse the existing 0001 function).
drop trigger if exists gstr1_filings_set_updated_at on public.gstr1_filings;
create trigger gstr1_filings_set_updated_at
  before update on public.gstr1_filings
  for each row execute function public.set_updated_at();

-- ── row level security ───────────────────────────────────────────────────────
alter table public.gstr1_filings enable row level security;

drop policy if exists gstr1_filings_all on public.gstr1_filings;
create policy gstr1_filings_all on public.gstr1_filings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0006_gstr1.sql
-- ============================================================================
