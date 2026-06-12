-- 0018_fix_invite_pgcrypto.sql — team invites failed with
-- "function gen_random_bytes(integer) does not exist": pgcrypto was never
-- enabled, and create_team_invite pins search_path = public so it couldn't
-- see the extensions schema anyway. Enable pgcrypto where Supabase keeps
-- extensions and schema-qualify the call.

create extension if not exists pgcrypto with schema extensions;

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

  v_token := encode(extensions.gen_random_bytes(24), 'hex');  -- 48-char hex

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
