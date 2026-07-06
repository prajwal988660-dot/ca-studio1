-- ============================================================================
-- CA Studio — 0001_core.sql
-- Core multi-tenant schema for the offline-first accounting app.
--
-- Model: one `auth.users` row == one tenant. A user owns many `companies`;
-- every child row (book periods, journal entries, custom accounts, entity data)
-- belongs to exactly one company and carries a denormalised `user_id` so that
-- Row Level Security (RLS) can be a simple `user_id = auth.uid()` comparison
-- without a join on every policy check.
--
-- This file is standalone DDL. Paste it into Supabase → SQL Editor and run once.
-- It is written to be re-runnable: `create table if not exists`, `create or
-- replace function`, and `drop trigger/policy if exists` before each create.
-- ============================================================================

-- gen_random_uuid() lives in the pgcrypto extension.
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ── companies ───────────────────────────────────────────────────────────────
-- Mirrors the TS `Company` interface. Nested objects (entity_details,
-- inventory_config, gst_details) are JSONB; business_nature is a text[] array.
-- Each row is stamped with the owning user_id (defaults to auth.uid()).
create table if not exists public.companies (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid()
                         references auth.users(id) on delete cascade,
  name                 text not null,
  entity_type          text not null check (entity_type in (
                         'sole_proprietorship','individual','partnership','llp',
                         'opc','pvt_ltd','public_ltd','huf','trust','society',
                         'section8','aop_boi','cooperative')),
  entity_details       jsonb not null default '{}'::jsonb,
  business_nature      text[] not null default '{}',
  inventory_enabled    boolean not null default false,
  inventory_config     jsonb not null default '{}'::jsonb,
  gst_status           text not null default 'unregistered'
                         check (gst_status in ('unregistered','regular','composition')),
  gst_details          jsonb not null default '{}'::jsonb,
  tds_applicable       boolean not null default false,
  tcs_applicable       boolean not null default false,
  tax_audit_applicable boolean not null default false,
  financial_year_start date,
  accounting_standard  text not null default 'indian_gaap'
                         check (accounting_standard in ('indian_gaap','ind_as')),
  accounting_method    text not null default 'mercantile'
                         check (accounting_method in ('mercantile','cash')),
  status               text not null default 'active'
                         check (status in ('active','closed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists companies_user_status_idx
  on public.companies (user_id, status);

-- ── book_periods ────────────────────────────────────────────────────────────
-- Mirrors the TS `BookPeriod` interface. No updated_at (matches the shape);
-- closed_at is set by the app when a period is closed.
create table if not exists public.book_periods (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null,                 -- denormalised, set by trigger
  period_start date not null,
  period_end   date not null,
  period_label text not null,
  reason       text,
  status       text not null default 'open'
                 check (status in ('open','closed','locked')),
  created_at   timestamptz not null default now(),
  closed_at    timestamptz,
  constraint book_periods_range_chk check (period_end >= period_start),
  constraint book_periods_label_uq  unique (company_id, period_label)
);

-- ── journal_entries ─────────────────────────────────────────────────────────
-- Mirrors the TS `JournalEntry` interface. The Dr/Cr legs (`lines`) are stored
-- as a JSONB array of JournalLine objects (nested inventory_sub_lines included).
create table if not exists public.journal_entries (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  user_id        uuid not null,               -- denormalised, set by trigger
  entry_code     text not null,
  entry_date     date not null,
  voucher_type   text not null check (voucher_type in (
                   'PMT','RCT','CNT','JRN','SLS','PUR','DN','CN','PAY')),
  voucher_number text,                          -- nullable (string | null)
  lines          jsonb not null default '[]'::jsonb,
  narration      text not null default '',
  book_period    text not null default '',
  is_opening     boolean not null default false,
  is_closing     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint journal_entries_code_uq unique (company_id, entry_code)
);
create index if not exists journal_entries_company_date_idx
  on public.journal_entries (company_id, entry_date);

-- ── custom_accounts ─────────────────────────────────────────────────────────
-- Mirrors the TS `CustomAccount` interface. Account name is unique per company,
-- case-insensitively (lower(name)).
create table if not exists public.custom_accounts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid not null,                -- denormalised, set by trigger
  name          text not null,
  account_group text not null default '',
  nature        text not null check (nature in
                  ('asset','liability','capital','revenue','expense')),
  created_at    timestamptz not null default now()
);
create unique index if not exists custom_accounts_name_uq
  on public.custom_accounts (company_id, lower(name));

-- ── entity_data ─────────────────────────────────────────────────────────────
-- Mirrors the TS `EntityDataRecord` interface — a generic per-module/section
-- JSONB blob store (data is `unknown`). One record per (company, module, section).
create table if not exists public.entity_data (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null,                   -- denormalised, set by trigger
  module     text not null,
  section    text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_data_module_section_uq unique (company_id, module, section)
);

-- ============================================================================
-- 2. TRIGGER FUNCTIONS
-- ============================================================================

-- (a) set_updated_at() — bump updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- (b) journal_entry_code_immutable() — the entry_code is a permanent identifier;
--     reject any UPDATE that tries to change it.
create or replace function public.journal_entry_code_immutable()
returns trigger as $$
begin
  if new.entry_code is distinct from old.entry_code then
    raise exception 'entry_code is immutable (was %, attempted %)',
      old.entry_code, new.entry_code;
  end if;
  return new;
end;
$$ language plpgsql;

-- (c) journal_balance_check() — a valid voucher must balance: the sum of all
--     line debits must equal the sum of all line credits. We tolerate a tiny
--     rounding slack (0.05) to absorb paisa-level float noise from the client.
create or replace function public.journal_balance_check()
returns trigger as $$
declare
  ln           jsonb;
  total_debit  numeric := 0;
  total_credit numeric := 0;
begin
  for ln in select * from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb))
  loop
    total_debit  := total_debit  + coalesce((ln->>'debit')::numeric, 0);
    total_credit := total_credit + coalesce((ln->>'credit')::numeric, 0);
  end loop;

  if abs(total_debit - total_credit) > 0.05 then
    raise exception
      'Journal entry % is unbalanced: debit=% credit=% (diff=%)',
      new.entry_code, total_debit, total_credit, abs(total_debit - total_credit);
  end if;

  return new;
