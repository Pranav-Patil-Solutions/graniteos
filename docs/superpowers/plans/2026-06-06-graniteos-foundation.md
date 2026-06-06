# GraniteOS — Foundation (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the GraniteOS UI-only demo into a real, deployable multi-tenant Foundation: phone-OTP auth, company setup, team invites, RLS-isolated data, and a role-aware app shell — backed by Supabase.

**Architecture:** Next.js 15 (App Router, TS, Tailwind) on the front; Supabase (Postgres + phone-OTP Auth + RLS) on the back. All DB mutations go through `SECURITY DEFINER` RPCs (owned by `postgres`, so they bypass RLS); all reads are RLS-scoped to the caller's company. The browser never sees the service-role key. The existing demo `src/lib/demo.ts` (localStorage session) is deleted and replaced by real Supabase session + a `my_user()` RPC that answers "who am I".

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 3, `@supabase/ssr`, `@supabase/supabase-js`, Zod, Vitest (pure-logic unit tests), `server-only`.

**Reference spec:** `docs/superpowers/specs/2026-06-05-graniteos-foundation-design.md`

**Spec deviations (deliberate, noted here):**
- Auth helper functions live in `public` (`current_company_id()`, `current_user_role()`, `current_app_user_id()`) instead of the `auth` schema — safer than editing Supabase's `auth` schema, and they read the `users` table via `SECURITY DEFINER` (owned by `postgres`, which has `BYPASSRLS`, so no policy recursion). This is the spec's documented "fallback to a users-table query" path, chosen as the primary path for reliability over the JWT-claims hook (the hook can be added later as a perf optimization without changing app code).
- `companies`/`users`/`display_number_sequences` get **no INSERT/DELETE policies** — those paths are RPC-only by design, so default-deny is correct and matches the spec's "RPC only" intent.
- Dev uses Supabase **test OTP phone numbers** (no SMS provider, no cost). A real SMS provider (MSG91/Twilio for India) is out of scope for Foundation and wired at deploy time.

**Working directory:** `D:\vyaparwerk\graniteos` (all paths below are relative to it).

---

## File Structure

**Created:**
- `.gitignore`, `.env.example`, `.env.local` (gitignored)
- `vitest.config.ts`
- `supabase/migrations/0001_foundation_schema.sql`
- `supabase/migrations/0002_foundation_rpcs.sql`
- `supabase/migrations/0003_foundation_rls.sql`
- `supabase/tests/verify_foundation.sql` (manual verification script)
- `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `middleware.ts`
- `src/lib/roles.ts` (migrated from `demo.ts`, no localStorage)
- `src/lib/permissions.ts` + `src/lib/permissions.test.ts`
- `src/lib/validation.ts` + `src/lib/validation.test.ts`
- `src/lib/auth.ts`
- `src/actions/auth.ts`, `src/actions/company.ts`, `src/actions/team.ts`
- `src/middleware.ts`
- `src/app/invite/accept/page.tsx`
- `src/components/team/InviteForm.tsx`
- `src/components/auth/SignOutButton.tsx`
- `public/manifest.webmanifest`

**Modified:**
- `package.json`, `next.config.ts`
- `src/app/layout.tsx` (PWA manifest + viewport)
- `src/app/page.tsx` (root → session-based redirect)
- `src/app/(auth)/login/page.tsx` (real OTP)
- `src/app/(auth)/setup/page.tsx` (real RPC)
- `src/app/(app)/layout.tsx` (server component, `requireSession`)
- `src/app/(app)/dashboard/page.tsx` (server component)
- `src/app/(app)/team/page.tsx` (server component + invite form)
- `src/components/layout/AppShell.tsx` (role via prop, no localStorage)

**Deleted:**
- `src/lib/demo.ts`

---

## Task 1: Project hygiene — gitignore, deps, env, config

**Files:**
- Create: `.gitignore`, `.env.example`, `vitest.config.ts`
- Modify: `package.json`, `next.config.ts`

- [ ] **Step 1: Add `.gitignore`** (repo currently has none — must exist before any commit)

Create `.gitignore`:
```gitignore
node_modules
.next
out
.env
.env.local
.env*.local
*.log
.DS_Store
coverage
```

- [ ] **Step 2: Install dependencies**

Run (from `D:\vyaparwerk\graniteos`):
```bash
npm install @supabase/supabase-js @supabase/ssr zod server-only
npm install -D vitest
```
Expected: `package.json` gains those deps; `npm install` exits 0.

- [ ] **Step 3: Add the `test` script to `package.json`**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 5: Create `.env.example`** (committed; documents required vars)

```bash
# Supabase project (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only. NEVER expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=
# Used to build invite links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 6: Update `next.config.ts`** (allow localhost server actions; harmless default)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

