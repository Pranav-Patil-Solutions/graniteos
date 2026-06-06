-- 0004_inventory.sql — Stock module: blocks → slabs (+ recovery), company-scoped.

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  material text not null check (char_length(material) between 1 and 60),
  weight_tonnes numeric(8,2) not null check (weight_tonnes >= 0),
  supplier text,
  cost_paise bigint not null default 0 check (cost_paise >= 0),
  status text not null default 'active' check (status in ('active','consumed','archived')),
  created_at timestamptz not null default now()
);

create table public.slabs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  length_in numeric(7,2) not null check (length_in > 0),
  width_in numeric(7,2) not null check (width_in > 0),
  -- square feet, computed in the database so it's always correct
  sqft numeric(10,2) generated always as (round(length_in * width_in / 144.0, 2)) stored,
  thickness_mm numeric(6,1),
  godown text,
  rate_paise bigint not null default 0 check (rate_paise >= 0), -- per sq-ft
  status text not null default 'in_stock' check (status in ('in_stock','reserved','sold')),
  created_at timestamptz not null default now()
);

create index idx_blocks_company on public.blocks(company_id);
create index idx_slabs_company on public.slabs(company_id);
create index idx_slabs_block on public.slabs(block_id);

alter table public.blocks enable row level security;
alter table public.blocks force row level security;
alter table public.slabs enable row level security;
alter table public.slabs force row level security;

create policy blocks_all on public.blocks for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy slabs_all on public.slabs for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
