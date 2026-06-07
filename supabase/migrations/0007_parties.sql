-- 0007_parties.sql — Customers & Suppliers (parties), company-scoped.
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('customer','supplier')),
  name text not null check (char_length(name) between 1 and 100),
  party_type text,
  phone text,
  email text,
  city text,
  address text,
  gstin text,
  credit_limit_paise bigint not null default 0,
  -- outstanding: for a customer = receivable (udhaar they owe us);
  --              for a supplier = payable (we owe them)
  opening_balance_paise bigint not null default 0,
  notes text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create index idx_parties_company on public.parties(company_id);
create index idx_parties_kind on public.parties(company_id, kind);

alter table public.parties enable row level security;
alter table public.parties force row level security;

create policy parties_all on public.parties for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
