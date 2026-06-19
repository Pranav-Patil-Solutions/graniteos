# Takeaways — proven patterns from WohnOS, Spitze Ops, HandelOS/WerkOS

_Phase 1 of the GraniteOS ship-harden pass. Written before any code change. These are the patterns that worked in the sibling products, distilled into things GraniteOS should match. The "GraniteOS gap hypotheses" at the end seed the Phase 2 audit._

Sources studied:
- **WohnOS** (`C:\Users\Pranav\wohnos`) — Next 16 / React 19 / TS / Tailwind 4 / Supabase SSR. The most architecturally mature sibling.
- **Spitze Ops** (`D:\vyaparwerk\spitzee`) — static HTML + vanilla JS + Supabase. Home of the 3-state Master Access Control write-guard.
- **HandelOS** (`C:\Users\Pranav\handelos-brand`) — static marketing site, AI-visibility layer. **WerkOS** (`D:\vyaparwerk\WerkOs`) — GraniteOS's fabrication-schema ancestor.

---

## 1. Architecture decisions that worked

### Auth
- **Three Supabase clients, clearly separated** (WohnOS `src/lib/supabase/{server,client,admin}.ts`): server (anon + SSR cookies, cookie writes wrapped in try/catch), browser (anon only, never service-role), admin (service-role, `persistSession:false`, commented "SERVER ONLY — BYPASSES RLS"). **GraniteOS already has `server.ts`, `client.ts`, `admin.ts`, `middleware.ts` — matches.**
- **Always `getUser()`, never `getSession()`** in middleware/guards — validates the JWT with the Auth server. GraniteOS middleware + `requireSession()` already do this. ✔
- **Defence in depth, four layers**: edge middleware gates routes → app-group layout re-verifies + RBAC + AAL2 → each mutating server action re-checks → (WohnOS) API routes call `authorize()`. GraniteOS uses layers 1–3; it has no API routes (all server actions).
- **AAL2/MFA enforced before any protected page**, not just at login. GraniteOS `requireSession()` calls `needsMfaRedirect()` → `/mfa`. ✔ (matches WohnOS's strongest auth feature).
- **Dev-login without email** (WohnOS `/api/dev-login`, gated by env flag; Spitze `@tenant.internal` username→email trick). Useful for local QA. GraniteOS has a product-key/login flow; a gated one-click dev login would speed verification but is optional.

### RBAC
- **Single source of truth for role→access** resolved by the same function everywhere (WohnOS `canAccessPath` longest-prefix match; Spitze `accessLevel(secId)`). GraniteOS centralises this in `src/lib/access-control.ts` (`accessFor`) + `src/lib/roles.ts` (`NAV_TABS_BY_ROLE`). ✔
- **3-state access (none / view / edit)** stored as JSONB config, runtime-editable by the owner — Spitze's headline pattern. **GraniteOS already implements this server-side**: `access_control.config` table (migration 0021), `requireEditAccess(module)` returns `{user}`|`{error}`, `getAccessLevel(module)` for pages, owner always full. This is the right shape — the audit must confirm it is applied on **every** mutating action and reflected in the UI (disabled controls + view-only affordance), the way Spitze's CSS blanket-lock + DB guard did.
- **Anti self-escalation at the DB layer** (WohnOS `trg_profiles_guard` trigger; Spitze RLS restricting `pe_access` writes to master). GraniteOS migration 0025/0026 hardened RLS — audit must confirm a user cannot change their own role or write role-less.

### Data layer
- **Consistent server-action result wrapper `{ ok: boolean; error?: string }`** (WohnOS, every action). Makes UI error handling a one-liner and actions composable. **This is the single most liftable convention.** GraniteOS actions currently return mixed shapes (`{error}`, `{ok,...}`, redirect, throw) — audit should catalogue and note where a component can't tell success from failure.
- **Reads in RSC server pages** via `await createClient()` directly; **mutations in server actions** ending with `revalidatePath()`. GraniteOS follows this. 12/20 action files call `revalidatePath` — audit should confirm the other 8 genuinely don't need it (auth/mfa/gst-calc/ai are legitimately exempt; team/stock-alert may not be).
- **DB helper returns `null` on error, never throws** (Spitze `PE_DB.query`) — caller checks and shows an alert. GraniteOS uses Supabase directly per action; the equivalent is "return `{error}` not throw".
- **Money as integer minor units** — GraniteOS stores `_paise bigint` everywhere (matches the discipline; avoids float drift). ✔

### Error handling
- **`error.tsx` route boundary** with `role="alert"` + reset button (WohnOS `src/app/app/error.tsx`). Audit: does GraniteOS have route-level error boundaries?
- **`loading.tsx`** skeleton with `aria-busy`/`aria-label` (WohnOS). Audit: per data-fetching route.
- **Empty states** via a shared `DataTable empty=""` prop / `Placeholder` component (WohnOS). Spitze uses inline "No … yet" cells.

---

## 2. Reusable UI components & patterns

WohnOS concentrates primitives in **one file** `src/components/ui.tsx` — easy to mirror:
- `PageHeader` (eyebrow + h1 + actions slot), `StatCard` (KPI, serif number, tone), `DataTable` (columns/rows API + built-in empty state), `StatusBadge` (status→tone map, ~20 statuses), `Placeholder` (dashed empty-state).
- `InlineStatusSelect` — **generic action-injectable status dropdown**: takes `action:(id,status)=>Promise<{ok,error}>`, `useTransition` for pending, `router.refresh()` on success. Directly liftable for slab status, job stage, order status, invoice status. **Strong candidate if GraniteOS hand-rolls these per screen.**
- `Sidebar` — icon rail that hover-expands, role-filtered. GraniteOS has `components/layout/AppShell`. ✔
- `ThemeToggle` / `LangToggle` (cookie + `router.refresh()`), with a flash-prevention inline `<head>` script.

Design tokens (all three use CSS custom properties → Tailwind utilities):
- GraniteOS is **already** charcoal + gold (`shell.base #0b0e11`, `graphite.*`, `gold` tokens; `:root` = dark default, `html.light` override). Fonts: Fraunces (display) + Manrope (sans). The prompt's stated convention is Instrument Serif + Inter — **do not reskin the whole app for this** (taste refactor, breakage risk); GraniteOS already satisfies the charcoal/gold intent. Note as a deliberate, documented difference.
- HandelOS/Spitze both use **Instrument Serif** for headings (Spitze) / Playfair (HandelOS) and Inter/Jakarta for body — same family of choices.
- `@media (prefers-reduced-motion: reduce)` global rule (HandelOS, WohnOS) — required for WCAG 2.1 AA. Audit GraniteOS globals.css.

## 3. Supabase conventions

- **Sequentially numbered migrations** with descriptive suffix (`0001_foundation_schema.sql` …). GraniteOS already does this (0001–0029). ✔
- **Multi-tenancy by `company_id`/`org_id` NOT NULL + index on every business table** (WohnOS `org_id`, Spitze `location_id`, GraniteOS `company_id`). ✔
- **RLS via SECURITY-DEFINER JWT helper** (`current_company_id()` reading from the user row, not raw JWT metadata — avoids the empty-`user_metadata` blackout). GraniteOS uses `current_company_id()`/`current_user_role()`/`my_user`. ✔ — **this sidesteps WerkOS's documented "empty JWT metadata blacks out the app" bug.** Keep it that way; never switch RLS to read `auth.jwt()->'user_metadata'` directly.
- **Bulk policy application via `DO $$ … FOREACH table` loop** (WohnOS, Spitze) — DRY, no per-table copy-paste.
- **Immutability at the trigger level** for ledgers/audit (WohnOS journal `trg_*_immutable`; corrections via `storno_entry`). GraniteOS payments/invoices are not immutable — acceptable for this domain, but note for compliance.
- **Idempotent seeds** (`WHERE NOT EXISTS`, `IF NOT EXISTS`) — re-runnable. GraniteOS seed approach to verify.
- **Ship a named rollback script alongside any RLS migration** (Spitze `*_rls_rollback.sql`). GraniteOS lacks these — low priority but a real ops safety gap.
- **WerkOS fabrication lineage**: `production` status enum `planned/in_progress/at_risk/late/completed/cancelled`, three-stage QC `incoming/in_process/final` × `pass/fail/conditional`, one-row-per-job cost rollup `planned vs actual` (the Margin/Recovery-Radar foundation). GraniteOS `production_jobs` has `stage` + `qc_status (pending/passed/failed)` — simpler; fine for v1.

## 4. What the siblings do well that GraniteOS may be missing

These become **audit hypotheses** for Phase 2 (verify, don't assume):

1. **Uniform `{ok,error}` action result** + UI that renders both a success and an error line. (WohnOS) — likely partially present in GraniteOS.
2. **Route-level `error.tsx` + `loading.tsx`** on every data route, with a11y attributes. (WohnOS)
3. **`InlineStatusSelect`-style generic status mutator** instead of bespoke handlers per screen. (WohnOS)
4. **A skip-to-content link, `prefers-reduced-motion`, focus-visible ring, dynamic `lang`** — the a11y baseline. (WohnOS/HandelOS) — GraniteOS had an a11y pass per its cert audit; confirm still intact.
5. **DB-level self-role-escalation trigger** (not just RLS policy). (WohnOS) — GraniteOS cert audit (2026-06-14) flagged this CRITICAL; 0025/0026 should have closed it — verify.
6. **AI cost/query logging table** (`wos_ai_log`) for the slab-identifier / visualizer / copywriter features. GraniteOS has AI Studio — confirm there is rate-limiting/logging (it has `ratelimit.ts`).
7. **AI-visibility layer** (robots/sitemap/llms.txt/JSON-LD) — relevant to the GraniteOS marketing site, not the app; out of scope for this app-hardening pass but noted.
8. **Named RLS rollback scripts + a documented "apply RLS only after users have metadata" runbook.** (Spitze `SECURITY_FIX.md`)