export default nextConfig;
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example vitest.config.ts package.json package-lock.json next.config.ts
git commit -m "chore: add deps, gitignore, env template, vitest config"
```

---

## Task 2: HUMAN SETUP — create the Supabase project (CHECKPOINT)

> This is a human step. Hand these instructions to Pranav and wait. Nothing in later tasks works until `.env.local` is filled and migrations can run. **No SMS cost** — we use test OTP numbers.

- [ ] **Step 1: Create the project**
  1. Go to https://supabase.com → sign in (GitHub is fine) → **New project**.
  2. Name: `graniteos`. Database password: pick a strong one and save it.
  3. Region: **South Asia (Mumbai) `ap-south-1`**.
  4. Wait ~2 minutes for provisioning.

- [ ] **Step 2: Copy the three keys** (Project → **Settings → API**)
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Enable Phone auth with a test number** (Auth → **Providers → Phone**)
  1. Toggle **Phone** provider ON. Leave the SMS provider unconfigured (we won't send real SMS yet).
  2. Expand **Test OTP** (a.k.a. "Test phone numbers") and add:
     - Phone: `+919999999999`  →  Code: `123456`
  3. Save. This phone/code pair logs in instantly with **no SMS sent**.

- [ ] **Step 4: Fill `.env.local`** (create the file in the repo root; it is gitignored)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # service_role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Confirm** both keys are present and the test number is saved before continuing.

---

## Task 3: Database — schema migration (3 tables + indexes)

**Files:**
- Create: `supabase/migrations/0001_foundation_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply it** — open Supabase → **SQL Editor** → paste the whole file → **Run**.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify** — in SQL Editor run:
```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```
Expected rows: `companies`, `display_number_sequences`, `users`.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0001_foundation_schema.sql
git commit -m "feat(db): foundation schema — companies, users, sequences"
```

---

## Task 4: Database — auth helpers + RPCs

**Files:**
- Create: `supabase/migrations/0002_foundation_rpcs.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply** — SQL Editor → paste → Run. Expected: "Success. No rows returned."

- [ ] **Step 3: Verify the functions exist** — run:
```sql
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('my_user','setup_company','create_team_invite',
                  'accept_invite','generate_display_number','current_company_id')
order by proname;
```
Expected: all six names listed.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0002_foundation_rpcs.sql
git commit -m "feat(db): auth helpers and foundation RPCs"
```

---

## Task 5: Database — RLS policies + isolation verification

**Files:**
- Create: `supabase/migrations/0003_foundation_rls.sql`, `supabase/tests/verify_foundation.sql`

- [ ] **Step 1: Write the RLS migration**

```sql
-- 0003_foundation_rls.sql — multi-tenant isolation.
-- No INSERT/DELETE policies: those go through SECURITY DEFINER RPCs only.
alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.users enable row level security;
alter table public.users force row level security;
alter table public.display_number_sequences enable row level security;
alter table public.display_number_sequences force row level security;

-- companies: read own; owner updates own.
create policy companies_select on public.companies for select
  using (id = public.current_company_id());
create policy companies_update on public.companies for update
  using (id = public.current_company_id() and public.current_user_role() = 'owner')
  with check (id = public.current_company_id() and public.current_user_role() = 'owner');

