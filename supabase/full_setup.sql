-- ============================================================================
-- CA Studio — FULL BACKEND SETUP (run once in Supabase → SQL Editor)
-- Concatenation of every migration 0001..0011, all idempotent (safe to re-run).
-- After this, all cloud tables + RLS + triggers exist. Also fixes the
-- financial_year_start column type on any pre-existing companies table.
-- ============================================================================


-- ===== 0001_core.sql =====
-- ============================================================================
-- CA Studio â€” 0001_core.sql
-- Core multi-tenant schema for the offline-first accounting app.
--
-- Model: one `auth.users` row == one tenant. A user owns many `companies`;
-- every child row (book periods, journal entries, custom accounts, entity data)
-- belongs to exactly one company and carries a denormalised `user_id` so that
-- Row Level Security (RLS) can be a simple `user_id = auth.uid()` comparison
-- without a join on every policy check.
--
-- This file is standalone DDL. Paste it into Supabase â†’ SQL Editor and run once.
-- It is written to be re-runnable: `create table if not exists`, `create or
-- replace function`, and `drop trigger/policy if exists` before each create.
-- ============================================================================

-- gen_random_uuid() lives in the pgcrypto extension.
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- â”€â”€ companies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  financial_year_start text,   -- app stores a label ('april'|'july'|'january'), NOT a date
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

-- â”€â”€ book_periods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ journal_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ custom_accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ entity_data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Mirrors the TS `EntityDataRecord` interface â€” a generic per-module/section
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

-- (a) set_updated_at() â€” bump updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- (b) journal_entry_code_immutable() â€” the entry_code is a permanent identifier;
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

-- (c) journal_balance_check() â€” a valid voucher must balance: the sum of all
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

-- (d) set_child_user_id() â€” copy the owning user_id down from the parent company
--     BEFORE the row is written, so RLS can compare user_id = auth.uid() cheaply.
--     Runs with the caller's privileges (SECURITY INVOKER, the default), so the
--     lookup itself passes through the companies RLS policy: a user can only read
--     â€” and therefore only stamp children onto â€” companies they own. Pointing a
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

-- â”€â”€ updated_at maintenance (companies, journal_entries, entity_data) â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ journal_entries: immutable entry_code + balance check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop trigger if exists journal_entries_code_immutable on public.journal_entries;
create trigger journal_entries_code_immutable
  before update on public.journal_entries
  for each row execute function public.journal_entry_code_immutable();

drop trigger if exists journal_entries_balance_check on public.journal_entries;
create trigger journal_entries_balance_check
  before insert or update on public.journal_entries
  for each row execute function public.journal_balance_check();

-- â”€â”€ denormalised user_id stamping on every child table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ companies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ book_periods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists book_periods_all on public.book_periods;
create policy book_periods_all on public.book_periods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- â”€â”€ journal_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists journal_entries_all on public.journal_entries;
create policy journal_entries_all on public.journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- â”€â”€ custom_accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists custom_accounts_all on public.custom_accounts;
create policy custom_accounts_all on public.custom_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- â”€â”€ entity_data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists entity_data_all on public.entity_data;
create policy entity_data_all on public.entity_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0001_core.sql
-- ============================================================================


