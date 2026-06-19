# GraniteOS — Delivery Checklist (Phase 4)

_Date: 2026-06-19. Confirms the ship-harden pass is delivery-ready and lists what still needs Pranav / a manual step. Scope fixed this pass: **Tier 1 (all CRITICAL + HIGH) + Tier 2 (MEDIUM)** per the approved plan in `audit.md §5`. Tier-3 LOW and billing-dependent items were deliberately deferred (listed below)._

## 1. Build / lint / types / tests — all green (evidence)

| Gate | Command | Result |
|---|---|---|
| Production build | `npm run build` | ✅ **Compiled successfully** (exit 0) — all ~40 routes; build now also runs ESLint and it passes |
| Lint | `npm run lint` | ✅ **No ESLint warnings or errors** (exit 0) — ESLint configured this pass (`next/core-web-vitals`) |
| Types | `npx tsc --noEmit` | ✅ **exit 0** — zero TypeScript errors across the whole project (incl. tests) |
| Unit tests | `npm test` | ✅ **141/141 pass** (17 files) |

Note: ESLint was previously **unconfigured** (so `npm run lint` failed by dropping into an interactive setup prompt). It is now wired with `.eslintrc.json` + `eslint`/`eslint-config-next` devDeps. A pre-existing type error in `voice-commands.test.ts` (untouched by this pass; hidden because `next build` excludes tests) was also fixed.

## 2. Workflows — confirmed functional

Each was traced end-to-end in code (handler → server action → correct table → revalidate/refresh) and survives the green build. A **live** click-through additionally needs the Supabase env wired (see §4) — it can't be exercised here without a running DB.

**Core sales/ops**
- ✅ Quote: create (atomic — header rolls back if line insert fails) → view → **send / reject** (reject UI added) → **confirm → order** (now blocked for rejected/expired quotes) → edit (non-corrupting line rewrite).
- ✅ Order: status stepper advance → **cancel order** (added; cancelled no longer breaks the stepper) → create invoice. Status changes now **surface errors** instead of faking success.
- ✅ Invoice: create from order (atomic) → record payment (status recompute) → **edit (non-corrupting line rewrite, the CRITICAL fix)** → tax invoice (GST CGST/SGST/IGST) → batch payment (FIFO).
- ✅ Inventory: add block / add slab / set slab status (errors surfaced) / upload block photo (now inventory-edit-gated) / share catalogue.
- ✅ Procurement: create PO → record vendor bill (**GST double-count fixed** — pre-fills the pre-GST base, not the GST-inclusive total; quote-derived POs now show a **supplier picker** so the bill can be recorded) → **Pay Selected now pays the bills you ticked** (was paying oldest-first regardless).
- ✅ Fabrication: create job (now has a **Notes** field) → advance stage / QC pass-fail (errors surfaced) → factory floor stays fresh. Now respects the owner's per-module access config.

**Auth / RBAC / team**
- ✅ Login (OTP + **password now beta-gated + rate-limited**), MFA enrol/verify/disable (**disable now requires a verified session**; the **must-enrol redirect loop is fixed**), team invite/accept (**raw `already_member` DB string no longer leaks**), access-control grid, company settings. Self-role-escalation remains blocked at the DB.
- ✅ **Page-level read gating (the headline fix):** money + parties-detail + every module page now redirect a role configured `none` for that module (closes the direct-URL data-exposure), and pass `viewOnly` so view-only users no longer see live edit controls.

**Dashboard / AI / misc**
- ✅ Dashboard morning card: **quote KPIs work again** (`briefing.ts` no longer queries a nonexistent `quotes.updated_at` column that silently zeroed them).
- ✅ AI Studio (Slab Identifier, Copywriter), Analytics, Marketing — verified wired with real model/data calls.
- ✅ Daybook, Import (**phone normalization fixed**), Search (**load errors now surfaced**), Logs (**now includes security/auth events** + surfaces load errors), Catalog (clearer empty-state copy), public short-link — all functional.

**Data-integrity & error UX themes fixed app-wide**
- ✅ Non-atomic line-item rewrites (quote create/edit, invoice edit) → reordered to **insert-new → delete-old → write-header**, so a failed insert leaves the prior record fully intact (no orphaned headers / corrupted totals).
- ✅ Silent-failure mutators (slab/product/order/job/invoice actions) → now capture the result and **show the error** instead of a false success.
- ✅ List/aggregate pages (quotes, orders, logs, search) → a DB failure now shows a distinct **error state** instead of masquerading as "empty".
- ✅ "Payable to suppliers" now includes outstanding vendor bills, not just opening balances.

## 3. Verified working — left untouched
Quote→order conversion, GST math (CGST/SGST/IGST split + round-off), FIFO allocation, payment-status transitions, tax-invoice rendering, fabrication stage enum, self-role-escalation block, OTP rate-limiting, access-control grid save, public catalogue field-safety. (Full list in `audit.md §4`.)

## 4. Manual setup needed before go-live

**a) Install deps (fresh clone):** `npm install` — this pass added `eslint` + `eslint-config-next` to `devDependencies`.

**b) Environment variables** (all pre-existing; none added):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — core.
- `NEXT_PUBLIC_APP_URL` — used to build team-invite links.
- `BETA_ALLOWED_LOGINS` (+ allowlist helper) — the private-beta gate; **now also enforced on password sign-in**.
- `GEMINI_API_KEY` (Slab Identifier + Room Visualizer), `GROQ_API_KEY` (Copywriter), `AI_BILLING_READY` (must be `true` to enable the paid Gemini image features).
- Optional: `BETA_NOINDEX=1` (keep beta out of search engines).

**c) Database:** apply migrations `0001`–`0029` (the existing chain — **no new migrations were added this pass**; the data-integrity fixes were done in application code, so there is no new SQL to run). Ensure the `stone-photos` storage bucket exists (migrations 0019/0027) for block photos.

**d) Seed:** demo/seed data is optional.

**e) Smoke-test + deploy (per your deployment rule):** run `npm run build` → start locally → browser smoke-test the workflows above on a localhost link → approve → **preview deploy** → approve → production. **Not deployed by this pass.**

## 5. Deliberately deferred (need your call / external deps)

| Item | Why deferred |
|---|---|
| **F1 / INFRA-2** — durable per-IP rate limiter for the public Room Visualizer | The endpoint is **off by default** (gated by `AI_BILLING_READY`). The current in-memory limiter is leaky on serverless; the real fix needs KV/Upstash infra. Wire it when paid AI goes live. |
| **F3** — verify Gemini image model id (`gemini-2.5-flash-image`) | Needs checking against the live Google model catalogue before enabling billing — do not change blindly (it is a real, current model). |
| **D02 (procurement half)** — make procurement a configurable access module | `procurement` is not in `ACCESS_MODULES` by design; procurement writes are gated by the `confirmOrder` capability + RLS. Adding it as a 3-state module needs a schema-default + access-matrix-UI change. Raise if you want it owner-configurable. |
| **Tier-3 LOW polish** | Rounding-display drift (B11/C7), no over-payment cap (C6), `deleteParty` has no UI (E8 — wire a delete button or remove the action), `/growth` vs `/marketing` naming (F5), voice-note id collision (G6), catalog invalid-UUID 404 (G7), import owner-only gate (G8). None affect core workflows. |

## 6. Docs produced this pass
- `docs/takeaways.md` — proven patterns extracted from WohnOS / Spitze Ops / HandelOS+WerkOS (Phase 1).
- `docs/audit.md` — full severity-ranked findings + the tiered fix plan (Phase 2).
- `docs/delivery-checklist.md` — this file (Phase 4).
