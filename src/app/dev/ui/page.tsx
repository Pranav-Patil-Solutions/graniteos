"use client";

// /dev/ui — living preview of the Premium Stone component library (spec §3 / §6).
// Not linked in the app; a design QA surface.
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Boxes, Users, Receipt, Wallet, Factory, FileText } from "lucide-react";
import { IconDiamond, IconArrowUpRight, IconSun, IconMoon } from "@tabler/icons-react";
import { formatINRCompact } from "@/lib/money";
import { AppBar } from "@/components/ui/AppBar";
import { StatTile } from "@/components/ui/StatTile";
import { SlabCard } from "@/components/ui/SlabCard";
import { ListRow } from "@/components/ui/ListRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressSplit } from "@/components/ui/ProgressSplit";
import { TrendChart } from "@/components/ui/TrendChart";
import { MoneyInput, QtyInput } from "@/components/ui/SlabInputs";
import { BottomNav } from "@/components/ui/BottomNav";
import { FilterChip, FilterChipsRow } from "@/components/ui/FilterChips";
import { StoneCard } from "@/components/ui/StoneCard";
import { PrimaryButton, GhostButton } from "@/components/ui/StoneButton";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";

const L = (n: number) => n * 100; // rupees → paise

export default function DevUiPage() {
  // Design-QA surface only — never expose in production builds.
  if (process.env.NODE_ENV === "production") notFound();

  const [rate, setRate] = useState("235");
  const [qty, setQty] = useState("48");
  const [color, setColor] = useState("");
  const [type, setType] = useState("");

  const trend = [
    { label: "Jan", value: L(120000) },
    { label: "Feb", value: L(185000) },
    { label: "Mar", value: L(140000) },
    { label: "Apr", value: L(220000) },
    { label: "May", value: L(195000) },
    { label: "Jun", value: L(240000) },
  ];

  return (
    <div className="app-bg min-h-screen pb-[calc(env(safe-area-inset-bottom)+88px)]">
      <AppBar title="Component library" back="/dashboard" />
      <div className="max-w-lg mx-auto px-4 space-y-8 pt-2">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Royal Sapphire · design system</p>
          <ThemeFlip />
        </div>

        <RoyalSapphire />

        <Section label="Typography (legacy demo)">
          <SlabCard className="p-4 space-y-2">
            <p className="font-display text-[32px] leading-9 font-semibold text-onlight tnum">₹2,40,000</p>
            <p className="font-display text-[22px] leading-7 font-semibold text-onlight">Title — Fraunces 600</p>
            <p className="text-base font-bold text-onlight">Heading — Manrope 700</p>
            <p className="text-sm text-onlight">Body — Manrope 400. The quick brown fox.</p>
            <p className="text-[12px] text-onlight-muted">Caption — Manrope 500</p>
          </SlabCard>
        </Section>

        <Section label="StatTile (2-col grid)">
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={Boxes} label="Stock value" value="₹24,94,230" sub="2.49 lakh" accent />
            <StatTile icon={Users} label="Customers" value="18" />
            <StatTile icon={Receipt} label="Outstanding" value="₹6,98,513" />
            <StatTile icon={Wallet} label="Collected" value="₹33,184" />
          </div>
        </Section>

        <Section label="StatusBadge">
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="paid" /><StatusBadge variant="pending" />
            <StatusBadge variant="overdue" /><StatusBadge variant="partial" /><StatusBadge variant="info" />
          </div>
        </Section>

        <Section label="ProgressSplit">
          <div className="rounded-2xl border border-line-dark bg-shell-elevated p-4">
            <ProgressSplit collectedPaise={L(33184)} receivablePaise={L(698513)} />
          </div>
        </Section>

        <Section label="TrendChart">
          <TrendChart title="Revenue trend" data={trend} ranges={["6 Months", "3 Months", "12 Months"]} />
        </Section>

        <Section label="ListRow — dark shell">
          <div className="rounded-2xl border border-line-dark bg-shell-elevated px-4">
            <ListRow icon={Receipt} title="INV/2026-27/0007" caption="Krishna Builders · 07 Jun" value="₹66,390" badge={<StatusBadge variant="overdue" />} />
            <ListRow icon={FileText} title="QT-2026-0001" caption="Verma Builders" value="₹55,307" badge={<StatusBadge variant="info">Accepted</StatusBadge>} divider={false} />
          </div>
        </Section>

        <Section label="SlabCard + ListRow (slab surface)">
          <SlabCard className="px-4 py-1">
            <ListRow surface="slab" icon={Wallet} title="Payment received" caption="UPI · 07 Jun" value="+₹33,184" valueClass="text-positive" />
            <ListRow surface="slab" icon={Factory} title="Order in production" caption="ORD-2026-0001" value="₹55,307" badge={<StatusBadge variant="info">Production</StatusBadge>} divider={false} />
          </SlabCard>
        </Section>

        <Section label="Slab inputs (MoneyInput / QtyInput)">
          <SlabCard className="p-4 grid grid-cols-2 gap-3">
            <QtyInput label="Quantity" value={qty} onChange={setQty} unit="sq ft" />
            <MoneyInput label="Rate" value={rate} onChange={setRate} />
          </SlabCard>
        </Section>

        <Section label="FilterChips">
          <FilterChipsRow>
            <FilterChip label="Color" options={["Black", "White", "Green"]} value={color} onChange={setColor} />
            <FilterChip label="Type" options={["Granite", "Marble", "Quartz"]} value={type} onChange={setType} />
            <FilterChip label="Size" options={["16mm", "18mm", "20mm"]} value="" onChange={() => {}} />
          </FilterChipsRow>
        </Section>

        <Section label="StoneCard (catalogue)">
          <div className="grid grid-cols-2 gap-3">
            <StoneCard href="#" photo="/rooms/room-kitchen-1.jpg" name="Black Galaxy" meta="Polished · 18mm" price="₹235 / sq ft" arGlb="x" />
            <StoneCard href="#" fallback={<StoneSwatch material="Makrana White" color="White" className="w-full h-full" />} name="Makrana White" meta="Honed · 18mm" />
          </div>
        </Section>

        <Section label="Buttons">
          <div className="flex gap-3">
            <PrimaryButton>Record payment</PrimaryButton>
            <GhostButton>New quote</GhostButton>
          </div>
        </Section>

        <Section label="StickyTotalBar + BottomNav">
          <p className="text-[12px] text-ondark-muted">Both are fixed to the bottom — see the live BottomNav with the gold + FAB below.</p>
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-gold/70 font-semibold mb-2">{label}</h2>
      {children}
    </section>
  );
}