-- users: read same company; owner or self may update (within same company).
create policy users_select on public.users for select
  using (company_id = public.current_company_id());
create policy users_update on public.users for update
  using (company_id = public.current_company_id()
         and (public.current_user_role() = 'owner' or auth_user_id = auth.uid()))
  with check (company_id = public.current_company_id());

-- sequences: read own company; writes are RPC-only (no insert/update/delete policy).
create policy seq_select on public.display_number_sequences for select
  using (company_id = public.current_company_id());
```

- [ ] **Step 2: Apply** — SQL Editor → paste → Run. Expected: "Success."

- [ ] **Step 3: Write the verification script** `supabase/tests/verify_foundation.sql`

```sql
-- Manual RLS + RPC verification. Run blocks in the SQL Editor.
-- NOTE: the SQL Editor runs as a privileged role; to truly exercise RLS use
-- the app (Task 12). These checks confirm structure + RPC behavior.

-- 1. Display number formatting (uses a throwaway company id).
do $$
declare cid uuid; n1 text; n2 text;
begin
  insert into public.companies (name, city) values ('VERIFY CO', 'Test') returning id into cid;
  n1 := public.generate_display_number(cid, 'quote');
  n2 := public.generate_display_number(cid, 'quote');
  raise notice 'quote numbers: % then %', n1, n2;  -- expect QT-YYYY-0001 then -0002
  raise notice 'customer number: %', public.generate_display_number(cid, 'customer'); -- CUST-0001
  delete from public.companies where id = cid;  -- cascade cleans sequences
end $$;

-- 2. RLS is enabled + forced on all three tables.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('companies','users','display_number_sequences')
order by relname;  -- expect all true/true
```

- [ ] **Step 4: Run the verification script** in the SQL Editor.
Expected NOTICEs: `QT-<year>-0001` then `QT-<year>-0002`; `CUST-0001`; and the final table shows `relrowsecurity = true`, `relforcerowsecurity = true` for all three tables.

- [ ] **Step 5: Commit**
```bash
git add supabase/migrations/0003_foundation_rls.sql supabase/tests/verify_foundation.sql
git commit -m "feat(db): RLS policies and verification script"
```

---

## Task 6: Supabase client libraries

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/middleware.ts`

> Architecture rule: these are the ONLY files that import `@supabase/*`.

- [ ] **Step 1: `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes cookies instead.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: `src/lib/supabase/client.ts`** (Realtime/browser only)

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: `src/lib/supabase/admin.ts`** (service role — server only)

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

- [ ] **Step 4: `src/lib/supabase/middleware.ts`** (session refresh + route guard)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/invite", "/api/auth"];

function isPublic(path: string) {
  if (path === "/") return true;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (these files only). If `cookies()` typing complains, ensure `next@^15` is installed (Task 1).

- [ ] **Step 6: Commit**
```bash
git add src/lib/supabase
git commit -m "feat: supabase server/client/admin/middleware clients"
```

---

## Task 7: Pure logic — roles, permissions (TDD), validation (TDD)

**Files:**
- Create: `src/lib/roles.ts`
- Create: `src/lib/permissions.ts`, `src/lib/permissions.test.ts`
- Create: `src/lib/validation.ts`, `src/lib/validation.test.ts`

- [ ] **Step 1: Create `src/lib/roles.ts`** (migrated from `demo.ts`, no localStorage)

```ts
export type Role = "owner" | "sales_manager" | "store_manager" | "fabrication_supervisor";

export const ROLES: Role[] = ["owner", "sales_manager", "store_manager", "fabrication_supervisor"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  sales_manager: "Sales Manager",
  store_manager: "Store Manager",
  fabrication_supervisor: "Fabrication Supervisor",
};

export const ROLE_BADGE: Record<Role, string> = {
  owner: "bg-granite-green text-white",
  sales_manager: "bg-blue-100 text-blue-800",
  store_manager: "bg-orange-100 text-orange-800",
  fabrication_supervisor: "bg-purple-100 text-purple-800",
};

