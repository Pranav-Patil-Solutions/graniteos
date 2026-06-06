-- 0001_foundation_schema.sql — GraniteOS Foundation: tables + indexes
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  city text,
  phone text,
  address text,
  gst_number text,
  logo_url text,
  default_gst_rate numeric(4,2) not null default 18
    check (default_gst_rate >= 0 and default_gst_rate <= 28),
  default_payment_terms_days int not null default 30,
  quote_terms_text text,
  status text not null default 'active'
    check (status in ('active','suspended','churned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  phone text,
  name text not null check (char_length(name) between 2 and 60),
  role text not null
    check (role in ('owner','sales_manager','store_manager','fabrication_supervisor')),
  status text not null default 'active'
    check (status in ('active','inactive','invited')),
  invite_token text unique,
  invite_expires_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, phone)
);

create table public.display_number_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('quote','order','customer','inward','production','invoice')),
  year int not null,
  last_seq int not null default 0,
  unique (company_id, entity_type, year)
);

create index idx_users_auth_user_id on public.users(auth_user_id);
create index idx_users_company_id on public.users(company_id);
create index idx_users_invite_token on public.users(invite_token) where invite_token is not null;
create index idx_users_name_trgm on public.users using gin (name gin_trgm_ops);
