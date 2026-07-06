-- ============================================================================
-- CA Studio — Supabase schema for journal data
-- Run this in Supabase → SQL Editor (once) before enabling the Supabase backend.
-- Mirrors the app's localStorage model so computeAllBalances() works unchanged.
-- ============================================================================

-- ── Chart of accounts (per company) ─────────────────────────────────────────
create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  company_id    text not null,
  name          text not null,
  account_group text not null default '',
  nature        text not null check (nature in ('asset','liability','capital','revenue','expense')),
  created_at    timestamptz not null default now(),
  unique (company_id, name)
);
create index if not exists accounts_company_idx on public.accounts (company_id);

-- ── Journal entries (vouchers) ──────────────────────────────────────────────
create table if not exists public.journal_entries (
  id                 uuid primary key default gen_random_uuid(),
  company_id         text not null,
  entry_code         text not null,
  entry_date         date not null,
  voucher_type       text not null,
  voucher_number     text,
  narration          text not null default '',
  book_period        text not null default '',
  is_opening         boolean not null default false,
  is_closing         boolean not null default false,
  party_gstin        text,
  deductee_pan       text,
  tds_deposit_status text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists je_company_date_idx on public.journal_entries (company_id, entry_date);
create unique index if not exists je_company_code_idx on public.journal_entries (company_id, entry_code);

-- ── Journal lines (Dr/Cr legs) ──────────────────────────────────────────────
-- account_id links to accounts(*) for the nested select; the denormalised
-- account_name/group/nature columns let the compute layer work without the join.
create table if not exists public.journal_lines (
  id                  uuid primary key default gen_random_uuid(),
  entry_id            uuid not null references public.journal_entries(id) on delete cascade,
  account_id          uuid references public.accounts(id),
  account_name        text not null,
  account_group       text not null default '',
  nature              text not null,
  debit               numeric not null default 0,
  credit              numeric not null default 0,
  hsn_code            text,
  tds_section         text,
  tds_rate            numeric,
  tcs_section         text,
  tcs_rate            numeric,
  inventory_sub_lines jsonb,
  line_order          int not null default 0
);
create index if not exists jl_entry_idx   on public.journal_lines (entry_id);
create index if not exists jl_account_idx on public.journal_lines (account_id);

-- ── keep updated_at fresh ───────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists je_set_updated_at on public.journal_entries;
create trigger je_set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;

-- WARNING: the app currently has no real per-user auth (offline stub), so these
-- policies grant the anon key full access. That is acceptable for a single-user /
-- local setup ONLY. Before any multi-tenant/production use, replace these with
-- policies scoped to auth.uid() and a company-ownership table.
drop policy if exists "anon all" on public.accounts;
drop policy if exists "anon all" on public.journal_entries;
drop policy if exists "anon all" on public.journal_lines;
create policy "anon all" on public.accounts        for all using (true) with check (true);
create policy "anon all" on public.journal_entries for all using (true) with check (true);
create policy "anon all" on public.journal_lines   for all using (true) with check (true);
