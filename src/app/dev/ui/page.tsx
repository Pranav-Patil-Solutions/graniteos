"use client";

// /dev/ui — living preview of the Premium Stone component library (spec §3 / §6).
// Not linked in the app; a design QA surface.
import { useState } from "react";
import { notFound } from "next/navigation";
import { Boxes, Users, Receipt, Wallet, Factory, FileText } from "lucide-react";
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
    <div className="min-h-screen bg-shell-base pb-[calc(env(safe-area-inset-bottom)+88px)]">
      <AppBar title="Component library" back="/dashboard" />
      <div className="max-w-lg mx-auto px-4 space-y-8 pt-2">
        <p className="text-[12px] text-ondark-muted">Premium Stone design system · preview at 390px</p>

        <Section label="Typography">
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
