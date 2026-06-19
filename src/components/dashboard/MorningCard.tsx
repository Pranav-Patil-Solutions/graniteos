import Link from "next/link";
import {
  ArrowDownLeft,
  AlertTriangle,
  Boxes,
  Receipt,
  Factory,
  FileText,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { getBriefing, type Briefing } from "@/lib/briefing";
import type { Role } from "@/lib/roles";
import StreakChip from "@/components/dashboard/StreakChip";
import CelebrationLayer from "@/components/dashboard/CelebrationLayer";

type TileSpec = {
  icon: typeof Receipt;
  label: string;
  value: number;
  href: string;
  rupees?: boolean;
  tone?: "green" | "red" | "gold" | "plain";
};

function tilesFor(b: Briefing): TileSpec[] {
  const r = (p: number) => Math.round(p / 100);
  const money = {
    cash: { icon: ArrowDownLeft, label: "Cash in (7d)", value: r(b.cashIn7Paise), rupees: true, tone: "green" as const, href: "/money" },
    udhaar: { icon: AlertTriangle, label: "Udhaar pending", value: r(b.receivablePaise), rupees: true, tone: "red" as const, href: "/money" },
    gst: { icon: Receipt, label: b.netGstPaise >= 0 ? "GST payable" : "GST credit", value: Math.abs(r(b.netGstPaise)), rupees: true, tone: "gold" as const, href: "/money" },
  };
  const sales = {
    qexp: { icon: AlertTriangle, label: "Quotes expiring", value: b.quotesExpiringSoon, tone: "gold" as const, href: "/quotes" },
    qopen: { icon: FileText, label: "Open quotes", value: b.quotesOpen, tone: "plain" as const, href: "/quotes" },
  };
  const floor = {
    ready: { icon: Factory, label: "Ready to dispatch", value: b.jobsReady, tone: "green" as const, href: "/fabrication" },
    active: { icon: Factory, label: "Jobs in progress", value: b.jobsActive, tone: "plain" as const, href: "/fabrication" },
  };
  const stock = { icon: Boxes, label: "Slabs in stock", value: b.inStock, tone: "plain" as const, href: "/inventory" };

  switch (b.role) {
    case "owner":
      return [money.cash, money.udhaar, sales.qexp, money.gst];
    case "sales_manager":
      return [sales.qexp, sales.qopen, money.udhaar, money.cash];
    case "store_manager":
      return [stock, floor.active, floor.ready, money.udhaar];
    case "fabrication_supervisor":
      return [floor.ready, floor.active, stock, sales.qopen];
    default:
      return [money.cash, money.udhaar, stock, sales.qopen];
  }
}

export default async function MorningCard({ role }: { role: Role }) {
  const supabase = await createClient();
  const b = await getBriefing(supabase, role);
  const tiles = tilesFor(b);

  const actionTone =
    b.primaryAction?.tone === "red"
      ? "from-[#241010] to-graphite-800 border-red-500/30 text-red-200"
      : b.primaryAction?.tone === "green"
        ? "from-[#0c2418] to-graphite-800 border-granite-green2/30 text-granite-green2"
        : "from-[#14110a] to-graphite-800 border-gold/30 text-gold";

  return (
    <>
      <CelebrationLayer recentPayments={b.recentPayments} />

      <div className="force-dark relative mt-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-[#14110a] to-[#11161b] p-4 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(220px 140px at 100% 0%, rgba(201,139,75,.18), transparent 70%)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gold uppercase tracking-wider">Today&apos;s briefing</span>
            <StreakChip />
          </div>

          {/* The one thing to do right now */}
          {b.primaryAction && (
            <Link href={b.primaryAction.href} className="block mt-3">
              <div className={`group flex items-center gap-3 rounded-xl border bg-gradient-to-br ${actionTone} px-3.5 py-3`}>
                <span className="text-[11px] uppercase tracking-wide opacity-70 font-bold">Do now</span>
                <span className="text-sm font-bold text-white flex-1 leading-tight">
                  {b.primaryAction.label}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )}

          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map((t, i) => (
              <Tile key={i} {...t} />
            ))}
          </div>

          <p className="mt-3 text-[12px] text-gold/90">{b.highlight}</p>
        </div>
      </div>
    </>
  );
}

function Tile({ icon: Icon, label, value, href, rupees, tone = "plain" }: TileSpec) {
  const t =
    tone === "green"
      ? { text: "text-granite-green2", chip: "bg-granite-green2/15 text-granite-green2", glow: "rgba(52,211,153,.10)" }
      : tone === "red"
        ? { text: "text-red-300", chip: "bg-red-500/15 text-red-300", glow: "rgba(248,113,113,.10)" }
        : tone === "gold"
          ? { text: "text-gold", chip: "bg-gold/15 text-gold", glow: "rgba(201,139,75,.12)" }
          : { text: "text-white", chip: "bg-white/[0.08] text-slate-200", glow: "rgba(255,255,255,.05)" };
  return (
    <Link
      href={href}
      className="relative block rounded-xl bg-white/[0.04] border border-graphite-600 p-3 overflow-hidden hover:border-gold/40 active:opacity-80 transition-colors"
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(120px 80px at 100% 0%, ${t.glow}, transparent 70%)` }} />
      <div className="relative">
        <span className={`inline-flex w-6 h-6 rounded-md items-center justify-center ${t.chip}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <AnimatedNumber
          value={value}
          prefix={rupees ? "₹" : ""}
          className={`block text-2xl font-extrabold mt-1.5 leading-none tracking-tight ${t.text}`}
        />
        <div className="text-[11px] text-slate-400 mt-1">{label}</div>
      </div>
    </Link>
  );
}