/* ── Royal Sapphire style guide (Step 1 deliverable) ─────────────────────── */

function ThemeFlip() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);
  return (
    <button
      onClick={() => {
        const next = !light;
        setLight(next);
        document.documentElement.classList.toggle("light", next);
        try { localStorage.setItem("gos-theme", next ? "light" : "dark"); } catch {}
      }}
      className="!min-h-0 inline-flex items-center gap-1.5 rounded-xl border border-graphite-600 bg-graphite-800 px-3 py-2 text-xs font-semibold text-ondark hover:border-gold/50"
    >
      {light ? <IconMoon size={15} /> : <IconSun size={15} />}
      {light ? "Dark" : "Light"}
    </button>
  );
}

function Swatch({ name, hex, varName }: { name: string; hex: string; varName?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="h-12 rounded-xl border border-graphite-600" style={{ background: varName ? `var(${varName})` : hex }} />
      <div className="leading-tight">
        <p className="text-[11px] font-semibold text-ondark">{name}</p>
        <p className="text-[10px] text-ondark-muted tnum">{hex}</p>
      </div>
    </div>
  );
}

function RoyalSapphire() {
  return (
    <div className="space-y-7">
      {/* Palette */}
      <Section label="Palette">
        <div className="rounded-card border border-graphite-600 bg-graphite-900 p-4 shadow-soft-md space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <Swatch name="Navy" hex="#1B2A4A" varName="--navy" />
            <Swatch name="Gold" hex="#B8923A" varName="--gold" />
            <Swatch name="Surface" hex="surface" varName="--bg-elevated" />
            <Swatch name="Page" hex="page" varName="--bg-base" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Swatch name="Gold tint" hex="feature" varName="--gold-tint" />
            <Swatch name="Positive" hex="green" varName="--pos" />
            <Swatch name="Warn" hex="amber" varName="--warn" />
            <Swatch name="Hairline" hex="gold rule" varName="--gold-hairline" />
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section label="Typography">
        <div className="rounded-card border border-graphite-600 bg-graphite-900 p-4 shadow-soft-md space-y-2">
          <p className="figure text-4xl font-semibold text-ondark">{formatINRCompact(4280000 * 100)}</p>
          <p className="font-display text-[26px] leading-7 font-semibold text-ondark">Fraunces display — 600</p>
          <p className="text-base font-bold text-ondark">Manrope heading — 700</p>
          <p className="text-sm text-ondark-muted">Body — Manrope 400. The quick brown fox jumps over the lazy dog.</p>
          <p className="eyebrow pt-1">Eyebrow · editorial label</p>
        </div>
      </Section>

      {/* Compact INR */}
      <Section label="Indian currency — formatINRCompact()">
        <div className="grid grid-cols-4 gap-3">
          {[427_5000_00, 14_60_000_00, 68_000_00, 920_00].map((p, i) => (
            <div key={i} className="rounded-xl border border-graphite-600 bg-graphite-900 p-3 text-center shadow-soft-sm">
              <p className="figure text-lg font-semibold text-gold">{formatINRCompact(p)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Depth */}
      <Section label="Depth — soft layered shadows">
        <div className="grid grid-cols-3 gap-3">
          {([
            ["soft-sm", "shadow-soft-sm"],
            ["soft-md", "shadow-soft-md"],
            ["soft-lg", "shadow-soft-lg"],
          ] as const).map(([name, cls]) => (
            <div key={name} className={`rounded-card border border-graphite-600 bg-graphite-900 h-20 grid place-items-center ${cls}`}>
              <span className="text-[11px] text-ondark-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons + accents */}
      <Section label="Action color = navy · gold = jewel accent">
        <div className="rounded-card border border-graphite-600 bg-graphite-900 p-4 shadow-soft-md space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button className="!min-h-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-navy-on hairline-gold" style={{ background: "linear-gradient(180deg, var(--navy-2), var(--navy))" }}>
              <IconArrowUpRight size={16} /> Primary action
            </button>
            <button className="!min-h-0 rounded-xl border border-graphite-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-ondark hover:border-gold/50">Secondary</button>
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "var(--gold-tint)", color: "var(--gold)" }}>
              <IconDiamond size={13} /> Gold feature
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: "var(--pos-bg)", color: "var(--pos)" }}>Won · +12%</span>
            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>Sent · pending</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