export type TabKey = "home" | "inventory" | "orders" | "quotes" | "payments" | "fabrication";

export const TABS: Record<TabKey, { label: string; href: string }> = {
  home: { label: "Home", href: "/dashboard" },
  inventory: { label: "Inventory", href: "/inventory" },
  orders: { label: "Orders", href: "/orders" },
  quotes: { label: "Quotes", href: "/quotes" },
  payments: { label: "Payments", href: "/payments" },
  fabrication: { label: "Fabrication", href: "/fabrication" },
};

export const NAV_TABS_BY_ROLE: Record<Role, TabKey[]> = {
  owner: ["home", "inventory", "orders", "quotes", "payments"],
  sales_manager: ["home", "inventory", "orders", "quotes"],
  store_manager: ["home", "inventory", "orders"],
  fabrication_supervisor: ["home", "fabrication", "orders"],
};
```

- [ ] **Step 2: Write the failing permissions test** `src/lib/permissions.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { can } from "./permissions";

describe("can()", () => {
  it("lets only the owner invite team members", () => {
    expect(can("owner", "inviteTeamMember")).toBe(true);
    expect(can("sales_manager", "inviteTeamMember")).toBe(false);
    expect(can("store_manager", "inviteTeamMember")).toBe(false);
  });

  it("lets owner and sales_manager create quotes", () => {
    expect(can("owner", "createQuote")).toBe(true);
    expect(can("sales_manager", "createQuote")).toBe(true);
    expect(can("store_manager", "createQuote")).toBe(false);
  });

  it("lets store_manager log inward receipts", () => {
    expect(can("store_manager", "logInwardReceipt")).toBe(true);
    expect(can("sales_manager", "logInwardReceipt")).toBe(false);
  });
});
```

- [ ] **Step 3: Run it — expect FAIL**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: FAIL — cannot find module `./permissions`.

- [ ] **Step 4: Implement `src/lib/permissions.ts`**

```ts
import type { Role } from "./roles";

export type Permission =
  | "inviteTeamMember"
  | "deactivateUser"
  | "viewCompanySettings"
  | "createQuote"
  | "confirmOrder"
  | "logInwardReceipt";

