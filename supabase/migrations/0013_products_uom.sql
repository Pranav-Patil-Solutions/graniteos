-- 0013_products_uom.sql — Product master + industry units of measure (UOM).
-- Lets a company define reusable products (named stone/service with a default
-- rate, HSN, GST rate and unit) and pick them on quotes/invoices. Adds a `uom`
-- unit to every line item so the stone trade can bill in sq-ft, running-ft,
-- slabs, pieces, tonnes, etc. All idempotent.

-- ── Product master ─────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  hsn_code text,
  uom text not null default 'SQF',
  default_rate_paise bigint not null default 0,
  gst_rate numeric(4,1) not null default 18,
  material text,
  finish text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_company on public.products(company_id);

alter table public.products enable row level security;
alter table public.products force row level security;

drop policy if exists products_all on public.products;
create policy products_all on public.products for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ── Unit of measure + product link on line items ───────────────────────────
alter table public.quote_items   add column if not exists uom text not null default 'SQF';
alter table public.invoice_items add column if not exists uom text not null default 'SQF';
alter table public.quote_items   add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.invoice_items add column if not exists product_id uuid references public.products(id) on delete set null;
