# design-sync NOTES — GraniteOS → claude.ai/design

GraniteOS is a **Next.js 15 app, not a published component library**. The sync
imports the real design system in `src/components/ui/` (24 stone-themed
primitives) via the package shape in **synth-entry mode**. Target project:
"Design System" (`projectId` in config.json), reused while empty.

## How the build is wired (read before re-syncing)

- **Barrel entry**: `.design-sync/.cache/ds-entry.ts` `export *`s every
  `src/components/ui/*.tsx`. `cfg.entry` points at it so `PKG_DIR` resolves to
  the repo root (without `--entry`, the converter looks for
  `node_modules/graniteos` and crashes in `exportedNames`).
- **Component list** is pinned via `cfg.componentSrcMap` (24 entries) — there is
  no shipped `.d.ts`, so discovery can't find exports on its own. Several files
  export differently-named components (StoneButton.tsx → PrimaryButton/GhostButton;
  SlabInputs.tsx → MoneyInput/QtyInput; FilterChips.tsx → FilterChip/FilterChipsRow;
  SlabCard.tsx → SlabCard/SlabSection). Keep the map in sync with the exports.
- **Styling = Tailwind**, compiled to a static stylesheet by `cfg.buildCmd`
  (`tailwindcss -i src/app/globals.css -o .design-sync/.cache/ds-tailwind.css`).
  `cfg.cssEntry` points at that file. **Re-run buildCmd before re-syncing** if any
  `ui/` component's classes changed, or new utilities won't be in the stylesheet.
- **next/* shims**: `next/link` and `next/navigation` are aliased to
  `.design-sync/.cache/shims/*` via `.design-sync/.cache/tsconfig.dssync.json`
  (`cfg.tsconfig`). WITHOUT this, the Next runtime reads `process.env.__NEXT_*`
  at load and crashes the entire browser bundle (every component fails
  `[BUNDLE_EXPORT]`). If a `ui/` component starts importing another `next/*`
  module, add a shim + tsconfig alias for it.
- The `.cache/` artifacts (barrel, tailwind css, shims, tsconfig) are gitignored
  and regenerated; on a fresh clone, re-run the cache-setup before building:
  regenerate the barrel from `ui/*.tsx`, run `cfg.buildCmd`, and the shims +
  tsconfig.dssync.json are committed? NO — they're under `.cache/` (gitignored).
  **Re-sync risk**: if `.cache/` is wiped, recreate ds-entry.ts, ds-tailwind.css,
  shims/next-link.tsx, shims/next-navigation.ts, and tsconfig.dssync.json.

## Preview authoring pattern (all 24 use this)

- Each `.design-sync/previews/<Name>.tsx` imports the component from `'graniteos'`
  and wraps cells in a **dark graphite Shell** (`background: rgb(11 14 17)`,
  padding). GraniteOS is dark-theme-default; `text-white`/`text-gold` tokens are
  invisible without a dark backdrop.
- `SlabCard` is a **white "polished marble" card** (dark on-light text) meant to
  float on the dark shell — that contrast is intentional. `StoneCard` is a dark
  glass card. `SlabSection` must nest inside a SlabCard (its `bg-slab-muted` is
  near-white, invisible on its own).
- **Fixed-position components** (`BottomNav`, `StickyTotalBar`) need a shell with
  `position: relative; overflow: hidden` to clip the `fixed` bar into the cell.
- Lucide icons import directly from `lucide-react` in the preview (not from
  `graniteos`). `ListRow` `icon` prop wants the icon *component* (`icon={Package}`),
  not JSX; `StatTile` icon is also a `LucideIcon`.

## Per-component prop facts (so the next author doesn't re-derive them)

- **paise units (×100 of INR)**: `ProgressSplit` (collectedPaise/receivablePaise),
  `TrendChart` (TrendPoint.value). `AnimatedNumber`/`StatCard` take a **plain**
  number, not paise.
- `StatusBadge.variant`: `pending|paid|overdue|partial|info` (pending & overdue
  share the red token by spec). `children` overrides the default label.
- `RoleBadge.role`: snake_case literals `owner|sales_manager|store_manager|fabrication_supervisor`
  (labels from `@/lib/roles`).
- `FilterChip`: all 4 props required (`label`, `options`, `value` ("" = inactive), `onChange`).
- `StatCard`: `label`, `value` (number), `prefix` ("₹" default; pass "" to drop), `hint`, `gold`.
- `SlabCard`/`SlabSection` ship NO built-in padding — pass `className="p-4"`.
- `StickyTotalBar.value` is a pre-formatted string (e.g. "₹2,45,000"); `label` defaults "Total".
- `BottomNav` tabs are hardcoded; only `onAdd` is a prop. `AppBar` is self-contained 56px.
- `TiltCard.wow` toggles graphite → warm-gold gradient (premium highlight).

## Known render warns (triaged — not new on re-sync)

- `AnimatedNumber` and `StatCard` screenshots capture a **mid-animation frame**
  (rAF count-up). Expected; settles to the final value live. Not a defect.

## Re-sync risks / watch-list

- `.cache/` is gitignored — its generated inputs (barrel, tailwind css, next
  shims, tsconfig.dssync.json) must be recreated on a fresh clone before building.
  Consider promoting the shims + tsconfig.dssync.json out of `.cache/` if this
  becomes painful.
- The repo carried a large **uncommitted working tree** during this sync (the
  2026-06-19 ship-harden pass). When committing sync inputs, commit ONLY
  `.design-sync/**` + `.gitignore` — never `git add -A`.
- Fonts: components use Next `var(--font-manrope)`/`var(--font-fraunces)`, which
  are injected at runtime and NOT shipped. Previews render in fallback fonts
  (bold weights still read fine). To ship real brand fonts, wire `cfg.extraFonts`
  with the Manrope/Fraunces woff2s.
- `componentSrcMap` is hand-maintained; if `ui/` gains/loses a component, update
  the map AND the barrel (or regenerate the barrel from `ui/*.tsx`).