// owner-weighted map; later slices reference these permissions as they land.
const PERMISSIONS: Record<Permission, Role[]> = {
  inviteTeamMember: ["owner"],
  deactivateUser: ["owner"],
  viewCompanySettings: ["owner"],
  createQuote: ["owner", "sales_manager"],
  confirmOrder: ["owner", "sales_manager"],
  logInwardReceipt: ["owner", "store_manager"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: 3 passing.

- [ ] **Step 6: Write the failing validation test** `src/lib/validation.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { phoneSchema, otpSchema, companySetupSchema } from "./validation";

describe("phoneSchema", () => {
  it("accepts E.164-ish numbers", () => {
    expect(phoneSchema.safeParse("+919999999999").success).toBe(true);
  });
  it("rejects junk", () => {
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("requires exactly 6 digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("123").success).toBe(false);
  });
});

describe("companySetupSchema", () => {
  it("accepts a minimal valid company", () => {
    const r = companySetupSchema.safeParse({
      companyName: "Sharma Stone", city: "Jamnagar", ownerName: "Ramesh",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a too-short company name", () => {
    const r = companySetupSchema.safeParse({ companyName: "S", city: "X", ownerName: "Ramesh" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 7: Run — expect FAIL** (`./validation` missing)

Run: `npx vitest run src/lib/validation.test.ts`
Expected: FAIL.

- [ ] **Step 8: Implement `src/lib/validation.ts`**

```ts
import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number");

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export const gstSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GST number",
  );

export const companySetupSchema = z.object({
  companyName: z.string().trim().min(2).max(100),
  city: z.string().trim().min(1, "City is required"),
  ownerName: z.string().trim().min(2).max(60),
  phone: phoneSchema.optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  gstNumber: gstSchema.optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  role: z.enum(["sales_manager", "store_manager", "fabrication_supervisor"]),
});

export type CompanySetupInput = z.infer<typeof companySetupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
```

- [ ] **Step 9: Run the full suite — expect PASS**

Run: `npm test`
Expected: all permissions + validation tests pass.

- [ ] **Step 10: Commit**
```bash
git add src/lib/roles.ts src/lib/permissions.ts src/lib/permissions.test.ts src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: roles, permissions, and zod validation with tests"
```

---

## Task 8: Auth core — `requireSession` / `getCurrentUser`

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Implement `src/lib/auth.ts`**

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export type AppUser = {
  id: string;
  company_id: string;
  name: string;
  role: Role;
  phone: string | null;
  status: string;
};

/** The current app user (via the my_user RPC), or null if not signed in / no row yet. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("my_user");
  if (!data) return null;
  return data as AppUser;
}

/** Use at the top of every protected page/action. Redirects to /login if absent. */
export async function requireSession(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/lib/auth.ts
git commit -m "feat: auth core (requireSession/getCurrentUser via my_user RPC)"
```

---

## Task 9: Server actions — auth, company, team

**Files:**
- Create: `src/actions/auth.ts`, `src/actions/company.ts`, `src/actions/team.ts`

> Architecture rule: all UI writes go through these `"use server"` actions.

- [ ] **Step 1: `src/actions/auth.ts`**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneSchema, otpSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export async function sendOtp(phone: string) {
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function verifyOtp(phone: string, token: string) {
  const p = phoneSchema.safeParse(phone);
  const t = otpSchema.safeParse(token);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!t.success) return { error: t.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: p.data,
    token: t.data,
    type: "sms",
  });
  if (error) return { error: error.message };

  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true as const };
}
```

- [ ] **Step 2: `src/actions/company.ts`**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { companySetupSchema } from "@/lib/validation";

export async function setupCompany(input: unknown) {
  const parsed = companySetupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const v = parsed.data;
  const { error } = await supabase.rpc("setup_company", {
    p_company_name: v.companyName,
    p_city: v.city,
    p_owner_name: v.ownerName,
    p_phone: v.phone || null,
    p_address: v.address || null,
    p_gst_number: v.gstNumber || null,
  });
  if (error) {
    if (error.message.includes("already_setup")) return { error: "Company already set up." };
    return { error: error.message };
  }
  return { ok: true as const };
}
```

- [ ] **Step 3: `src/actions/team.ts`**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validation";

export async function inviteTeamMember(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) return { error: "Only the owner can invite members." };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team_invite", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_role: parsed.data.role,
  });
  if (error) return { error: error.message };

  const token = (data as { invite_token: string }).invite_token;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true as const, inviteUrl: `${base}/invite/accept?token=${token}` };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    if (error.message.includes("invite_invalid_or_expired"))
      return { error: "This invite is invalid or has expired." };
    return { error: error.message };
  }
  return { ok: true as const };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**
```bash
git add src/actions
git commit -m "feat: server actions for auth, company setup, team invites"
```

---

## Task 10: Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/middleware.ts
git commit -m "feat: middleware session refresh and route guard"
```

---

## Task 11: Wire the UI to real auth (replace demo)

**Files:**
- Modify: `src/components/layout/AppShell.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/team/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/setup/page.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`
- Create: `src/components/auth/SignOutButton.tsx`, `src/components/team/InviteForm.tsx`, `src/app/invite/accept/page.tsx`, `public/manifest.webmanifest`
- Delete: `src/lib/demo.ts`

- [ ] **Step 1: `AppShell.tsx` — take `role` as a prop, drop localStorage**

Replace the whole file with:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS_BY_ROLE, TABS, type Role, type TabKey } from "@/lib/roles";

const ICONS: Record<TabKey, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  inventory: <path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
  orders: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  quotes: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  fabrication: (
    <>
      <path d="M3 21h18M5 21V9l5 3V9l5 3V9l4 3v9" />
    </>
  ),
};

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = NAV_TABS_BY_ROLE[role];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around h-16 max-w-lg mx-auto">
          {tabs.map((key) => {
            const tab = TABS[key];
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={key}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-1"
                style={{ color: active ? "#0F4C35" : "#64748B" }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[key]}
                </svg>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: `src/app/(app)/layout.tsx` — server component, gate + pass role**

Replace the whole file with:
```tsx
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  return <AppShell role={user.role}>{children}</AppShell>;
}
```

- [ ] **Step 3: Create `src/components/auth/SignOutButton.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { signOutAction } from "@/actions/auth";

