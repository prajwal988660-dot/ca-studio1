-- ============================================================================
-- CA Studio — 0002_gst_invoices.sql
-- GST invoice mirror for the offline-first localStorage store.
--
-- Mirrors the PRIMARY (v2) invoice store in
--   src/lib/accounting/gstInvoices.ts  (STORAGE_KEY_V2 = 'vaarta_gst_invoices_v2')
-- which persists rows of the TS `InvoiceV2` interface (InvoiceV2Draft + id,
-- company_id, created_at, updated_at). One flat document per invoice, with the
-- line items array (`items: LineItem[]`) stored as JSONB.
--
-- NOTE ON SCOPE: gstInvoices.ts also contains a LEGACY v1 store
--   (STORAGE_KEY = 'vaarta_gst_invoice_portal_v1' → SalesInvoice[] / PurchaseInvoice[]).
-- Per the task we intentionally cover only the primary v2 store with a single
-- `invoices` table. The v1 sales/purchase records have a different, incompatible
-- column shape (customer_name/vendor_name, bucket, cgst/sgst/igst/total, …) and
-- are INTENTIONALLY SKIPPED here — they are not dual-written to this table.
--
-- Follows the 0001_core.sql conventions exactly:
--   • id is TEXT (app generates string ids like `gst_xxx_yyy`, not uuids)
--   • company_id uuid references public.companies(id) on delete cascade
--   • denormalised user_id uuid not null, stamped by public.set_child_user_id()
--   • RLS enabled with a single for-all `user_id = auth.uid()` policy
--   • nested arrays/objects -> jsonb
--
-- Standalone, re-runnable DDL. Paste into Supabase → SQL Editor and run once.
-- ============================================================================

-- ── invoices (GST v2 store) ──────────────────────────────────────────────────
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

-- ── triggers ─────────────────────────────────────────────────────────────────
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

-- ── row level security ───────────────────────────────────────────────────────
alter table public.invoices enable row level security;

drop policy if exists invoices_all on public.invoices;
create policy invoices_all on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of 0002_gst_invoices.sql
-- ============================================================================