-- ===== 0002_gst_invoices.sql =====
-- ============================================================================
-- CA Studio â€” 0002_gst_invoices.sql
-- GST invoice mirror for the offline-first localStorage store.
--
-- Mirrors the PRIMARY (v2) invoice store in
--   src/lib/accounting/gstInvoices.ts  (STORAGE_KEY_V2 = 'vaarta_gst_invoices_v2')
-- which persists rows of the TS `InvoiceV2` interface (InvoiceV2Draft + id,
-- company_id, created_at, updated_at). One flat document per invoice, with the
-- line items array (`items: LineItem[]`) stored as JSONB.
--
-- NOTE ON SCOPE: gstInvoices.ts also contains a LEGACY v1 store
--   (STORAGE_KEY = 'vaarta_gst_invoice_portal_v1' â†’ SalesInvoice[] / PurchaseInvoice[]).
-- Per the task we intentionally cover only the primary v2 store with a single
-- `invoices` table. The v1 sales/purchase records have a different, incompatible
-- column shape (customer_name/vendor_name, bucket, cgst/sgst/igst/total, â€¦) and
-- are INTENTIONALLY SKIPPED here â€” they are not dual-written to this table.
--
-- Follows the 0001_core.sql conventions exactly:
--   â€¢ id is TEXT (app generates string ids like `gst_xxx_yyy`, not uuids)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- â”€â”€ invoices (GST v2 store) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists public.invoices (
  id                    text primary key,        -- app string id (not a uuid)
  company_id            uuid not null references public.companies(id) on delete cascade,
  user_id               uuid not null,           -- denormalised, set by trigger

  -- document / classification
  doc_type              text not null,
  gstr1_table           text not null default 'NONE',
  is_amendment          boolean not null default false,
  invoice_no            text not null default '',
  invoice_date          date not null,
  period                text not null default '',
  reverse_charge        boolean not null default false,
  invoice_type          text,
  ecom_gstin            text,
  b2cs_typ              text,
  diff_percent          numeric,

  -- amendment / original references
  original_invoice_no   text,
  original_invoice_date text,
  original_period       text,
  cdnur_type            text,
  note_type             text,
  cdn_reason            text,

  -- buyer / party
  buyer_type            text not null default 'CONSUMER',
  b2c_type              text,
  buyer_gstin           text,
  buyer_name            text not null default '',
  buyer_address         text,
  buyer_state           text not null default '',
  buyer_state_code      text not null default '',
  buyer_pincode         text,

  -- export / shipping
  export_type           text,
  port_code             text,
  shipping_bill_no      text,
  shipping_bill_date    text,

  -- supply
  currency              text not null default 'INR',
  exchange_rate         numeric not null default 1,
  place_of_supply       text not null default '',
  supply_type           text not null default 'intra',
  is_intra_state        boolean not null default true,
  bos_reason            text,
  rcm_nature            text,
  challan_purpose       text,
  vehicle_no            text,
  transport_name        text,

  -- line items (nested LineItem[]) + totals
  items                 jsonb not null default '[]'::jsonb,
  total_taxable         numeric not null default 0,
  total_discount        numeric not null default 0,
  total_cgst            numeric not null default 0,
  total_sgst            numeric not null default 0,
  total_igst            numeric not null default 0,
  total_cess            numeric not null default 0,
  round_off             numeric not null default 0,
  total_amount          numeric not null default 0,
  amount_in_words       text not null default '',
  nil_rated_value       numeric not null default 0,
  exempt_value          numeric not null default 0,
  non_gst_value         numeric not null default 0,

  -- e-invoice
  irn                   text,
  irn_date              text,
  ack_no                text,
  ack_date              text,
  signed_qr             text,

  -- status / misc
  status                text not null default 'DRAFT',
  force_igst            boolean not null default false,
  cancel_reason         text,
  notes                 text,

  -- payment
  payment_mode          text,
  received_medium       text,
  amount_received       numeric,
  amount_pending        numeric,
  due_date              text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Useful index for the per-company listings/filters in gstInvoices.ts.
create index if not exists invoices_company_idx
  on public.invoices (company_id);
create index if not exists invoices_company_period_idx
  on public.invoices (company_id, period);

-- â”€â”€ triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated), using
-- the existing function from 0001_core.sql.
drop trigger if exists a_invoices_set_user_id on public.invoices;
create trigger a_invoices_set_user_id
  before insert or update on public.invoices
  for each row execute function public.set_child_user_id();

-- Bump updated_at on every UPDATE (reuse the existing 0001 function).
drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- â”€â”€ row level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.invoices enable row level security;

drop policy if exists invoices_all on public.invoices;
create policy invoices_all on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0002_gst_invoices.sql
-- ============================================================================