export default function SignOutButton() {
  const router = useRouter();
  async function onClick() {
    await signOutAction();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      className="text-sm text-slate-500 hover:text-slate-700 !min-h-0"
    >
      Sign out
    </button>
  );
}
```

- [ ] **Step 4: `src/app/(app)/dashboard/page.tsx` — server component**

Replace the whole file with:
```tsx
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ROLE_LABELS, ROLE_BADGE } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import SignOutButton from "@/components/auth/SignOutButton";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireSession();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", user.company_id)
    .single();

  const isOwner = can(user.role, "inviteTeamMember");

  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{greeting()},</p>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{company?.name ?? ""}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE[user.role]}`}
        >
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card title="Inventory" sub="Slice 3" />
        <Card title="Orders" sub="Slice 4" />
        <Card title="Quotes" sub="Slice 4" />
        {isOwner ? (
          <Link
            href="/team"
            className="rounded-2xl border border-granite-green/30 bg-granite-green/5 p-4 block"
          >
            <p className="font-semibold text-granite-green">Team</p>
            <p className="text-xs text-granite-green/70 mt-1">Manage &amp; invite</p>
          </Link>
        ) : (
          <Card title="Payments" sub="Slice 6" />
        )}
      </div>

      <div className="mt-6 rounded-xl bg-granite-green/5 border border-granite-green/20 p-4 text-sm text-granite-green">
        ✅ Foundation (Slice 1) — auth, company setup, role-aware navigation, and
        team management. Business modules land in later slices.
      </div>
    </div>
  );
}

function Card({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
```

- [ ] **Step 5: `src/app/(auth)/login/page.tsx` — real OTP, honoring `redirectTo`**

Replace the whole file with:
```tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp } from "@/actions/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await verifyOtp(phone, otp);
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace(redirectTo || res.next!);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-granite-green text-white flex items-center justify-center text-2xl font-bold">
          G
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">GraniteOS</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "phone"
            ? "Sign in to your granite business"
            : `Enter the code sent to ${phone}`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={onSendOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 99999 99999"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-base focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <PrimaryButton loading={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </PrimaryButton>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              style={{ height: 64 }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-center text-2xl tracking-[0.5em] focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <PrimaryButton loading={loading}>
            {loading ? "Verifying..." : "Verify & continue"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Use a different phone number
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function PrimaryButton({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-granite-green text-white font-semibold text-base disabled:opacity-60 hover:opacity-95 transition"
    >
      {children}
    </button>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
      {children}
    </div>
  );
}
```

- [ ] **Step 6: `src/app/(auth)/setup/page.tsx` — real RPC**

