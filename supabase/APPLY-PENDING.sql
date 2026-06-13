-- GraniteOS: ALL pending migrations in order. Paste this whole file ONCE into the Supabase SQL editor and Run.
-- Or apply automatically: node scripts/migrate.mjs up  (see scripts/MIGRATIONS.md)
-- Generated 2026-06-13. Safe to re-run (idempotent).

-- ============ 0018_fix_invite_pgcrypto.sql ============
-- 0018_fix_invite_pgcrypto.sql â€” team invites failed with
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

-- ============ 0019_block_photos.sql ============
-- 0019_block_photos.sql â€” real photos for stone blocks.
-- The block list/detail previously showed a procedural CSS texture guessed
-- from the material name, which read as a "random photo". Now: the owner
-- uploads a real photo (camera on mobile); until then a neutral chip shows.
-- Uploads go through a server action with the service role, so the bucket
-- needs no storage RLS policies â€” it just has to exist (public read).

alter table public.blocks add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('stone-photos', 'stone-photos', true)
on conflict (id) do nothing;

-- ============ 0020_product_key_seats.sql ============
-- 0020_product_key_seats.sql â€” add seat limit + issuance metadata to product_keys,
-- enforce via a BEFORE INSERT trigger on users, and expose a helper SQL function
-- for minting keys from the Supabase dashboard.
--
-- IDEMPOTENT: uses ALTER TABLE ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE.
-- Safe to run against a DB that already has the columns (no-ops).

-- â”€â”€ 1. Extend product_keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

alter table public.product_keys
  add column if not exists max_users  int         not null default 3,
  add column if not exists notes      text,
  add column if not exists issued_to  text,
  add column if not exists issued_at  timestamptz;

-- â”€â”€ 2. make_product_key() â€” mint a key from the Supabase SQL editor â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      -- Collision (astronomically rare) â€” retry.
      null;
    end;
  end loop;

  return v_key;
end;
$$;

-- Owner / service role only: no public grant.
revoke all on function public.make_product_key(text, int, text) from public;

-- â”€â”€ 3. Seat-limit trigger on users INSERT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Fires before every new row lands in users.
-- â€¢ Companies that have no product_key row yet (setup_company pre-links,
--   or legacy companies) â†’ unlimited.
-- â€¢ Invited rows (status='invited') count against the seat limit so the owner
--   cannot queue up more invites than they have seats.

create or replace function public.check_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max_users  int;
  v_seat_count int;
begin
  -- Look up the key that was redeemed for this company.
  -- (company_id is NULL on the key during setup_company's own INSERT, so
  --  this returns NULL â†’ we skip the check and allow the owner row.)
  select pk.max_users into v_max_users
  from   public.product_keys pk
  where  pk.company_id = new.company_id
  limit  1;

  -- No key linked yet (owner creation during setup, or legacy company) â†’ allow.
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

-- ============ 0021_access_control.sql ============
-- 0021_access_control.sql â€” per-company module-level access control.
--
-- Config shape stored in JSONB:
--   { "sales_manager": { "quotes": "edit", "orders": "edit", ... },
--     "store_manager":  { ... },
--     "fabrication_supervisor": { ... } }
-- Levels: "edit" | "view" | "none"
-- Owner is always "edit" for every module â€” hardcoded in app logic, not stored.
--
-- IDEMPOTENT: uses CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE.

-- â”€â”€ 1. Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create table if not exists public.access_control (
  company_id  uuid primary key references public.companies(id) on delete cascade,
  config      jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- â”€â”€ 2. RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

alter table public.access_control enable row level security;

-- Any active company member can read.
-- NB: Postgres policies have no IF-NOT-EXISTS form, so drop-then-create for idempotency.
drop policy if exists "ac_read_own" on public.access_control;
create policy "ac_read_own" on public.access_control
  for select using (company_id = public.current_company_id());

-- Only the owner can write.
drop policy if exists "ac_write_owner" on public.access_control;
create policy "ac_write_owner" on public.access_control
  for all using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'owner'
  );

-- â”€â”€ 3. Default config constant (used both here and in the app) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Kept in sync with DEFAULT_CONFIG in src/lib/access-control.ts.

create or replace function public.default_access_config()
returns jsonb language sql immutable as $$
  select '{
    "sales_manager": {
      "quotes":      "edit",
      "orders":      "edit",
      "parties":     "edit",
      "inventory":   "view",
      "money":       "none",
      "fabrication": "none",
      "products":    "none",
      "analytics":   "none",
      "daybook":     "none",
      "import":      "none",
      "team":        "none",
      "settings":    "none"
    },
    "store_manager": {
      "quotes":      "view",
      "orders":      "edit",
      "parties":     "view",
      "inventory":   "edit",
      "money":       "none",
      "fabrication": "view",
      "products":    "none",
      "analytics":   "none",
      "daybook":     "none",
      "import":      "none",
      "team":        "none",
      "settings":    "none"
    },
    "fabrication_supervisor": {
      "quotes":      "none",
      "orders":      "view",
      "parties":     "none",
      "inventory":   "view",
      "money":       "none",
      "fabrication": "edit",
      "products":    "none",
      "analytics":   "none",
      "daybook":     "none",
      "import":      "none",
      "team":        "none",
      "settings":    "none"
    }
  }'::jsonb;
$$;

-- â”€â”€ 4. Seed defaults when a company is created (via trigger on companies) â”€â”€â”€â”€

create or replace function public.seed_access_control()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.access_control (company_id, config)
  values (new.id, public.default_access_config())
  on conflict (company_id) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_access_control_on_company on public.companies;
create trigger seed_access_control_on_company
  after insert on public.companies
  for each row execute function public.seed_access_control();

-- Backfill for any existing companies that don't have a row yet.
insert into public.access_control (company_id, config)
  select id, public.default_access_config()
  from   public.companies
  where  id not in (select company_id from public.access_control)
on conflict (company_id) do nothing;

-- ============ 0022_fix_display_number.sql ============
-- 0022: close the cross-company gap in generate_display_number.
-- The function is SECURITY DEFINER and trusted p_company_id from the caller,
-- letting any authenticated user increment another company's sequences
-- (found by scripts/verify-isolation.mjs). Service-role callers (seed/scripts)
-- are exempt; app callers must match their own company.
-- Body otherwise identical to 0012_gst_compliance.sql.

create or replace function public.generate_display_number(
  p_company_id uuid, p_entity_type text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now())::int;
  v_month int := extract(month from now())::int;
  v_seq int;
  v_prefix text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and p_company_id is distinct from public.current_company_id() then
    raise exception 'forbidden_company';
  end if;

  -- Invoices follow the Indian financial year (Aprâ€“Mar).
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
    when 'quote' then 'QT' when 'order' then 'ORD' when 'customer' then 'CUST'
    when 'inward' then 'INW' when 'production' then 'PRD'
    else 'DOC' end;

  if p_entity_type = 'customer' then
    return v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

