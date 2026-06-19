-- 0023_procurement.sql — Procurement / accounts-payable.
-- Purchase orders (issued to suppliers), vendor bills, and supplier payments.
-- Company-scoped via public.current_company_id() (matches existing convention).
-- Suppliers reuse public.parties (kind='supplier'); a PO may link to the
-- customer quote that triggered procurement (purchase_orders.quote_id → quotes).
-- Money in paise (bigint). Display numbers via public.generate_display_number.

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.parties(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  po_no text,
  status text not null default 'draft'
    check (status in ('draft','sent','approved','received','cancelled')),
  po_date date not null default current_date,
  expected_date date,
  notes text,
  subtotal_paise bigint not null default 0,
  gst_paise bigint not null default 0,
  total_paise bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  description text not null,
  material text,
  qty numeric(12,2) not null default 0,
  uom text not null default 'SQF',
  rate_paise bigint not null default 0,
  gst_rate numeric(4,1) not null default 18,
  line_subtotal_paise bigint not null default 0,
  line_gst_paise bigint not null default 0,
  line_total_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.purchase_bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.parties(id) on delete set null,
  po_id uuid references public.purchase_orders(id) on delete set null,
  bill_no text,                 -- our internal display number
  vendor_bill_no text,          -- the number printed on the supplier's own bill
  bill_date date not null default current_date,
  due_date date,
  notes text,
  subtotal_paise bigint not null default 0,
  gst_paise bigint not null default 0,
  total_paise bigint not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  created_at timestamptz not null default now()
);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.parties(id) on delete set null,
  bill_id uuid references public.purchase_bills(id) on delete set null,
  amount_paise bigint not null check (amount_paise > 0),
  mode text not null default 'cash' check (mode in ('cash','upi','bank','cheque','other')),
  paid_on date not null default current_date,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_po_company   on public.purchase_orders(company_id);
create index idx_po_supplier  on public.purchase_orders(supplier_id);
create index idx_po_quote     on public.purchase_orders(quote_id);
create index idx_poi_po       on public.purchase_order_items(po_id);
create index idx_poi_company  on public.purchase_order_items(company_id);
create index idx_bills_company  on public.purchase_bills(company_id);
create index idx_bills_supplier on public.purchase_bills(supplier_id);
create index idx_bills_po       on public.purchase_bills(po_id);
create index idx_spay_company on public.supplier_payments(company_id);
create index idx_spay_bill    on public.supplier_payments(bill_id);

alter table public.purchase_orders enable row level security;
alter table public.purchase_orders force row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_order_items force row level security;
alter table public.purchase_bills enable row level security;
alter table public.purchase_bills force row level security;
alter table public.supplier_payments enable row level security;
alter table public.supplier_payments force row level security;

create policy purchase_orders_all on public.purchase_orders for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy purchase_order_items_all on public.purchase_order_items for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy purchase_bills_all on public.purchase_bills for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy supplier_payments_all on public.supplier_payments for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
