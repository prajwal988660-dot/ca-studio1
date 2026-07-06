-- ============================================================================
-- CA Studio — 0008_workspace.sql
-- Workspace files mirror for the offline-first localStorage store.
--
-- Mirrors the CARP workspace store in
--   src/lib/workspaceDb.ts  (key prefix 'carp_workspace_<companyId>')
-- which persists rows of the TS `WorkspaceFile` interface
--   (src/lib/carp/tools/types.ts): { id, name, type, content, created_at, size }.
-- One row per file. `type` is a small closed set in the app
--   ('text' | 'csv' | 'markdown' | 'json') — kept as free TEXT here so future
--   file types never break the best-effort mirror (documented, not constrained).
--
-- Follows the 0001_core.sql / 0003_bank_import.sql conventions exactly:
--   • id is TEXT (app generates string ids via crypto.randomUUID(), not uuids)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • updated_at bumped by the existing public.set_updated_at() trigger
--
-- NOTE: the WorkspaceFile record has no company_id (it is scoped by the
-- localStorage key), so the dual-write adds company_id to the mirrored row.
-- The record's `size` scalar is carried across as-is into the `size` column.
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ── workspace_files ──────────────────────────────────────────────────────────
create table if not exists public.workspace_files (
  id          text primary key,                -- app-generated string id
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null,                   -- denormalised, set by trigger
  name        text not null default '',
  type        text not null default 'text',    -- 'text' | 'csv' | 'markdown' | 'json'
  content     text not null default '',
  size        integer not null default 0,       -- byte size of content
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists workspace_files_company_idx
  on public.workspace_files (company_id);

-- ── triggers ─────────────────────────────────────────────────────────────────
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated),
-- reusing the existing function from 0001_core.sql.
drop trigger if exists a_workspace_files_set_user_id on public.workspace_files;
create trigger a_workspace_files_set_user_id
  before insert or update on public.workspace_files
  for each row execute function public.set_child_user_id();

-- Bump updated_at on every UPDATE (reuse the existing 0001 function).
drop trigger if exists workspace_files_set_updated_at on public.workspace_files;
create trigger workspace_files_set_updated_at
  before update on public.workspace_files
  for each row execute function public.set_updated_at();

-- ── row level security ───────────────────────────────────────────────────────
alter table public.workspace_files enable row level security;

drop policy if exists workspace_files_all on public.workspace_files;
create policy workspace_files_all on public.workspace_files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0008_workspace.sql
-- ============================================================================