Replace the whole file with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setupCompany } from "@/actions/company";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await setupCompany({
      companyName: fd.get("companyName"),
      city: fd.get("city"),
      ownerName: fd.get("ownerName"),
      phone: fd.get("phone") ?? "",
      address: fd.get("address") ?? "",
      gstNumber: fd.get("gstNumber") ?? "",
    });
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Set up your company</h1>
        <p className="mt-1 text-sm text-slate-500">
          One-time setup. You can change these later in settings.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="companyName" label="Company name" placeholder="Sharma Stone Industries" required />
        <Field name="city" label="City" placeholder="Jamnagar" required />
        <Field name="ownerName" label="Your name" placeholder="Ramesh Sharma" required />
        <Field name="phone" label="Phone number" placeholder="+91 99999 99999" type="tel" />
        <Field name="address" label="Address (optional)" placeholder="Plot 14, GIDC, Jamnagar" />
        <Field name="gstNumber" label="GST number (optional)" placeholder="22AAAAA0000A1Z5" />
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-granite-green text-white font-semibold text-base disabled:opacity-60 hover:opacity-95 transition"
        >
          {loading ? "Creating..." : "Create company"}
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-base focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 7: Create `src/components/team/InviteForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/actions/team";

export default function InviteForm() {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInviteUrl("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await inviteTeamMember({
      name: fd.get("name"),
      phone: fd.get("phone"),
      role: fd.get("role"),
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    setInviteUrl(res.inviteUrl!);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-800">Invite a team member</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input
          name="name"
          required
          placeholder="Name"
          className="w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-granite-green"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="+91 99999 99999"
          className="w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-granite-green"
        />
        <select
          name="role"
          defaultValue="sales_manager"
          className="w-full rounded-xl border border-slate-300 px-4 text-base bg-white"
        >
          <option value="sales_manager">Sales Manager</option>
          <option value="store_manager">Store Manager</option>
          <option value="fabrication_supervisor">Fabrication Supervisor</option>
        </select>
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-granite-green text-white font-semibold disabled:opacity-60"
        >
          {loading ? "Creating invite..." : "Send invite"}
        </button>
      </form>
      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-granite-green/5 border border-granite-green/20 p-3">
          <p className="text-xs text-granite-green/80">
            Invite link — send it to the member:
          </p>
          <p className="text-xs font-mono break-all text-granite-green">{inviteUrl}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: `src/app/(app)/team/page.tsx` — server component (owner-only) + member list**

Replace the whole file with:
```tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import InviteForm from "@/components/team/InviteForm";

export default async function TeamPage() {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id, name, phone, role, status")
    .order("created_at", { ascending: true });

  const list = (members ?? []) as {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
    status: string;
  }[];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-slate-900">Team</h1>
      <p className="text-sm text-slate-500">{list.length} member(s)</p>

      <div className="mt-5 space-y-2">
        {list.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="w-10 h-10 rounded-full bg-granite-green text-white flex items-center justify-center font-semibold">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">{m.name}</p>
              <p className="text-xs text-slate-400">{m.phone ?? "—"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">{ROLE_LABELS[m.role]}</span>
              {m.status === "invited" && (
                <p className="text-[11px] text-amber-600 font-medium">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteForm />
    </div>
  );
}
```

- [ ] **Step 9: Create `src/app/invite/accept/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/actions/team";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
  }

  const res = await acceptInvite(token);
  if (res.error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Invite problem</h1>
        <p className="mt-2 text-sm text-red-600">{res.error}</p>
        <a href="/login" className="mt-6 inline-block text-sm text-granite-green underline">
          Back to sign in
        </a>
      </div>
    );
  }
  redirect("/dashboard");
}
```

- [ ] **Step 10: `src/app/page.tsx` — root redirect by session**

Replace the whole file with:
```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
```

- [ ] **Step 11: PWA — `public/manifest.webmanifest` + `src/app/layout.tsx`**

Create `public/manifest.webmanifest`:
```json
{
  "name": "GraniteOS",
  "short_name": "GraniteOS",
  "description": "Operating system for granite & marble businesses",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0F4C35"
}
```

In `src/app/layout.tsx`, ensure the exported `metadata`/`viewport` reference the manifest and theme color. Add (or merge) at the top-level exports:
```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "GraniteOS",
  description: "Operating system for granite & marble businesses",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0F4C35",
  width: "device-width",
  initialScale: 1,
};
```
(Keep the existing `<html>`/`<body>` and font wiring already in the file — only add/replace the `metadata` and `viewport` exports.)

- [ ] **Step 12: Delete the demo module**

```bash
git rm src/lib/demo.ts
```
Then confirm nothing imports it:

Run: `npx grep -r "lib/demo" src` — (or use the editor search). Expected: **no matches**. If any remain, they are leftovers — fix the import to `@/lib/roles`.

- [ ] **Step 13: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; `npm run build` completes with the route list printed and no errors.

- [ ] **Step 14: Commit**
```bash
git add -A
git commit -m "feat: wire UI to real Supabase auth; remove demo session"
```

---

## Task 12: End-to-end verification (Definition of Done)

> Requires `.env.local` filled (Task 2) and all migrations applied (Tasks 3–5).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: ready on `http://localhost:3000`.

