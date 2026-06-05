# GraniteOS — Foundation (Slice #1) Design

**Date:** 2026-06-05
**Status:** Approved (design), pending implementation plan
**Sub-project:** #1 of 7 (Foundation)

---

## Background

GraniteOS is a fresh, unified, mobile-first SaaS operating system for **granite & marble
business owners in India** (INR/paise, GST). It consolidates two prior efforts:

- **StoneOS** — a modern, multi-tenant Next.js 15 + Supabase app already built for this exact
  audience (Sprint 1 shipped: auth, company setup, team). Provides the **stack and architecture**.
- **WerkOS** — a vanilla single-file fabrication/manufacturing ops prototype (BOM, production,
  machines, QC, stock, suppliers, POs, costing). Provides **feature models and SQL** to adapt in
  later slices.

**Decision (2026-06-05):** *Fresh unified rebuild* — a new repo/DB/brand reusing StoneOS's proven
stack + architecture patterns and adapting WerkOS's SQL/feature models. This supersedes the earlier
"two live apps + event sync" plan, which was over-engineering given WerkOS has no live granite users.

The full platform is decomposed into 7 dependency-ordered slices, each with its own
spec → plan → build cycle:

| # | Slice | Delivers | Depends on |
|---|---|---|---|
| **1** | **Foundation** | Repo + stack, phone-OTP auth, company setup, multi-tenant RLS, roles, team/invites, app shell, PWA | — |
| 2 | Parties | Customers + suppliers (CRM, credit limits) | 1 |
| 3 | Catalog & Inventory | Materials/slabs, stock, stock movements, inward receipts | 1 |
| 4 | Quotes & Orders | Quotes (GST, line items, area pricing), order confirmation | 2, 3 |
| 5 | Fabrication | Production tracking, BOM, machines, QC | 3, 4 |
| 6 | Money | Invoices, payments, receivables, costing | 4 |
| 7 | Growth | Marketing content, AI assist | 2 |

**This document specs Slice #1 (Foundation) only.**

---

## 1. Scope

A fresh, deployable shell. A granite/marble owner can:

1. Sign up / log in by phone (OTP).
2. Create their company (one-time setup wizard).
3. Invite team members and assign roles.
4. Land on a role-aware dashboard with a working app shell and bottom navigation.

No business modules are built in this slice — non-Foundation nav tabs render "coming soon"
placeholders. Foundation establishes the repo, brand, DB conventions, auth, and multi-tenancy that
every later slice depends on.

## 2. Stack & Architecture Rules

- **Stack:** Next.js 15 (App Router, TypeScript, Tailwind CSS) + Supabase (Postgres, phone-OTP Auth,
  RLS, Edge Functions) on Vercel. Mobile-first PWA. No external UI component libraries — plain
  Tailwind only.
- **New repo:** `D:\vyaparwerk\graniteos` (new git repo). **New Supabase project.**
- **Architecture rules (carried verbatim from StoneOS — never break):**
  1. The ONLY files importing `@supabase/supabase-js` / `@supabase/ssr` are
     `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` (Realtime only),
     `src/lib/supabase/admin.ts` (cron/service-role only).
  2. All writes from the UI go through Server Actions (`"use server"` in `src/actions/`).
  3. Company creation and invite flows use RPC functions (`setup_company()`,
     `create_team_invite()`, `accept_invite()`) — never direct table inserts.
  4. Validate all user input with Zod before calling Supabase.
  5. `requireSession()` at the top of every protected Server Action and page.
  6. Never expose the service-role key in client-side code.

## 3. Brand

- **Name:** GraniteOS
- **Primary color:** `#0F4C35` (carried from StoneOS; may be revisited).
- **Mobile-first:** minimum tap target 44px, form field minimum height 52px, standalone PWA.

## 4. Roles

`owner | sales_manager | store_manager | fabrication_supervisor`

- The `fabrication_supervisor` role is reserved now so Slice #5 (production/QC/machines) drops in
  without an auth-core migration.
- The JWT carries `company_id`, `user_id`, `role`, injected by a custom access-token Edge Function
  hook. If the hook is unavailable, fall back to a `users` table query on `auth_user_id`
  (`LIMIT 1` always), `status = 'active'`.

## 5. Data Model (3 Foundation tables)

Monetary values are stored in **paise** (1 INR = 100 paise). Naming is unprefixed (single new app).

### `companies`
`id`, `name` (2–100), `city`, `phone`, `address`, `gst_number` (regex validated), `logo_url`,
`default_gst_rate` (0–28, default 18), `default_payment_terms_days` (default 30), `quote_terms_text`,
`status` (`active | suspended | churned`), `created_at`, `updated_at`.

### `users`
`id`, `company_id` (FK → companies CASCADE), `auth_user_id` (UNIQUE, FK → auth.users SET NULL),
`phone`, `name` (2–60), `role` (4-enum), `status` (`active | inactive | invited`), `invite_token`
(UNIQUE), `invite_expires_at`, `last_active_at`, `created_at`. UNIQUE(`company_id`, `phone`).

