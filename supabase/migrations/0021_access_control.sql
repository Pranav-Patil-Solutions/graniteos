-- 0021_access_control.sql — per-company module-level access control.
--
-- Config shape stored in JSONB:
--   { "sales_manager": { "quotes": "edit", "orders": "edit", ... },
--     "store_manager":  { ... },
--     "fabrication_supervisor": { ... } }
-- Levels: "edit" | "view" | "none"
-- Owner is always "edit" for every module — hardcoded in app logic, not stored.
--
-- IDEMPOTENT: uses CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE.

-- ── 1. Table ─────────────────────────────────────────────────────────────────

create table if not exists public.access_control (
  company_id  uuid primary key references public.companies(id) on delete cascade,
  config      jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

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

-- ── 3. Default config constant (used both here and in the app) ───────────────
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

-- ── 4. Seed defaults when a company is created (via trigger on companies) ────

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
