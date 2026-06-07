-- 0008_quotes_orders.sql — Quotes, quote line items, and Orders. Company-scoped.

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.parties(id) on delete set null,
  quote_no text,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','expired')),
  quote_date date not null default current_date,
  valid_until date,
  notes text,
  subtotal_paise bigint not null default 0,
  gst_paise bigint not null default 0,
  total_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  slab_id uuid references public.slabs(id) on delete set null,
  description text not null,
  sqft numeric(10,2) not null default 0,
  rate_paise bigint not null default 0,
  gst_rate numeric(4,1) not null default 18,
  line_subtotal_paise bigint not null default 0,
  line_gst_paise bigint not null default 0,
  line_total_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid references public.parties(id) on delete set null,
  order_no text,
  status text not null default 'confirmed'
    check (status in ('confirmed','in_production','dispatched','delivered','cancelled')),
  total_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_quotes_company on public.quotes(company_id);
create index idx_quote_items_quote on public.quote_items(quote_id);
create index idx_orders_company on public.orders(company_id);

alter table public.quotes enable row level security;
alter table public.quotes force row level security;
alter table public.quote_items enable row level security;
alter table public.quote_items force row level security;
alter table public.orders enable row level security;
alter table public.orders force row level security;

create policy quotes_all on public.quotes for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy quote_items_all on public.quote_items for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy orders_all on public.orders for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