### `display_number_sequences`
`id`, `company_id` (FK CASCADE), `entity_type` (`quote | order | customer | inward | production |
invoice` — reserved now so later slices need no migration), `year`, `last_seq` (default 0).
UNIQUE(`company_id`, `entity_type`, `year`).

**Indexes:** `idx_users_auth_user_id`, `idx_users_company_id`,
`idx_users_invite_token` (WHERE invite_token IS NOT NULL), `idx_users_name_trgm` (GIN trigram).

## 6. Core RPCs & RLS

**RPCs (all `SECURITY DEFINER`):**
- `generate_display_number(company_id, entity_type)` — atomic UPSERT counter; returns e.g.
  `QT-YYYY-NNNN`, `ORD-YYYY-NNNN`, `CUST-NNNN`, `INW-YYYY-NNNN`, `PRD-YYYY-NNNN`, `INV-YYYY-NNNN`.
- `setup_company(...)` — creates company + owner user atomically; raises `already_setup` if the
  auth user already has a user row.
- `create_team_invite(...)` — creates an `invited` user with a 48-char hex token
  (`gen_random_bytes(24)`), 7-day expiry; upserts on conflict.
- `accept_invite(...)` — validates token not expired, links `auth_user_id`, sets `status = 'active'`;
  raises `invite_invalid_or_expired` if not found.

**JWT helpers:** `auth.company_id()`, `auth.user_role()`, `auth.app_user_id()` reading JWT claims.

**RLS (FORCE ROW LEVEL SECURITY on all three tables):**
- `companies`: SELECT (`id = auth.company_id()`), INSERT (`auth.uid() IS NOT NULL`),
  UPDATE (owner only), DELETE (false).
- `users`: SELECT (same company), INSERT (owner invites OR self-setup when company_id IS NULL),
  UPDATE (owner or self), DELETE (false).
- `display_number_sequences`: SELECT (same company), INSERT/UPDATE/DELETE (false — RPC only).

The anon key alone returns no data.

## 7. Auth Flow

Phone → OTP → branch:
- pending invite for this phone → `/invite/accept`
- new user (no company) → `/setup`
- returning user → `/dashboard`

**Middleware** refreshes the session on every request and guards routes. Public routes:
`/login`, `/invite/*`, `/api/auth/*`, `/` (root). No session + protected route →
`/login?redirectTo=<path>`. Session + `/login` → `/dashboard`. Matcher excludes static assets.

## 8. App Shell & Navigation

Fixed bottom nav, role-filtered via `NAV_TABS_BY_ROLE`:

| Role | Tabs |
|---|---|
| owner | Home, Inventory, Orders, Quotes, Payments |
| sales_manager | Home, Inventory, Orders, Quotes |
| store_manager | Home, Inventory, Orders |
| fabrication_supervisor | Home, Fabrication, Orders |

Active tab color `#0F4C35`; inactive `#64748B`. Non-Foundation tabs render a "coming soon"
placeholder until their slice ships. Dashboard shows greeting, user name, company name, a colored
role badge, sign-out, and placeholder module cards (Team card is real and owner-only → `/team`).

## 9. Permissions Map

`can(role, permission)` backed by a `PERMISSIONS` record (owner-weighted), e.g.
`inviteTeamMember`, `deactivateUser`, `viewCompanySettings` → owner only. The map is seeded with the
known later-slice permissions (createQuote, confirmOrder, logInwardReceipt, etc.) so modules can
reference them as they land, but only team/company permissions are exercised in Foundation.

## 10. Definition of Done

- `npx tsc --noEmit` clean; `npm run build` passes.
- Manual end-to-end flow:
  1. Phone → OTP → `/setup` (new user).
  2. Company setup → `/dashboard` with company name + correct role badge visible.
  3. Owner invites a member; copies invite URL.
  4. Second phone accepts invite → lands on `/dashboard` with correct role.
  5. A `store_manager` is redirected away from owner-only pages (e.g. `/team`).
  6. Sign out → `/login`; sign back in → straight to `/dashboard` (skips `/setup`).
- RLS isolation verified: one company cannot read another company's rows, even via direct API call.

## 11. Out of Scope (later slices)

Customers/suppliers, inventory/stock/inward, quotes/orders, fabrication/BOM/QC/machines,
invoices/payments/receivables/costing, marketing/AI. Each is its own spec → plan → build cycle.

---

## Open Items / Defaults

- **Brand color** defaulted to `#0F4C35`; revisit if a granite-specific palette is preferred.
- **Schema prefix:** none (single new app). Later WerkOS-derived modules adopt GraniteOS-native names,
  not `wos_`.
- **Hosting:** Vercel + new Supabase project; domain TBD (likely a `graniteos` subdomain under the
  VyaparWerk umbrella).
