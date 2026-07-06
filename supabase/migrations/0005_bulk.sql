-- ============================================================================
-- CA Studio — 0005_bulk.sql
-- Bulk Private Limited ledger mirror for the offline-first localStorage store.
--
-- Mirrors the per-company store in
--   src/lib/bulk/bulkDb.ts  (STORAGE_KEY = 'bulk_data_v1')
-- which keeps a Record keyed by companyId, each holding four arrays:
--   ledger_accounts / suspense_transactions / ledger_entries / audit_log
-- (TS shapes: BulkLedgerAccount, SuspenseTransaction, BulkLedgerEntry,
--  BulkAuditLog in src/lib/bulk/types.ts).
--
-- Each array becomes its own child table here. The store uses camelCase field
-- names; the dual-write layer maps them to the snake_case columns below.
--
-- Follows the 0001_core.sql conventions exactly:
--   • id is TEXT (app generates string ids like crypto.randomUUID(), not uuids)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--     via an "a_"-prefixed BEFORE trigger (fires before the RLS WITH CHECK)
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • nested objects/arrays -> jsonb (BulkAuditLog.detail)
--   • an index on (company_id)
-- None of these rows carry an updated_at, so no set_updated_at trigger is wired.
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ── bulk_ledger_accounts ─────────────────────────────────────────────────────
-- Mirrors the TS `BulkLedgerAccount` interface: the chart of accounts for the
-- bulk-ledger mode. `group` is a SQL reserved word, so it is stored as
-- `account_group` (matching the custom_accounts convention in 0001).
create table if not exists public.bulk_ledger_accounts (
  id            text primary key,               -- app-generated string id
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid not null,                  -- denormalised, set by trigger
  name          text not null default '',
  account_group text not null default '',       -- BulkLedgerAccount.group
  account_type  text not null default '',       -- 'asset'|'liability'|... (free text)
  created_by    text not null default 'MANUAL'  -- 'AI' | 'MANUAL'
                  check (created_by in ('AI','MANUAL')),
  created_at    timestamptz not null default now()
);
create index if not exists bulk_ledger_accounts_company_idx
  on public.bulk_ledger_accounts (company_id);

