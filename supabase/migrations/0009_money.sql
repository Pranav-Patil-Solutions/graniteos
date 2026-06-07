-- 0009_money.sql — Invoices & Payments (billing, GST, udhaar). Company-scoped.

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.parties(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  invoice_no text,
  invoice_date date not null default current_date,
  due_date date,
  subtotal_paise bigint not null default 0,
  gst_paise bigint not null default 0,
  total_paise bigint not null default 0,
  notes text,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.parties(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount_paise bigint not null check (amount_paise > 0),
  mode text not null default 'cash' check (mode in ('cash','upi','bank','cheque','other')),
  paid_on date not null default current_date,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_invoices_company on public.invoices(company_id);
create index idx_invoices_customer on public.invoices(customer_id);
create index idx_payments_company on public.payments(company_id);
create index idx_payments_invoice on public.payments(invoice_id);

alter table public.invoices enable row level security;
alter table public.invoices force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;

create policy invoices_all on public.invoices for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy payments_all on public.payments for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
