-- 0025_security_hardening_rls.sql — close privilege-escalation holes found in the
-- 2026-06-14 certification audit (see CERTIFICATION-READINESS-REPORT.md).
--
-- 1) CRITICAL: users_update WITH CHECK only constrained company_id, so any member
--    could `UPDATE public.users SET role='owner' WHERE auth_user_id=auth.uid()`
--    straight through PostgREST and escalate to owner. Lock the privileged columns
--    (role/status/invite_token) for non-owner self-updates.
-- 2) MEDIUM: add FORCE ROW LEVEL SECURITY to access_control and product_keys for
--    consistency with every other table (defence in depth; SECURITY DEFINER RPCs
--    and the table owner still bypass as designed).
-- 3) HIGH: accept_invite() had no explicit "already a member" guard — it leaned on
--    the UNIQUE(auth_user_id) constraint. Add an explicit early-exit so a future
--    schema change can't turn this into a company-hop.

-- ── 1. users_update: role/status/invite are owner-only ─────────────────────────
drop policy if exists users_update on public.users;
create policy users_update on public.users for update
  using (
    company_id = public.current_company_id()
    and (public.current_user_role() = 'owner' or auth_user_id = auth.uid())
  )
  with check (
    company_id = public.current_company_id()
    and (
      public.current_user_role() = 'owner'         -- owners may set any role/status within their company
      or (
        auth_user_id = auth.uid()                  -- non-owners may only edit their OWN row …
        and role = public.current_user_role()      -- … and may NOT change their role (no self-escalation)
        and status = 'active'                       -- … nor deactivate themselves
        and invite_token is null                    -- … nor mint themselves an invite token
      )
    )
  );

-- ── 2. FORCE RLS for consistency ───────────────────────────────────────────────
alter table public.access_control force row level security;
alter table public.product_keys   force row level security;

-- ── 3. accept_invite: explicit double-join guard ───────────────────────────────
create or replace function public.accept_invite(p_token text)
returns public.users language plpgsql security definer set search_path = public as $$
declare v_user public.users;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  -- Already an active member of some company → refuse (prevents company-hop even
  -- if the UNIQUE(auth_user_id) constraint is ever relaxed).
  if exists (
    select 1 from public.users where auth_user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'already_member';
  end if;

  update public.users
    set auth_user_id = auth.uid(), status = 'active',
        invite_token = null, invite_expires_at = null, last_active_at = now()
  where invite_token = p_token and status = 'invited' and invite_expires_at > now()
  returning * into v_user;

  if v_user.id is null then raise exception 'invite_invalid_or_expired'; end if;
  return v_user;
end;
$$;