-- ── bulk_suspense_transactions ───────────────────────────────────────────────
-- Mirrors the TS `SuspenseTransaction` interface: imported bank rows awaiting
-- classification. `amount` is always positive; `direction` carries the sign.
create table if not exists public.bulk_suspense_transactions (
  id                  text primary key,         -- app-generated string id
  company_id          uuid not null references public.companies(id) on delete cascade,
  user_id             uuid not null,            -- denormalised, set by trigger
  fy                  text not null default '',
  batch_id            text not null default '',
  txn_date            date,                     -- nullable (string | null)
  narration           text not null default '',
  reference_no        text not null default '',
  amount              numeric not null default 0,
  direction           text not null default 'PAYMENT'
                        check (direction in ('RECEIPT','PAYMENT')),
  status              text not null default 'UNALLOCATED'
                        check (status in ('UNALLOCATED','ALLOCATED','FLAGGED')),
  allocated_ledger_id text,                     -- nullable (ledger account id)
  allocated_by        text                      -- nullable 'AI' | 'MANUAL'
                        check (allocated_by in ('AI','MANUAL')),
  allocation_keyword  text,                     -- nullable
  allocated_at        timestamptz,              -- nullable ISO timestamp
  original_row_number integer not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists bulk_suspense_transactions_company_idx
  on public.bulk_suspense_transactions (company_id);
create index if not exists bulk_suspense_transactions_company_fy_idx
  on public.bulk_suspense_transactions (company_id, fy);

-- ── bulk_ledger_entries ──────────────────────────────────────────────────────
-- Mirrors the TS `BulkLedgerEntry` interface: classified transactions posted to
-- a ledger account. `side` is the Dr/Cr indicator.
create table if not exists public.bulk_ledger_entries (
  id                 text primary key,          -- app-generated string id
  company_id         uuid not null references public.companies(id) on delete cascade,
  user_id            uuid not null,             -- denormalised, set by trigger
  fy                 text not null default '',
  ledger_account_id  text not null default '',
  txn_date           date,                      -- nullable (string | null)
  narration          text not null default '',
  reference_no       text not null default '',
  amount             numeric not null default 0,
  side               text not null default 'DR'
                       check (side in ('DR','CR')),
  source             text not null default 'MANUAL'
                       check (source in
                         ('BULK_CSV','MANUAL','GST_OTHER_SIDE','CASH','ADJUSTMENT')),
  suspense_id        text,                       -- nullable (source suspense row)
  batch_id           text,                       -- nullable
  allocated_by       text                        -- nullable 'AI' | 'MANUAL'
                       check (allocated_by in ('AI','MANUAL')),
  allocation_keyword text,                        -- nullable
  created_at         timestamptz not null default now()
);
create index if not exists bulk_ledger_entries_company_idx
  on public.bulk_ledger_entries (company_id);
create index if not exists bulk_ledger_entries_company_fy_idx
  on public.bulk_ledger_entries (company_id, fy);
create index if not exists bulk_ledger_entries_ledger_idx
  on public.bulk_ledger_entries (company_id, ledger_account_id);

-- ── bulk_audit_log ───────────────────────────────────────────────────────────
-- Mirrors the TS `BulkAuditLog` interface: an append-only activity trail. The
-- free-form `detail` object (Record<string, unknown>) is stored as JSONB.
-- `actor` is free text ('AI' | 'MANUAL' | a CA-member id), so it is unchecked.
create table if not exists public.bulk_audit_log (
  id         text primary key,                  -- app-generated string id
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null,                     -- denormalised, set by trigger
  actor      text not null default '',
  action     text not null default '',
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bulk_audit_log_company_idx
  on public.bulk_audit_log (company_id);

-- ============================================================================
-- 2. TRIGGERS — denormalised user_id stamping (reuses set_child_user_id)
-- ============================================================================
-- Prefixed "a_" so they sort/fire first (before the RLS WITH CHECK is evaluated),
-- exactly like the child-table triggers in 0001_core.sql.

drop trigger if exists a_bulk_ledger_accounts_set_user_id on public.bulk_ledger_accounts;
create trigger a_bulk_ledger_accounts_set_user_id
  before insert or update on public.bulk_ledger_accounts
  for each row execute function public.set_child_user_id();

drop trigger if exists a_bulk_suspense_transactions_set_user_id on public.bulk_suspense_transactions;
create trigger a_bulk_suspense_transactions_set_user_id
  before insert or update on public.bulk_suspense_transactions
  for each row execute function public.set_child_user_id();

drop trigger if exists a_bulk_ledger_entries_set_user_id on public.bulk_ledger_entries;
create trigger a_bulk_ledger_entries_set_user_id
  before insert or update on public.bulk_ledger_entries
  for each row execute function public.set_child_user_id();

drop trigger if exists a_bulk_audit_log_set_user_id on public.bulk_audit_log;
create trigger a_bulk_audit_log_set_user_id
  before insert or update on public.bulk_audit_log
  for each row execute function public.set_child_user_id();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.bulk_ledger_accounts       enable row level security;
alter table public.bulk_suspense_transactions enable row level security;
alter table public.bulk_ledger_entries         enable row level security;
alter table public.bulk_audit_log              enable row level security;

drop policy if exists bulk_ledger_accounts_all on public.bulk_ledger_accounts;
create policy bulk_ledger_accounts_all on public.bulk_ledger_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bulk_suspense_transactions_all on public.bulk_suspense_transactions;
create policy bulk_suspense_transactions_all on public.bulk_suspense_transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bulk_ledger_entries_all on public.bulk_ledger_entries;
create policy bulk_ledger_entries_all on public.bulk_ledger_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bulk_audit_log_all on public.bulk_audit_log;
create policy bulk_audit_log_all on public.bulk_audit_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0005_bulk.sql
-- ============================================================================