end;
$$ language plpgsql;

-- (d) set_child_user_id() — copy the owning user_id down from the parent company
--     BEFORE the row is written, so RLS can compare user_id = auth.uid() cheaply.
--     Runs with the caller's privileges (SECURITY INVOKER, the default), so the
--     lookup itself passes through the companies RLS policy: a user can only read
--     — and therefore only stamp children onto — companies they own. Pointing a
--     child at someone else's company yields NULL and trips the NOT NULL column.
create or replace function public.set_child_user_id()
returns trigger as $$
begin
  select c.user_id into new.user_id
    from public.companies c
   where c.id = new.company_id;
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- ── updated_at maintenance (companies, journal_entries, entity_data) ─────────
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists entity_data_set_updated_at on public.entity_data;
create trigger entity_data_set_updated_at
  before update on public.entity_data
  for each row execute function public.set_updated_at();

-- ── journal_entries: immutable entry_code + balance check ────────────────────
drop trigger if exists journal_entries_code_immutable on public.journal_entries;
create trigger journal_entries_code_immutable
  before update on public.journal_entries
  for each row execute function public.journal_entry_code_immutable();

drop trigger if exists journal_entries_balance_check on public.journal_entries;
create trigger journal_entries_balance_check
  before insert or update on public.journal_entries
  for each row execute function public.journal_balance_check();

-- ── denormalised user_id stamping on every child table ───────────────────────
-- Trigger names are prefixed "a_" so they sort first and run before the other
-- BEFORE triggers (Postgres fires per-row triggers in trigger-name order),
-- guaranteeing user_id is populated before the RLS WITH CHECK is evaluated.
drop trigger if exists a_book_periods_set_user_id on public.book_periods;
create trigger a_book_periods_set_user_id
  before insert or update on public.book_periods
  for each row execute function public.set_child_user_id();

drop trigger if exists a_journal_entries_set_user_id on public.journal_entries;
create trigger a_journal_entries_set_user_id
  before insert or update on public.journal_entries
  for each row execute function public.set_child_user_id();

drop trigger if exists a_custom_accounts_set_user_id on public.custom_accounts;
create trigger a_custom_accounts_set_user_id
  before insert or update on public.custom_accounts
  for each row execute function public.set_child_user_id();

drop trigger if exists a_entity_data_set_user_id on public.entity_data;
create trigger a_entity_data_set_user_id
  before insert or update on public.entity_data
  for each row execute function public.set_child_user_id();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on all five tables and grant each user access to only their own
-- rows. For children this works because the BEFORE trigger above has already
-- populated the denormalised user_id by the time the WITH CHECK is evaluated
-- (Postgres evaluates RLS WITH CHECK on the final row, after BEFORE triggers).

alter table public.companies       enable row level security;
alter table public.book_periods    enable row level security;
alter table public.journal_entries enable row level security;
alter table public.custom_accounts enable row level security;
alter table public.entity_data     enable row level security;

-- ── companies ────────────────────────────────────────────────────────────────
drop policy if exists companies_select on public.companies;
drop policy if exists companies_insert on public.companies;
drop policy if exists companies_update on public.companies;
drop policy if exists companies_delete on public.companies;

create policy companies_select on public.companies
  for select using (user_id = auth.uid());
create policy companies_insert on public.companies
  for insert with check (user_id = auth.uid());
create policy companies_update on public.companies
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy companies_delete on public.companies
  for delete using (user_id = auth.uid());

-- ── book_periods ─────────────────────────────────────────────────────────────
drop policy if exists book_periods_all on public.book_periods;
create policy book_periods_all on public.book_periods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── journal_entries ──────────────────────────────────────────────────────────
drop policy if exists journal_entries_all on public.journal_entries;
create policy journal_entries_all on public.journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── custom_accounts ──────────────────────────────────────────────────────────
drop policy if exists custom_accounts_all on public.custom_accounts;
create policy custom_accounts_all on public.custom_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── entity_data ──────────────────────────────────────────────────────────────
drop policy if exists entity_data_all on public.entity_data;
create policy entity_data_all on public.entity_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0001_core.sql
-- ============================================================================
