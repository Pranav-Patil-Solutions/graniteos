-- 0016_product_keys.sql — per-company product-key activation.
-- New companies must redeem an unused product key at setup. Existing companies
-- are untouched (setup_company only ever runs once per account), so current
-- logins never see a key prompt.

create table if not exists public.product_keys (
  key text primary key,                -- canonical form: GRNT-XXXX-XXXX-XXXX (uppercase)
  plan text not null default 'standard',
  status text not null default 'unused' check (status in ('unused','used','revoked')),
  company_id uuid references public.companies(id),
  note text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Service-role / security-definer access only: RLS on, no policies.
alter table public.product_keys enable row level security;

-- Replace setup_company: drop the keyless signature so it cannot be bypassed
-- by older clients, then recreate with a required product key.
drop function if exists public.setup_company(text,text,text,text,text,text);

create or replace function public.setup_company(
  p_company_name text, p_city text, p_owner_name text,
  p_phone text default null, p_address text default null, p_gst_number text default null,
  p_product_key text default null
) returns public.users language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_user public.users; v_key text; v_status text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.users where auth_user_id = auth.uid()) then
    raise exception 'already_setup';
  end if;

  -- normalize: uppercase, strip everything but letters/digits (dashes optional for the user)
  v_key := upper(regexp_replace(coalesce(p_product_key, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_key = '' then raise exception 'product_key_required'; end if;

  -- row-lock the key so two signups can't redeem it simultaneously
  select status into v_status from public.product_keys
    where regexp_replace(key, '[^A-Z0-9]', '', 'g') = v_key
    for update;
  if v_status is null then raise exception 'invalid_product_key'; end if;
  if v_status <> 'unused' then raise exception 'product_key_used'; end if;

  insert into public.companies (name, city, phone, address, gst_number)
  values (p_company_name, p_city, p_phone, p_address, nullif(p_gst_number, ''))
  returning id into v_company_id;

  insert into public.users (company_id, auth_user_id, phone, name, role, status, last_active_at)
  values (v_company_id, auth.uid(), p_phone, p_owner_name, 'owner', 'active', now())
  returning * into v_user;

  update public.product_keys
    set status = 'used', company_id = v_company_id, used_at = now()
    where regexp_replace(key, '[^A-Z0-9]', '', 'g') = v_key;

  return v_user;
end;
$$;

grant execute on function public.setup_company(text,text,text,text,text,text,text) to authenticated;
