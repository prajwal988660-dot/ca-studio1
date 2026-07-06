-- ============================================================================
-- CA Studio — 0009_contingent.sql
-- Contingent liabilities / contingent assets mirror (AS 29) for the
-- offline-first localStorage store.
--
-- Mirrors the store in
--   src/lib/contingentLiabilitiesStore.ts  (key prefix 'ca_contingent_<companyId>')
-- which persists an array of the TS `ContingentItem` interface:
--   { id, type: 'liability'|'asset', description, amount, category?, asAtDate? }.
-- One row per item. All fields are scalars, so they are modelled as columns
-- (no jsonb needed). The camelCase `asAtDate` maps to the `as_at_date` column;
-- the dual-write performs that key mapping.
--
-- Follows the 0001_core.sql / 0003_bank_import.sql conventions exactly:
--   • id is TEXT (app generates string ids via crypto.randomUUID(), not uuids)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--
-- NOTE: the ContingentItem record has no company_id (it is scoped by the
-- localStorage key), so the dual-write adds company_id to the mirrored row.
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ── contingent_items ─────────────────────────────────────────────────────────
create table if not exists public.contingent_items (
  id          text primary key,                -- app-generated string id
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null,                   -- denormalised, set by trigger
  type        text not null default 'liability'
                check (type in ('liability', 'asset')),
  description text not null default '',
  amount      numeric not null default 0,
  category    text,                            -- optional (nullable)
  as_at_date  text,                            -- optional ISO date (ContingentItem.asAtDate)
  created_at  timestamptz not null default now()
);
create index if not exists contingent_items_company_idx
  on public.contingent_items (company_id);

-- ── triggers ─────────────────────────────────────────────────────────────────
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated),
-- reusing the existing function from 0001_core.sql.
drop trigger if exists a_contingent_items_set_user_id on public.contingent_items;
create trigger a_contingent_items_set_user_id
  before insert or update on public.contingent_items
  for each row execute function public.set_child_user_id();

-- ── row level security ───────────────────────────────────────────────────────
alter table public.contingent_items enable row level security;

drop policy if exists contingent_items_all on public.contingent_items;
create policy contingent_items_all on public.contingent_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0009_contingent.sql
-- ============================================================================