- [ ] **Step 2: New-user flow → company setup**
  1. Open `http://localhost:3000` → should redirect to `/login`.
  2. Enter phone `+919999999999` → **Send OTP** → enter code `123456` → **Verify**.
  3. Expected: lands on `/setup` (new user, no company).
  4. Fill company name + city + your name → **Create company**.
  5. Expected: `/dashboard` shows your name, the company name, and an **Owner** badge. Bottom nav shows Home/Inventory/Orders/Quotes/Payments.

- [ ] **Step 3: Owner invites a member**
  1. Tap the **Team** card → `/team`.
  2. Fill name + a second phone (add a 2nd test number in Supabase first, e.g. `+919888888888` → `654321`) + role **Store Manager** → **Send invite**.
  3. Expected: the member appears as **Pending**; an invite link is shown. Copy it.

- [ ] **Step 4: Second user accepts the invite**
  1. Sign out (top-right). In a private/incognito window, paste the invite link.
  2. Expected: redirected to `/login?redirectTo=/invite/accept...`. Sign in with the 2nd test number/code.
  3. Expected: invite auto-accepted → `/dashboard` with a **Store Manager** badge; bottom nav shows only Home/Inventory/Orders.

- [ ] **Step 5: Role guard**
  1. As the store_manager, manually visit `http://localhost:3000/team`.
  2. Expected: redirected to `/dashboard` (owner-only page).

- [ ] **Step 6: Returning user skips setup**
  1. Sign out, sign back in as the owner number.
  2. Expected: straight to `/dashboard` (no `/setup`).

- [ ] **Step 7: RLS isolation spot-check** (in Supabase SQL Editor)
```sql
select c.name as company, count(u.*) as users
from public.companies c left join public.users u on u.company_id = c.id
group by c.name order by c.name;
```
Expected: your one company with 2 users. (Full cross-tenant isolation is enforced by the policies in Task 5; create a second company via a third phone to confirm neither sees the other's `/team` list.)

- [ ] **Step 8: Final gates**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all green.

- [ ] **Step 9: PREVIEW CHECKPOINT (Pranav)** — per the localhost-preview-before-deploy rule, hand Pranav `http://localhost:3000` and walk him through steps 2–6 in his browser. **Get his approval before any deploy.**

- [ ] **Step 10: Commit any fixes**
```bash
git add -A
git commit -m "test: foundation end-to-end verification pass"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Scope (login/setup/team/dashboard) → Tasks 11–12. Stack & architecture rules → Tasks 6, 9 (only `src/lib/supabase/*` imports `@supabase/*`; writes via Server Actions; company/invite via RPC; Zod validation; `requireSession`; no service-role in client). Brand/PWA → Task 11 (manifest, theme, existing 44/52px field styling retained). Roles incl. `fabrication_supervisor` → Task 7. Data model (3 tables + indexes, paise note) → Task 3. RPCs + RLS + JWT-helper intent → Tasks 4–5. Auth flow + middleware → Tasks 6, 9, 10, 11. App shell/nav → Task 11. Permissions map → Task 7. DoD → Task 12.
- **Placeholder scan:** No "TBD"/"add error handling" placeholders — every code step is complete and runnable.
- **Type consistency:** `AppUser` (Task 8) consumed by dashboard/team/layout (Task 11); `Role`/`TabKey`/`NAV_TABS_BY_ROLE` (Task 7) consumed by `AppShell`; `can`/`Permission` consistent across Tasks 7, 9, 11; RPC names (`my_user`, `setup_company`, `create_team_invite`, `accept_invite`) consistent between SQL (Task 4) and actions/auth (Tasks 8–9).
- **Known deviations** documented at top (helpers in `public`, RPC-only writes, test OTP numbers).
