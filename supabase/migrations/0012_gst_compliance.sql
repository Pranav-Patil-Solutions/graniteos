-- 0012_gst_compliance.sql — Phase A: GST compliance (Rule 46 tax invoice).
-- Place-of-supply, CGST/SGST/IGST split, HSN per line, round-off, invoice line
-- items, GSTIN status. All idempotent (add column if not exists).

-- ── Seller (companies) ─────────────────────────────────────────────────────
alter table public.companies add column if not exists legal_name text;
alter table public.companies add column if not exists pan text;
alter table public.companies add column if not exists gst_state_code text;

-- ── Customer / supplier (parties) ──────────────────────────────────────────
alter table public.parties add column if not exists gst_state_code text;
alter table public.parties add column if not exists gstin_status text
  not null default 'unverified'
  check (gstin_status in ('unverified','active','cancelled','suspended'));
alter table public.parties add column if not exists gstin_verified_at timestamptz;
alter table public.parties add column if not exists legal_name text;

-- ── Quote lines: HSN + per-line tax split ──────────────────────────────────
alter table public.quote_items add column if not exists hsn_code text;
alter table public.quote_items add column if not exists line_cgst_paise bigint not null default 0;
alter table public.quote_items add column if not exists line_sgst_paise bigint not null default 0;
alter table public.quote_items add column if not exists line_igst_paise bigint not null default 0;

-- ── Quote head: place of supply + tax totals + round-off ───────────────────
alter table public.quotes add column if not exists place_of_supply text;
alter table public.quotes add column if not exists supply_type text
  check (supply_type in ('intra','inter'));
alter table public.quotes add column if not exists cgst_paise bigint not null default 0;
alter table public.quotes add column if not exists sgst_paise bigint not null default 0;
alter table public.quotes add column if not exists igst_paise bigint not null default 0;
alter table public.quotes add column if not exists round_off_paise bigint not null default 0;
alter table public.quotes add column if not exists reverse_charge boolean not null default false;

-- ── Invoice head: same GST fields ──────────────────────────────────────────
alter table public.invoices add column if not exists place_of_supply text;
alter table public.invoices add column if not exists supply_type text
  check (supply_type in ('intra','inter'));
alter table public.invoices add column if not exists cgst_paise bigint not null default 0;
alter table public.invoices add column if not exists sgst_paise bigint not null default 0;
alter table public.invoices add column if not exists igst_paise bigint not null default 0;
alter table public.invoices add column if not exists round_off_paise bigint not null default 0;
alter table public.invoices add column if not exists reverse_charge boolean not null default false;

-- ── Invoice line items (Rule 46 requires per-line HSN + tax on the invoice) ─
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  slab_id uuid references public.slabs(id) on delete set null,
  description text not null,
  hsn_code text,
  sqft numeric(10,2) not null default 0,
  rate_paise bigint not null default 0,
  gst_rate numeric(4,1) not null default 18,
  line_subtotal_paise bigint not null default 0,
  line_cgst_paise bigint not null default 0,
  line_sgst_paise bigint not null default 0,
  line_igst_paise bigint not null default 0,
  line_total_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_company on public.invoice_items(company_id);

alter table public.invoice_items enable row level security;
alter table public.invoice_items force row level security;

drop policy if exists invoice_items_all on public.invoice_items;
create policy invoice_items_all on public.invoice_items for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ── FY-aware numbering: invoice serials must be consecutive per financial ───
-- year (Apr–Mar). Quotes/orders keep calendar-year numbering. Format:
-- INV/2026-27/0001. Replaces the function from 0002 (same signature).
create or replace function public.generate_display_number(
  p_company_id uuid, p_entity_type text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now())::int;
  v_month int := extract(month from now())::int;
  v_seq int;
  v_prefix text;
begin
  -- Invoices follow the Indian financial year (Apr–Mar).
  if p_entity_type = 'invoice' and v_month < 4 then
    v_year := v_year - 1;
  end if;

  insert into public.display_number_sequences (company_id, entity_type, year, last_seq)
  values (p_company_id, p_entity_type, v_year, 1)
  on conflict (company_id, entity_type, year)
  do update set last_seq = public.display_number_sequences.last_seq + 1
  returning last_seq into v_seq;

  if p_entity_type = 'invoice' then
    return 'INV/' || v_year::text || '-' || lpad(((v_year + 1) % 100)::text, 2, '0')
      || '/' || lpad(v_seq::text, 4, '0');
  end if;

  v_prefix := case p_entity_type
    when 'quote' then 'QT' when 'order' then 'ORD' when 'customer' then 'CUST'
    when 'inward' then 'INW' when 'production' then 'PRD'
    else 'DOC' end;

  if p_entity_type = 'customer' then
    return v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