-- ===== 0003_bank_import.sql =====
-- ============================================================================
-- CA Studio â€” 0003_bank_import.sql
-- Bank import schema: import batches + parsed bank transactions.
--
-- Mirrors the offline-first localStorage store in
-- src/lib/bankImport/bankImportDb.ts (TS shapes: ImportBatch, BankTransaction).
-- Both tables are children of `companies` and follow the exact pattern from
-- 0001_core.sql: a denormalised `user_id` stamped by the existing
-- public.set_child_user_id() trigger, RLS enabled with a single for-all policy.
--
-- NOTE: store rows use STRING ids generated by the app (crypto.randomUUID()),
-- so the primary key `id` is TEXT (not uuid). `company_id` still references the
-- uuid companies.id (uuid-format strings coerce cleanly). Nested/derived-only
-- fields are none here; all columns are scalar.
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- â”€â”€ bank_import_batches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Mirrors the TS `ImportBatch` interface: one row per imported statement file.
create table if not exists public.bank_import_batches (
  id           text primary key,               -- app-generated string id
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null,                  -- denormalised, set by trigger
  bank_account text not null default '',
  file_name    text not null default '',
  imported_at  timestamptz not null default now(),
  row_count    integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists bank_import_batches_company_idx
  on public.bank_import_batches (company_id);

-- â”€â”€ bank_transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Mirrors the TS `BankTransaction` interface: one row per statement line.
-- `import_batch` is the parent batch id (TEXT, matches bank_import_batches.id).
-- `journalized_id` is the journal entry id (app string id) once transferred.
create table if not exists public.bank_transactions (
  id             text primary key,             -- app-generated string id
  company_id     uuid not null references public.companies(id) on delete cascade,
  user_id        uuid not null,                -- denormalised, set by trigger
  import_batch   text not null,                -- parent batch id (batch_id)
  date           date not null,
  narration_raw  text not null default '',
  narration_clean text not null default '',
  payee          text not null default '',
  payment_mode   text not null default 'OTHER'
                   check (payment_mode in
                     ('UPI','NEFT','IMPS','RTGS','ATM','POS','CHQ','CASH','OTHER')),
  debit          numeric not null default 0,
  credit         numeric not null default 0,
  balance        numeric not null default 0,
  ref_no         text not null default '',
  journalized_id text,                          -- JE id once transferred (nullable)
  journalized_at timestamptz,                   -- ISO timestamp (nullable)
  created_at     timestamptz not null default now()
);
create index if not exists bank_transactions_company_idx
  on public.bank_transactions (company_id);
create index if not exists bank_transactions_batch_idx
  on public.bank_transactions (import_batch);

-- ============================================================================
-- 2. TRIGGERS â€” denormalised user_id stamping (reuses set_child_user_id)
-- ============================================================================
-- Prefixed "a_" so they sort/fire first (before the RLS WITH CHECK is evaluated),
-- exactly like the child-table triggers in 0001_core.sql.

drop trigger if exists a_bank_import_batches_set_user_id on public.bank_import_batches;
create trigger a_bank_import_batches_set_user_id
  before insert or update on public.bank_import_batches
  for each row execute function public.set_child_user_id();

drop trigger if exists a_bank_transactions_set_user_id on public.bank_transactions;
create trigger a_bank_transactions_set_user_id
  before insert or update on public.bank_transactions
  for each row execute function public.set_child_user_id();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.bank_import_batches enable row level security;
alter table public.bank_transactions   enable row level security;

drop policy if exists bank_import_batches_all on public.bank_import_batches;
create policy bank_import_batches_all on public.bank_import_batches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bank_transactions_all on public.bank_transactions;
create policy bank_transactions_all on public.bank_transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0003_bank_import.sql
-- ============================================================================


-- ===== 0004_user_profiles.sql =====
-- ============================================================================
-- CA Studio â€” 0002_user_profiles.sql
-- Onboarding contact + professional profile captured by SignUpForm.
--
-- One row per auth user (user_id is the primary key). Each user owns and sees
-- only their own profile via RLS. Replaces the old standalone `ca_profiles`
-- table that the removed src/lib/supabase.ts wrote to on a different project.
--
-- Standalone DDL â€” paste into Supabase â†’ SQL Editor and run once, after
-- 0001_core.sql. Re-runnable: create ... if not exists / create or replace /
-- drop ... if exists before each create.
-- ============================================================================

create extension if not exists pgcrypto;

-- â”€â”€ user_profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists public.user_profiles (
  user_id    uuid primary key default auth.uid()
               references auth.users(id) on delete cascade,
  name       text   not null default '',
  phone      text   not null default '',
  email      text   not null default '',
  state      text   not null default '',
  city       text   not null default '',
  profession text   not null default '',
  expertise  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- bump updated_at on every UPDATE. `create or replace` so this file runs even
-- standalone; it is identical to the definition in 0001_core.sql.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- â”€â”€ Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_all on public.user_profiles;
create policy user_profiles_all on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0002_user_profiles.sql
-- ============================================================================


-- ===== 0005_bulk.sql =====
-- ============================================================================
-- CA Studio â€” 0005_bulk.sql
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
--   â€¢ id is TEXT (app generates string ids like crypto.randomUUID(), not uuids)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--     via an "a_"-prefixed BEFORE trigger (fires before the RLS WITH CHECK)
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ nested objects/arrays -> jsonb (BulkAuditLog.detail)
--   â€¢ an index on (company_id)
-- None of these rows carry an updated_at, so no set_updated_at trigger is wired.
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- â”€â”€ bulk_ledger_accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ bulk_suspense_transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ bulk_ledger_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ bulk_audit_log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- 2. TRIGGERS â€” denormalised user_id stamping (reuses set_child_user_id)
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


-- ===== 0006_gstr1.sql =====
-- ============================================================================
-- CA Studio â€” 0006_gstr1.sql
-- GSTR-1 filings mirror for the offline-first localStorage store.
--
-- Mirrors the store in src/lib/gstr1/gstr1Db.ts (STORAGE_KEY = 'gstr1_filings_v1'),
-- which persists rows of the TS `GSTR1Filing` interface. Each filing uses a
-- COMPOSITE app id `${companyId}_${period}` (one filing per company+period), so
-- the primary key `id` is TEXT (not a uuid). The whole filing payload (the many
-- section arrays: b2b, b2cl, b2cs, exp, cdnr, â€¦, plus rcm_overrides) is stored as
-- a single JSONB `data` blob; `period` is denormalised as a scalar for filtering.
--
-- Follows the 0001_core.sql / 0002_gst_invoices.sql conventions exactly:
--   â€¢ id is TEXT (app-generated composite string id, not a uuid)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ updated_at bumped by the existing public.set_updated_at() trigger
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- â”€â”€ gstr1_filings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ row level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.gstr1_filings enable row level security;

drop policy if exists gstr1_filings_all on public.gstr1_filings;
create policy gstr1_filings_all on public.gstr1_filings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0006_gstr1.sql
-- ============================================================================


-- ===== 0007_tally.sql =====
-- ============================================================================
-- CA Studio â€” 0007_tally.sql
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
--   â€¢ id is TEXT (here the companyId string; uuid-format coerces cleanly)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- â”€â”€ tally_datasets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated), using
-- the existing function from 0001_core.sql.
drop trigger if exists a_tally_datasets_set_user_id on public.tally_datasets;
create trigger a_tally_datasets_set_user_id
  before insert or update on public.tally_datasets
  for each row execute function public.set_child_user_id();

-- â”€â”€ row level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.tally_datasets enable row level security;

drop policy if exists tally_datasets_all on public.tally_datasets;
create policy tally_datasets_all on public.tally_datasets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0007_tally.sql
-- ============================================================================


-- ===== 0008_workspace.sql =====
-- ============================================================================
-- CA Studio â€” 0008_workspace.sql
-- Workspace files mirror for the offline-first localStorage store.
--
-- Mirrors the CARP workspace store in
--   src/lib/workspaceDb.ts  (key prefix 'carp_workspace_<companyId>')
-- which persists rows of the TS `WorkspaceFile` interface
--   (src/lib/carp/tools/types.ts): { id, name, type, content, created_at, size }.
-- One row per file. `type` is a small closed set in the app
--   ('text' | 'csv' | 'markdown' | 'json') â€” kept as free TEXT here so future
--   file types never break the best-effort mirror (documented, not constrained).
--
-- Follows the 0001_core.sql / 0003_bank_import.sql conventions exactly:
--   â€¢ id is TEXT (app generates string ids via crypto.randomUUID(), not uuids)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ updated_at bumped by the existing public.set_updated_at() trigger
--
-- NOTE: the WorkspaceFile record has no company_id (it is scoped by the
-- localStorage key), so the dual-write adds company_id to the mirrored row.
-- The record's `size` scalar is carried across as-is into the `size` column.
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- â”€â”€ workspace_files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ row level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.workspace_files enable row level security;

drop policy if exists workspace_files_all on public.workspace_files;
create policy workspace_files_all on public.workspace_files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0008_workspace.sql
-- ============================================================================


-- ===== 0009_contingent.sql =====
-- ============================================================================
-- CA Studio â€” 0009_contingent.sql
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
--   â€¢ id is TEXT (app generates string ids via crypto.randomUUID(), not uuids)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--
-- NOTE: the ContingentItem record has no company_id (it is scoped by the
-- localStorage key), so the dual-write adds company_id to the mirrored row.
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- â”€â”€ contingent_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stamp denormalised user_id from the parent company BEFORE the row is written
-- (name prefixed "a_" so it fires before the RLS WITH CHECK is evaluated),
-- reusing the existing function from 0001_core.sql.
drop trigger if exists a_contingent_items_set_user_id on public.contingent_items;
create trigger a_contingent_items_set_user_id
  before insert or update on public.contingent_items
  for each row execute function public.set_child_user_id();

-- â”€â”€ row level security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.contingent_items enable row level security;

drop policy if exists contingent_items_all on public.contingent_items;
create policy contingent_items_all on public.contingent_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0009_contingent.sql
-- ============================================================================


-- ===== 0010_inventory.sql =====
-- ============================================================================
-- CA Studio â€” 0010_inventory.sql
-- Inventory production-issue mirror for the offline-first localStorage store.
--
-- Mirrors the store in
--   src/lib/accounting/inventoryEngine.ts  (PRODUCTION_KEY = 'inv_production_issues')
-- which persists a single GLOBAL array of the TS `ProductionIssue` interface,
-- filtered by companyId at read time. Each element becomes one row here.
--
-- Follows the 0001_core.sql / 0003_bank_import.sql conventions exactly:
--   â€¢ id is TEXT (app generates string ids like `PI-<ts>-<rand>`, not uuids)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ index on (company_id)
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLE
-- ============================================================================

-- â”€â”€ inventory_production_issues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Mirrors the TS `ProductionIssue` interface: one row per material issued to
-- production. All fields are scalar (no nested objects/arrays -> no jsonb).
create table if not exists public.inventory_production_issues (
  id          text primary key,                 -- app-generated string id (PI-â€¦)
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
-- 2. TRIGGER â€” denormalised user_id stamping (reuses set_child_user_id)
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


-- ===== 0011_export_prefs.sql =====
-- ============================================================================
-- CA Studio â€” 0011_export_prefs.sql
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
--   â€¢ id is TEXT and equals the companyId (uuid-format string coerces cleanly)
--   â€¢ company_id uuid references public.companies(id) on delete cascade
--   â€¢ denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   â€¢ RLS enabled with a single for-all `user_id = auth.uid()` policy
--   â€¢ index on (company_id)
--
-- Standalone, re-runnable DDL. Paste into Supabase â†’ SQL Editor and run once.
-- ============================================================================

-- ============================================================================
-- 1. TABLE
-- ============================================================================

-- â”€â”€ export_prefs (one blob per company) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- 2. TRIGGER â€” denormalised user_id stamping (reuses set_child_user_id)
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


-- ===== fix for pre-existing tables =====
alter table public.companies alter column financial_year_start type text;

