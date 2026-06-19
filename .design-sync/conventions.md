# GraniteOS design system — how to build with it

GraniteOS is a **mobile-first, dark-theme** SaaS for granite/marble businesses in
India. The look is a dark graphite shell with gold accents, a granite-green action
color, and white "polished-marble" cards floating on the dark. Money is INR (₹),
Indian digit grouping.

## Wrapping & setup

- **Render on a dark surface.** The dark theme is the default (`:root`), and most
  components use light-on-dark tokens (`text-white`, `text-ondark`, `text-gold`).
  Put your screen content inside a dark container or these read as invisible:
  `<div className="min-h-screen bg-graphite-900 text-ondark"> … </div>`.
- **No provider/context is required** — components are self-contained; theming is
  CSS variables + Tailwind utilities, not a React context.
- **Fonts** are Manrope (`font-sans`, body) and Fraunces (`font-display`, headings/
  numbers). The host app loads them; if unstyled, fall back to system fonts.
- Two surface idioms, used deliberately: **StoneCard** = dark glass card (on the
  dark shell); **SlabCard** = white marble card with dark on-light text (floats on
  the dark shell — the contrast is intentional). `SlabSection` nests inside a
  SlabCard. Neither ships padding — add `className="p-4"`.

## Styling idiom — Tailwind utilities mapped to GraniteOS tokens

Style with these utility classes (real names from the shipped stylesheet); do not
invent your own palette:

| Purpose | Classes |
|---|---|
| Surfaces (dark) | `bg-graphite-900` (app bg), `bg-graphite-800`, `bg-graphite-700`, `border-graphite-600` |
| Surfaces (marble) | `bg-slab` (white card), `bg-slab-muted` (inset), `shadow-slab`, `text-onlight` (text on marble) |
| Text (on dark) | `text-white`, `text-ondark`, `text-ondark-muted`, `text-slate-400` |
| Gold accent | `text-gold`, `text-gold-soft`, `bg-gold`, `border-gold` |
| Action / positive | `bg-granite-green2`, `text-granite-green2` |
| Radius / glass | `rounded-2xl`, `rounded-xl`, `backdrop-blur` |

Prefer composing existing components over raw markup. Buttons: `PrimaryButton`
(gold) and `GhostButton` (gold outline) for primary/secondary; `Button` for the
animated press/spring/morph variants. Status uses `StatusBadge`
(`variant="paid|pending|overdue|partial|info"`); roles use `RoleBadge`. KPI numbers
use `StatCard`/`StatTile`/`AnimatedNumber`; trends use `TrendChart`.

## Where the truth lives

- Read `styles.css` (and its `@import`ed `_ds_bundle.css`) for the full token set
  before styling — it defines every utility above plus the `--c-*` variables.
- Read each component's `<Name>.prompt.md` (usage) and `<Name>.d.ts` (props) before
  using it — props carry the design intent (e.g. `StatCard.gold`, `TiltCard.wow`).

## One idiomatic build snippet

```tsx
import { StatCard, StatusBadge, PrimaryButton, SlabCard } from 'graniteos';

export function OrderSummary() {
  return (
    <div className="min-h-screen bg-graphite-900 text-ondark p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This month" value={245000} hint="+12% vs last" />
        <StatCard label="Outstanding" value={127838} gold />
      </div>
      <SlabCard className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg">Order #GOS-2047</span>
          <StatusBadge variant="partial" />
        </div>
      </SlabCard>
      <PrimaryButton href="/invoices/new">Generate invoice</PrimaryButton>
    </div>
  );
}
```
