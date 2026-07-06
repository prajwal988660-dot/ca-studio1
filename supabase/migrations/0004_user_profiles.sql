-- ============================================================================
-- CA Studio — 0002_user_profiles.sql
-- Onboarding contact + professional profile captured by SignUpForm.
--
-- One row per auth user (user_id is the primary key). Each user owns and sees
-- only their own profile via RLS. Replaces the old standalone `ca_profiles`
-- table that the removed src/lib/supabase.ts wrote to on a different project.
--
-- Standalone DDL — paste into Supabase → SQL Editor and run once, after
-- 0001_core.sql. Re-runnable: create ... if not exists / create or replace /
-- drop ... if exists before each create.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── user_profiles ────────────────────────────────────────────────────────────
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

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_all on public.user_profiles;
create policy user_profiles_all on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0002_user_profiles.sql
-- ============================================================================
