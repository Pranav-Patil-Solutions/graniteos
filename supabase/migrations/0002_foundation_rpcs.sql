-- 0002_foundation_rpcs.sql — auth helpers + Foundation RPCs.
-- All functions are SECURITY DEFINER. Migrations run as `postgres`, which owns
-- these functions and has BYPASSRLS, so helper reads of public.users do NOT
-- recurse through RLS policies.

-- ── Auth context helpers (read the caller's app-user row) ──────────────
create or replace function public.current_app_user_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.users
  where auth_user_id = auth.uid() and status = 'active' limit 1;
$$;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.users
  where auth_user_id = auth.uid() and status = 'active' limit 1;
$$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.users
  where auth_user_id = auth.uid() and status = 'active' limit 1;
$$;

-- "Who am I" for the app layer (single row or null).
create or replace function public.my_user()
returns public.users language sql stable security definer set search_path = public as $$
  select * from public.users
  where auth_user_id = auth.uid() and status = 'active' limit 1;
$$;

-- ── Display number generator (atomic per company/entity/year) ──────────
create or replace function public.generate_display_number(
  p_company_id uuid, p_entity_type text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now())::int;
  v_seq int;
  v_prefix text;
begin
  insert into public.display_number_sequences (company_id, entity_type, year, last_seq)
  values (p_company_id, p_entity_type, v_year, 1)
  on conflict (company_id, entity_type, year)
  do update set last_seq = public.display_number_sequences.last_seq + 1
  returning last_seq into v_seq;

  v_prefix := case p_entity_type
    when 'quote' then 'QT' when 'order' then 'ORD' when 'customer' then 'CUST'
    when 'inward' then 'INW' when 'production' then 'PRD' when 'invoice' then 'INV'
    else 'DOC' end;

  if p_entity_type = 'customer' then
    return v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- ── setup_company: create company + owner atomically ───────────────────
create or replace function public.setup_company(
  p_company_name text, p_city text, p_owner_name text,
  p_phone text default null, p_address text default null, p_gst_number text default null
) returns public.users language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_user public.users;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.users where auth_user_id = auth.uid()) then
    raise exception 'already_setup';
  end if;

  insert into public.companies (name, city, phone, address, gst_number)
  values (p_company_name, p_city, p_phone, p_address, nullif(p_gst_number, ''))
  returning id into v_company_id;

  insert into public.users (company_id, auth_user_id, phone, name, role, status, last_active_at)
  values (v_company_id, auth.uid(), p_phone, p_owner_name, 'owner', 'active', now())
  returning * into v_user;

  return v_user;
end;
$$;

-- ── create_team_invite: owner-only; upserts an invited user with token ──
create or replace function public.create_team_invite(
  p_name text, p_phone text, p_role text
) returns public.users language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_caller_role text; v_token text; v_user public.users;
begin
  v_company_id := public.current_company_id();
  v_caller_role := public.current_user_role();
  if v_company_id is null then raise exception 'not_authenticated'; end if;
  if v_caller_role <> 'owner' then raise exception 'not_authorized'; end if;
  if p_role not in ('sales_manager','store_manager','fabrication_supervisor') then
    raise exception 'invalid_role';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');  -- 48-char hex

  insert into public.users
    (company_id, phone, name, role, status, invite_token, invite_expires_at)
  values
    (v_company_id, p_phone, p_name, p_role, 'invited', v_token, now() + interval '7 days')
  on conflict (company_id, phone) do update
    set name = excluded.name, role = excluded.role, status = 'invited',
        invite_token = excluded.invite_token, invite_expires_at = excluded.invite_expires_at
  returning * into v_user;

  return v_user;
end;
$$;

-- ── accept_invite: link auth user to an invited row ────────────────────
create or replace function public.accept_invite(p_token text)
returns public.users language plpgsql security definer set search_path = public as $$
declare v_user public.users;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.users
    set auth_user_id = auth.uid(), status = 'active',
        invite_token = null, invite_expires_at = null, last_active_at = now()
  where invite_token = p_token and status = 'invited' and invite_expires_at > now()
  returning * into v_user;

  if v_user.id is null then raise exception 'invite_invalid_or_expired'; end if;
  return v_user;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────
grant execute on function public.my_user() to authenticated;
grant execute on function public.setup_company(text,text,text,text,text,text) to authenticated;
grant execute on function public.create_team_invite(text,text,text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.generate_display_number(uuid,text) to authenticated;
