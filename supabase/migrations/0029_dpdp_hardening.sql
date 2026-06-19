-- 0029_dpdp_hardening.sql
-- DPDP Act 2023, S.6 — marketing consent must be explicit and opt-in, not implied.
-- Migration 0015 added notify_new_stock with DEFAULT TRUE, which silently opted every
-- new party into WhatsApp marketing without affirmative consent.
-- This migration flips the default to FALSE for all future rows.

-- ── 1. Flip marketing opt-in default to OFF ────────────────────────────────────
alter table public.parties
  alter column notify_new_stock set default false;

comment on column public.parties.notify_new_stock is
  'DPDP S.6: WhatsApp stock-alert opt-in. Default FALSE (must be affirmatively enabled '
  'by the party or on their behalf by the business owner with documented consent). '
  'Changed from TRUE (0015) to FALSE by 0029 per DPDP Act 2023 S.6.';

-- ── OPTIONAL — reset existing rows (OWNER DECISION REQUIRED) ──────────────────
-- The following statement would set every existing party's opt-in to FALSE,
-- forcing re-collection of explicit consent. This is legally correct under DPDP
-- S.6 if consent was never explicitly obtained, but it will disable WhatsApp alerts
-- for ALL existing parties until each is individually re-opted in.
--
-- The decision to reset existing rows is Pranav's (the Data Fiduciary's) call.
-- Uncomment and run manually after confirming with your legal advisor.
--
-- update public.parties set notify_new_stock = false;
--   ^ Run this in Supabase SQL editor or via a one-off migration ONLY after
--     confirming the consent re-collection flow is live.


-- ── 2. Harden generate_display_number() cross-tenant check ────────────────────
-- The existing check (0022 / 0024) uses:
--   coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
-- This reads the raw JWT claim as a string. Prefer auth.role() which is the
-- built-in Supabase helper and handles role resolution correctly.
-- Function body is otherwise IDENTICAL to 0024 (including the 0024 constraint).

create or replace function public.generate_display_number(
  p_company_id uuid, p_entity_type text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_year  int := extract(year  from now())::int;
  v_month int := extract(month from now())::int;
  v_seq   int;
  v_prefix text;
begin
  -- Use auth.role() (built-in helper) instead of auth.jwt() ->> 'role' (raw claim string).
  -- Both resolve to 'service_role' for service-role callers, but auth.role() is the
  -- canonical Supabase approach and is not affected by custom JWT claim overrides.
  if auth.role() <> 'service_role'
     and p_company_id is distinct from public.current_company_id() then
    raise exception 'forbidden_company';
  end if;

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
    return 'INV\' || v_year::text || '-' || lpad(((v_year + 1) % 100)::text, 2, '0')
      || '\' || lpad(v_seq::text, 4, '0');
  end if;

  v_prefix := case p_entity_type
    when 'quote'          then 'QT'
    when 'order'          then 'ORD'
    when 'customer'       then 'CUST'
    when 'inward'         then 'INW'
    when 'production'     then 'PRD'
    when 'purchase_order' then 'PO'
    when 'purchase_bill'  then 'BILL'
    else 'DOC'
  end;

  if p_entity_type = 'customer' then
    return v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
