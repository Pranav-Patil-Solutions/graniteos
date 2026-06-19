# GraniteOS — Customer Distribution & Onboarding (Claude Code prompt)

Build the complete customer-delivery layer for GraniteOS: a setup.exe I can hand to a customer, per-company product keys with seat limits, isolated per-company data, a first-run activation + master-data import wizard, a first-time-user guide, and the permission manager ported from Spitzee.

## Context — read this before planning

- Repo: `d:\vyaparwerk\graniteos` — Next.js 15 + React 19 + Supabase (migrations in `supabase/migrations/`), deployed on Vercel (Mumbai region), tests with Vitest + Playwright (`e2e/`).
- There is ALREADY a signed-license system: `license-keys/private.pem` + `license-keys/public.pem` sign a token (see `license.json` — payload has company, plan, iat/exp, domain). EXTEND this system; do not build a parallel one.
- Reference implementation to port (feature 6): Spitzee's Master Access Control.
  - Design: `d:\vyaparwerk\spitzee\docs\superpowers\specs\2026-06-05-master-access-control-design.md`
  - Plan: `d:\vyaparwerk\spitzee\docs\superpowers\plans\2026-06-05-master-access-control.md`
  - Code: the NAV2 gating + `pe_access` JSONB config table inside `d:\vyaparwerk\spitzee\app.html` / `master.html`.
- Explore the existing `src/` (actions, app, components, lib, middleware.ts) and `supabase/migrations/` first and reuse existing auth/company structures wherever they exist.

## Features (in delivery order)

### 1. Product key per company, with adjustable user count
- Admin-side generator (script in `scripts/` and/or an internal admin screen) that creates a random, signed product key per company using the existing Ed25519 keys. Key payload: company id, company name, max user seats, plan, issue/expiry dates.
- Keys are verifiable offline with `public.pem` — no call home needed to validate format/signature — but seat count and revocation are enforced server-side.
- Seat enforcement: a company cannot have more active users than its key allows. Seats must be ADJUSTABLE after issue (issuing a replacement key OR a server-side override table — architect decides, but changing seats must not require reinstalling).

### 2. Tenant isolation — one database, separate entity per company
- When a new company is added, its data must be provisioned as a separate entity inside the one Supabase Postgres database, so one company can never see another's data. Preferred: a dedicated Postgres schema per company, created automatically on company registration from a canonical template.
- If schema-per-tenant is impractical with Supabase client libraries / PostgREST, STOP at the design checkpoint and present the alternative (single schema + company_id + strict RLS with tests proving isolation) with trade-offs. Hard requirement either way: an automated test that proves company A's session cannot read company B's rows.
- Migrations must apply to all tenant schemas (write the migration runner for this if schema-per-tenant is chosen).

### 3. setup.exe — install like software, also opens on phone
- The app stays hosted (Vercel + Supabase) — that is what makes phone access work. The exe is a thin desktop shell, NOT an offline copy.
- Build a Windows installer (`setup.exe`) using Tauri (preferred, small binary) or Electron that wraps the hosted GraniteOS URL in its own window with app name + icon, Start-menu/desktop shortcuts, and standard install/uninstall.
- Same product key activates the desktop shell and the phone browser (responsive web / PWA with home-screen install). Verify the PWA manifest + mobile layout works for the activation and import screens.
- Deliverable: a real, runnable `setup.exe` artifact + a one-page plain-English install guide for the customer (docs/).

### 4. First-run activation flow
- On first open (desktop or phone), if no valid activation for this browser/company: show a product-key screen.
- Entering a valid key: verifies signature + expiry, binds the session/company, provisions the tenant (feature 2) if not already provisioned, then continues to the import wizard (feature 5).
- Invalid/expired/over-seat keys get clear, non-technical error messages.

### 5. Master data import wizard
- After activation, show an import screen listing every master-data entity the app needs (companies/customers, suppliers, products/slabs, rates, users, etc. — derive the real list from the existing schema).
- "Download template" gives one Excel (or CSV set) with all required columns, headers, an example row, and notes on required fields/formats.
- "Upload filled template" parses, validates row-by-row (show errors with row numbers in plain language; nothing partial is committed on failure), then inserts everything into THAT company's tenant automatically.
- Re-upload must be safe (idempotent or clear duplicate handling). Importing can be skipped and resumed later from a menu.

### 6. First-time user guide
- A guided onboarding for new users: a short tour/checklist on first login (activate → import data → create users → first job), dismissible, re-openable from Help. Plain language, written for a granite fabricator's office staff, not developers.

### 7. Permission manager (port from Spitzee)
- Port Spitzee's Master Access Control into GraniteOS: an Access Control screen, editable by the owner/master role only, with a grid of roles × app sections (checkboxes), saved to a per-tenant config table, gating navigation for everyone on next load.
- Adapt roles and sections to GraniteOS's actual nav. Master/owner always has full access and cannot lock themselves out. Falls back to safe defaults if config is missing.

## Acceptance criteria (each must be demonstrated, not asserted)

1. Generate a key for a fake company "Demo Granites" with 3 seats → key validates; a 4th user cannot be activated; seats raised to 5 → 4th user works without reinstall.
2. Two test companies activated → automated test proves neither can read the other's data.
3. `setup.exe` installs on a clean Windows machine, opens GraniteOS in its own window; the same URL works on a phone browser and the key activates there too.
4. Fresh activation lands on the import wizard; downloaded template filled with sample data uploads cleanly and the data appears in the app; a template with 2 bad rows is rejected with row-numbered errors and zero partial inserts.
5. First login shows the guide; it can be dismissed and reopened.
6. Owner unchecks a section for a role → that role's user no longer sees it after reload; owner always sees everything.
7. All existing tests still pass; new Playwright e2e covers activation → import → permissions happy path.

## Constraints & process

- Don't break the current production deployment or the existing license.json flow for the current install.
- All schema changes go through `supabase/migrations/` with rollback notes.
- Work in phases with checkpoints: (1) architecture + tenancy decision, (2) keys + activation, (3) setup.exe, (4) import wizard, (5) guide + permissions, (6) full e2e + handover doc. Stop for my approval after phase 1 and before anything irreversible.
- Plain-English summary at each checkpoint: what was built, how I test it myself, what's next.
