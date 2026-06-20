# GraniteOS — UI / UX Overhaul Summary

**Branch:** `ui/overhaul-2026-06-20`
**Date:** 2026-06-20
**Goal:** a unique, formal, ultra-premium product feel — new expandable sidebar,
a committed palette of our own, distinctive type, every screen re-themed, states
polished, fewer clicks/less typing. Run autonomously; don't break functionality.

**Gate status:** `npx tsc --noEmit` → 0 errors · `next lint` → 0 warnings/errors ·
`npm run build` → success (all routes compiled). Functionality unchanged — this is
a presentation + navigation pass, no server actions, queries, RLS, or schema touched.

---

## 1. Chosen palette — "Onyx & Malachite"

A deliberate move away from the previous champagne/amber look and away from the three
AI-default palettes (cream+serif, near-black+acid-green, broadsheet hairlines). The
signature is a **deep onyx ground with a malachite-green jewel accent and fine brass
veining** — stone, metal and gem, which fits a granite/marble business.

| Token | Value | Role |
|---|---|---|
| `--bg-base` | `#07080a` | onyx page ground |
| `--bg-glow` | `#0e1a16` | faint malachite glow top-right of the app background |
| `--c-graphite-900` | `11 13 16` | raised onyx surface (sidebar, cards) |
| `--c-gold` (brand accent) | `84 199 165` | **malachite** — the brand/active/CTA color (token name kept as `gold` so the whole app re-themes from one place) |
| `--c-gold-soft` | `140 224 199` | lighter malachite for hovers/secondary |
| `--c-granite-green2` | `32 158 105` | deeper emerald — "positive/success" tone, distinct shade from the accent |
| `--brass` | `#c2a06a` | fine metallic **veining** — eyebrows + hairline dividers only, never a fill |
| `--c-ondark` | `240 238 231` | **alabaster** primary text |
| `--c-ondark-muted` | `150 157 163` | secondary text |

Light mode (`html.light`) darkens malachite to `22 122 92` so text/accents keep
≥4.5:1 contrast on the alabaster ground. `.force-dark` re-pins the dark tokens for
always-dark hero elements (e.g. the briefing card).

**New utilities in `globals.css`:** `.glass` (saturated blur surface), `.edge-top`
(top hairline highlight), `.elev-1` / `.elev-2` (two-step soft elevation), `.eyebrow`
(thin uppercase brass label — the formal voice), `.vein` (brass hairline divider),
`.app-bg` (onyx + malachite radial glow), `.stone-glow` (one soft malachite hero glow).
Focus ring and `::selection` are malachite.

## 2. Type system

- **Display / headings:** **Cormorant Garamond** (500/600/700) — a high-contrast formal
  serif, loaded via `next/font` and exposed as `--font-fraunces` → Tailwind `font-display`.
  (Variable name kept so existing `font-display` usages pick it up with no churn.)
- **Body / UI:** **Manrope** (unchanged) — geometric, neutral, legible at small sizes.
- The pairing (contrasty serif display + calm sans body) is the brief-specific choice
  that reads "formal/premium" without the generic SaaS look.
- Page titles standardised to `font-display text-[1.9rem] lg:text-[2.15rem]
  font-semibold tracking-tight text-ondark` across **all 26 screens**.

## 3. Sidebar / navigation — new expandable 3-group structure

A single source of truth (`navConfig.tsx`) drives both desktop and mobile via one
shared accordion component (`NavGroups.tsx`), so they can never drift apart.

**Groups (each collapses/expands; the group holding the active route is always open;
open/closed choices persist in `localStorage` `gos-nav-open-v1`):**

- **Business** — Home, Stock, Clients, Quotes, Orders, Invoices, Money, Batch Payment,
  Fabrication, Factory Floor, Measurement, Daybook, Voice Notes, Logs
- **Procurement** — Purchase Orders, Suppliers, Vendor Payments, Stock Alert
- **Account** — Products, Users & Roles, Insights, Marketing, AI Studio, Settings

Per-item access gating (`allowedFor` → role `need` + access-control `module`) is
unchanged — only the grouping/visuals changed. Group headers use the brass eyebrow
voice; the active item gets a malachite tint + a left malachite bar; height animates
via the grid-rows `0fr→1fr` trick (respects `prefers-reduced-motion`).

- **Desktop** (`DesktopSidebar.tsx`): persistent `w-64` rail, GraniteOS wordmark
  (malachite "G"), groups, footer with theme toggle / mobile-preview / sign-out.
- **Mobile** (`NavDrawer.tsx`): the hamburger drawer now renders the same `NavGroups`,
  closing on navigation. Bottom tab bar refined (`backdrop-blur-xl`, hairline top border).
- `AppShell.tsx`: content offset `lg:pl-64`; removed the old pin/icon-rail state.

## 4. What changed per screen

| Screen | Change |
|---|---|
| **Dashboard** | New header: brass eyebrow (company), serif display greeting with malachite first-name, glass settings button, role badge under the name; search row; **MorningCard** briefing hero retuned to onyx + malachite glow (was amber). Quick-actions, to-do and getting-started cards inherit the new components. |
| **All list screens** (Stock, Clients, Quotes, Orders, Invoices, Money, Fabrication, Factory, Products, Team, Daybook, Notes, Logs, Purchase Orders, Vendor/Batch Payment, Stock Alert, Search, Settings, Measurement, party/quote/invoice/PO detail) | Page titles upgraded to the Cormorant serif display style in alabaster. Bodies re-theme automatically through the shared components below. |
| **Shared components** (re-theme everything) | `Button`, `Card` (`.elev-1`), `EmptyState` (icon chip + serif heading + malachite CTA), `MorningCard` (`.edge-top .elev-2`), `RoleBadge` (tint + status dot), `StatCard` — all read the malachite/onyx tokens, so every screen that uses them was re-skinned in one move. |

## 5. UX notes

- Navigation is now grouped and collapsible — fewer items on screen at once, the
  active section auto-expands, and the user's layout choice is remembered.
- The mobile drawer and desktop sidebar are the same component → one mental model.
- Motion is subtle and reduced-motion-safe (accordion height, nav pill spring).
- No new required fields or extra steps were introduced; this pass did not change
  any form, validation, or data flow.

## 6. Deliberately NOT changed (functionality safety)

Server actions, Supabase queries, RLS, access-control logic, routes, and the DB
schema are untouched. The previously-tracked cert-readiness items (2 CRITICAL RLS
holes, unauth Gemini endpoint, public storage bucket, DPDP placeholders, and the
production `MFA_COOKIE_SECRET` env gap) are **out of scope for this UI pass** and
remain open — they need a separate hardening cycle before customer go-live.

## 7. Status

On the preview branch `ui/overhaul-2026-06-20` only. **Not promoted to production.**
Production currently runs the champagne build (`64694ad`). Promote only after Pranav
reviews the preview URL and approves.
