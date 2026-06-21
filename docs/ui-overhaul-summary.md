# GraniteOS — UI/UX Overhaul Summary ("Royal Sapphire")

**Branch:** `ui/royal-sapphire` (cut fresh from production `master` / 64694ad)
**Goal:** a unique, formal, ultra-premium product feel for a high-end natural-stone
business — new expandable sidebar, one cohesive palette applied via design tokens,
every screen re-themed, polished states, minimal-click UX.

**Gates:** `next lint` → 0 warnings/errors · `npm run build` → succeeds (all routes) ·
TypeScript strict, 0 errors. No business logic, server actions, Supabase queries, RLS,
or routes were changed — this is the presentation + interaction layer only.

---

## 1. Chosen palette — "Royal Sapphire" (a 3-jewel system)

A deep **sapphire-navy** ground, an **emerald-green** primary action, and a **jewel-gold**
accent, on **alabaster** text — stone, metal, and gem. Deliberately not any of the
generic AI-default looks (cream+serif+terracotta, near-black+acid-green, broadsheet
hairlines). Committed once as CSS variables in `globals.css`; the whole app re-themes
from that one place. Never pure black — navy is the darkest ink.

| Role | Dark (default) | Light |
|---|---|---|
| Page ground | `#0E1626` | `#EEF1F6` |
| Surface / raised | `#15203A` / `#101A30` | `#FFFFFF` / `#F7F9FC` |
| Primary ink | `#EAEEF7` | `#1B2A4A` |
| Secondary / muted | `#A6B0C7` / `#7E8AA6` | `#54607A` / `#8B95AC` |
| Borders / hairline | `#26314C` / `#3A4866` | `#DEE3EE` / `#E4D6AE` |
| **Jewel gold** (accent) | `#D4AC54` | `#B8923A` |
| **Emerald** (primary action) | `#34C99A` | `#1D8F6E` |
| Amber (warn) | `#E0A84A` | `#B07415` |

**Tokens established (no one-off values):** color (above), **spacing** (Tailwind scale),
**radius** (`rounded-card` 16px, `rounded-panel` 20px, plus 12px controls), **shadows**
(`shadow-soft-sm/md/lg` → layered, theme-aware), **typography** (below). Gold is reserved
as a jewel accent (money, active/feature surfaces, hairlines) — never the default fill.

**Finish utilities:** `.glass` (frosted surface), `.frost` (frosted topbar), `.edge-top`
(machined top highlight), `.elev-1/2/3`, `.hairline-gold`, `.eyebrow` (uppercase gold
label), `.figure` (Fraunces tabular, −0.4px), `.shimmer` (loading sheen), `.app-bg`
(navy + soft aura), ~0.3s theme cross-fade.

## 2. Type system

- **Display / headings / numbers:** **Fraunces** (serif, 500/600/700) — formal, lapidary.
- **Body / UI:** **Manrope** (geometric sans).
- **Scale:** page titles `font-display 1.9–2.15rem` (dashboard hero 2.1–2.9rem); large
  figures use `.figure` (tabular, slight negative tracking). Loaded via `next/font`.
- **Currency:** Indian formatting throughout — `formatINR` (`₹1,23,456`) and new
  `formatINRCompact` (`₹42.8L` / `₹68K`) for KPIs.

## 3. Sidebar — new expandable 3-group nav

One source of truth (`navConfig.tsx`) drives both the desktop rail and the mobile drawer
through one shared accordion (`NavGroups.tsx`), so they can't drift. Groups map to
GraniteOS's **actual routes**:

- **Business** — Home, Stock, Clients, Quotes, Orders, Invoices, Money, Batch Payment,
  Fabrication, Factory Floor, Measurement, Daybook, Voice Notes, Logs
- **Procurement** — Purchase Orders, Suppliers (`/parties?tab=suppliers`), Vendor Payments,
  Stock Alert
- **Account** — Products, Users & Roles, Insights, Marketing, AI Studio, Settings

Behaviour: group header is clickable with a chevron that rotates on toggle; the group
holding the **active route auto-expands**; the active item gets a gold tint + left gold
bar; open/closed choices **persist** (`localStorage gos-nav-open-v1`); height + opacity
**animate** via the grid-rows `0fr→1fr` trick (reduced-motion safe). Per-item role/access
gating is unchanged.

- **Desktop** (`DesktopSidebar.tsx`): persistent `w-64` frosted rail, gold monogram-chip
  logo, soft-lg shadow, footer with theme toggle / mobile-preview / sign-out.
- **Mobile** (`NavDrawer.tsx`): hamburger drawer renders the same `NavGroups`, closes on
  navigate; plus the bottom tab bar. `AppShell` offsets content `lg:pl-64`.

## 4. What changed per screen

| Area | Change |
|---|---|
| **Dashboard** | Gold eyebrow (company) + serif greeting with gold first-name; glass settings control; role badge; search. **MorningCard** hero retuned to navy + gold with a 2/4-up KPI strip (cash, receivables, quotes, GST), a "Do now" primary action, and animated figures. |
| **All list/detail screens** (Stock, Clients, Quotes, Orders, Invoices, Money, Batch Payment, Fabrication, Factory, Measurement, Daybook, Notes, Logs, Purchase Orders, Suppliers, Vendor Payment, Stock Alert, Products, Team, Insights, Marketing, AI Studio, Settings, Search, detail pages) | Page titles standardised to the **Fraunces serif display** in token ink (all 26 screens). Bodies re-theme automatically through the shared components below. |
| **Shared components** (re-theme everything) | `Button` (emerald primary with soft glow, gold outline), `Card` (`.elev-1`), `EmptyState` (icon chip + serif heading + emerald CTA — always offers the next action), `StatCard`/`StatTile`, `StatusBadge`/`RoleBadge` (tint + pip), inputs/selects (navy field, gold focus ring) — all read the Royal Sapphire tokens. |
| **Loading states** | New `Skeleton` / `SkeletonList` / `SkeletonKpis` with a premium `.shimmer` sweep; the global `(app)/loading.tsx` now matches content width on desktop. |

## 5. UX notes

- **Navigation:** grouped + collapsible; active section auto-expands; choice remembered;
  one mental model across desktop and mobile.
- **Minimal clicks/typing:** existing smart defaults, auto-calculated money fields, and
  dropdown-driven flows are preserved; no new required fields or steps were introduced.
- **States:** hover/focus/active are token-consistent; loading = shimmer skeletons;
  empty states carry a next-action CTA; inputs have a clear gold focus ring.
- **Motion:** subtle only — accordion height, nav-pill spring, button lift, theme fade.

## 6. Scope & safety

System-level overhaul: the design tokens + shared components + sidebar + serif titles
re-theme **every** screen cohesively, with the dashboard fully bespoke. Server actions,
Supabase queries, RLS, access-control, routes, and the DB schema are **untouched**.
Icon set kept as lucide-react (thin 1.5px, already consistent app-wide) to avoid a risky
mass icon migration; can swap to Tabler later if desired.

## 7. Status

On preview branch `ui/royal-sapphire` only. **Not promoted to production** (prod runs the
champagne build). Promote after review + approval.
