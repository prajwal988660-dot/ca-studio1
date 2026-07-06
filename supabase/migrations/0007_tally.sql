-- ============================================================================
-- CA Studio — 0007_tally.sql
-- Tally import dataset mirror for the offline-first localStorage store.
--
-- Mirrors the store in src/lib/tally/tallyParser.ts, which keeps ONE parsed
-- `TallyDataset` blob per company under the key `tally_import_<companyId>`.
-- Modelled as a single-blob-per-company table: the primary key `id` IS the
-- companyId (so upsert-by-id = exactly one row per company), `company_id` is the
-- same value, and the entire dataset (fileName, importedAt, groups[], ledgers[],
-- vouchers[], minDate, maxDate) is stored as one JSONB `data` blob.
--
-- Follows the 0001_core.sql conventions exactly:
--   • id is TEXT (here the companyId string; uuid-format coerces cleanly)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ── tally_datasets ───────────────────────────────────────────────────────────
-- One row per company (id = company_id = companyId). Upsert-by-id keeps a single
-- current dataset per company, matching the localStorage one-blob-per-company key.
create table if not exists public.tally_datasets (
  id          text primary key,               -- = the companyId (one row per company)
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null,                  -- denormalised, set by trigger
  data        jsonb not null default '{}'::jsonb -- full TallyDataset blob
);
create index if not exists tally_datasets_company_idx
  on public.tally_datasets (company_id);

-- ── triggers ─────────────────────────────────────────────────────────────────
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated), using
-- the existing function from 0001_core.sql.
drop trigger if exists a_tally_datasets_set_user_id on public.tally_datasets;
create trigger a_tally_datasets_set_user_id
  before insert or update on public.tally_datasets
  for each row execute function public.set_child_user_id();

-- ── row level security ───────────────────────────────────────────────────────
alter table public.tally_datasets enable row level security;

drop policy if exists tally_datasets_all on public.tally_datasets;
create policy tally_datasets_all on public.tally_datasets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0007_tally.sql
-- ============================================================================
