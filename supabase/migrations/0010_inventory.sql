-- ============================================================================
-- CA Studio — 0010_inventory.sql
-- Inventory production-issue mirror for the offline-first localStorage store.
--
-- Mirrors the store in
--   src/lib/accounting/inventoryEngine.ts  (PRODUCTION_KEY = 'inv_production_issues')
-- which persists a single GLOBAL array of the TS `ProductionIssue` interface,
-- filtered by companyId at read time. Each element becomes one row here.
--
-- Follows the 0001_core.sql / 0003_bank_import.sql conventions exactly:
--   • id is TEXT (app generates string ids like `PI-<ts>-<rand>`, not uuids)
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

-- ── inventory_production_issues ──────────────────────────────────────────────
-- Mirrors the TS `ProductionIssue` interface: one row per material issued to
-- production. All fields are scalar (no nested objects/arrays -> no jsonb).
create table if not exists public.inventory_production_issues (
  id          text primary key,                 -- app-generated string id (PI-…)
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null,                    -- denormalised, set by trigger
  date        date not null,
  item_name   text not null default '',
  item_hsn    text not null default '',
  qty         numeric not null default 0,
  rate        numeric not null default 0,
  value       numeric not null default 0,
  narration   text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists inventory_production_issues_company_idx
  on public.inventory_production_issues (company_id);

-- ============================================================================
-- 2. TRIGGER — denormalised user_id stamping (reuses set_child_user_id)
-- ============================================================================
-- Prefixed "a_" so it sorts/fires first (before the RLS WITH CHECK is evaluated),
-- exactly like the child-table triggers in 0001_core.sql.

drop trigger if exists a_inventory_production_issues_set_user_id on public.inventory_production_issues;
create trigger a_inventory_production_issues_set_user_id
  before insert or update on public.inventory_production_issues
  for each row execute function public.set_child_user_id();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.inventory_production_issues enable row level security;

drop policy if exists inventory_production_issues_all on public.inventory_production_issues;
create policy inventory_production_issues_all on public.inventory_production_issues
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0010_inventory.sql
-- ============================================================================
