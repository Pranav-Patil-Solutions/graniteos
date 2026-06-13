-- 0020_product_key_seats.sql — add seat limit + issuance metadata to product_keys,
-- enforce via a BEFORE INSERT trigger on users, and expose a helper SQL function
-- for minting keys from the Supabase dashboard.
--
-- IDEMPOTENT: uses ALTER TABLE ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE.
-- Safe to run against a DB that already has the columns (no-ops).

-- ── 1. Extend product_keys ───────────────────────────────────────────────────

alter table public.product_keys
  add column if not exists max_users  int         not null default 3,
  add column if not exists notes      text,
  add column if not exists issued_to  text,
  add column if not exists issued_at  timestamptz;

-- ── 2. make_product_key() — mint a key from the Supabase SQL editor ─────────
-- Usage: SELECT make_product_key('standard', 5, 'Ramesh Stone Mart, +91 99999');

create or replace function public.make_product_key(
  p_plan      text    default 'standard',
  p_max_users int     default 3,
  p_issued_to text    default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_len int := length(v_alphabet);
  i int;

  -- Build one 4-char group using gen_random_bytes for unbiased randomness.
  function_body text;
begin
  -- Build GRNT-XXXX-XXXX-XXXX key (same alphabet as the Node script)
  loop
    v_key := 'GRNT';
    for grp in 1..3 loop
      v_key := v_key || '-';
      for i in 1..4 loop
        v_key := v_key ||
          substr(v_alphabet,
                 (get_byte(extensions.gen_random_bytes(1), 0) % v_len) + 1,
                 1);
      end loop;
    end loop;

    begin
      insert into public.product_keys (key, plan, max_users, issued_to, issued_at)
      values (v_key, p_plan, p_max_users, p_issued_to, now());
      exit; -- success, leave loop
    exception when unique_violation then
      -- Collision (astronomically rare) — retry.
      null;
    end;
  end loop;

  return v_key;
end;
$$;

-- Owner / service role only: no public grant.
revoke all on function public.make_product_key(text, int, text) from public;

-- ── 3. Seat-limit trigger on users INSERT ───────────────────────────────────
-- Fires before every new row lands in users.
-- • Companies that have no product_key row yet (setup_company pre-links,
--   or legacy companies) → unlimited.
-- • Invited rows (status='invited') count against the seat limit so the owner
--   cannot queue up more invites than they have seats.

create or replace function public.check_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max_users  int;
  v_seat_count int;
begin
  -- Look up the key that was redeemed for this company.
  -- (company_id is NULL on the key during setup_company's own INSERT, so
  --  this returns NULL → we skip the check and allow the owner row.)
  select pk.max_users into v_max_users
  from   public.product_keys pk
  where  pk.company_id = new.company_id
  limit  1;

  -- No key linked yet (owner creation during setup, or legacy company) → allow.
  if v_max_users is null then
    return new;
  end if;

  -- Count all existing rows for this company (active + invited + any other status).
  select count(*) into v_seat_count
  from   public.users
  where  company_id = new.company_id;

  if v_seat_count >= v_max_users then
    raise exception 'seat_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_seat_limit on public.users;
create trigger enforce_seat_limit
  before insert on public.users
  for each row execute function public.check_seat_limit();
