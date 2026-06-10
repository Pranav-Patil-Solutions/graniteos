"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Crown, Moon, Sparkles, AlertTriangle, MessageCircle, Check, Target } from "lucide-react";
import { formatINR } from "@/lib/money";

export type SegCustomer = {
  id: string;
  name: string;
  phone: string;
  optIn: boolean;
  outstanding: number;
  days: number | null;
  revenue: number;
};
export type Segments = {
  hotLeads: SegCustomer[];
  top: SegCustomer[];
  dormant: SegCustomer[];
  newCust: SegCustomer[];
  slowPayers: SegCustomer[];
};
type SegKey = keyof Segments;

function waDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return d;
}

const SEG: {
  key: SegKey;
  title: string;
  icon: typeof Flame;
  tone: "red" | "gold" | "info" | "green";
  marketing: boolean;
  desc: string;
  tmpl: (co: string, cat: string) => string;
}[] = [
  { key: "hotLeads", title: "Hot leads", icon: Flame, tone: "red", marketing: true,
    desc: "Got a quote but never ordered — follow up and close them.",
    tmpl: (co, cat) => `Hi {name}, just following up on your quote from ${co}. The stones are still available — shall I reserve them for you? See our latest stock 👉 ${cat}` },
  { key: "top", title: "Top customers", icon: Crown, tone: "gold", marketing: true,
    desc: "Your highest-revenue buyers — reward them with a first look.",
    tmpl: (co, cat) => `Hi {name}, as one of our most valued customers at ${co}, here's a first look at our new arrivals 👉 ${cat}` },
  { key: "dormant", title: "Dormant", icon: Moon, tone: "info", marketing: true,
    desc: "Bought before but quiet 60+ days — win them back.",
    tmpl: (co, cat) => `Hi {name}, it's been a while! Fresh stock just landed at ${co} — come see what's new 👉 ${cat}` },
  { key: "newCust", title: "New customers", icon: Sparkles, tone: "green", marketing: true,
    desc: "First order in the last 30 days — thank them and cross-sell.",
    tmpl: (co, cat) => `Thank you for your order, {name}! We've got matching pieces at ${co} you might love 👉 ${cat}` },
  { key: "slowPayers", title: "Slow payers", icon: AlertTriangle, tone: "red", marketing: false,
    desc: "Outstanding udhaar — a gentle payment nudge (transactional, not marketing).",
    tmpl: (co) => `Hi {name}, a gentle reminder — {amount} is pending on your account at ${co}. You can pay easily via UPI. Thank you!` },
];

const TONE = {
  red: { text: "text-red-300", chip: "bg-red-500/15 text-red-300", border: "border-red-500/30" },
  gold: { text: "text-gold", chip: "bg-gold/15 text-gold", border: "border-gold/30" },
  info: { text: "text-info", chip: "bg-info/15 text-info", border: "border-info/30" },
  green: { text: "text-granite-green2", chip: "bg-granite-green2/15 text-granite-green2", border: "border-granite-green2/30" },
} as const;

export default function MarketingHelper({
  companyId,
  companyName,
  segments,
  totalCustomers,
}: {
  companyId: string;
  companyName: string;
  segments: Segments;
  totalCustomers: number;
}) {
  const [origin, setOrigin] = useState("");
  const [active, setActive] = useState<SegKey>("hotLeads");
  const [override, setOverride] = useState<Partial<Record<SegKey, string>>>({});
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => setOrigin(window.location.origin), []);
  const catalogueUrl = origin ? `${origin}/catalog/${companyId}` : "";

  const meta = SEG.find((s) => s.key === active)!;
  const list = segments[active];

  const message = useMemo(
    () => override[active] ?? meta.tmpl(companyName, catalogueUrl),
    [override, active, meta, companyName, catalogueUrl],
  );

  function personalize(c: SegCustomer): string {
    return message.replaceAll("{name}", c.name).replaceAll("{amount}", formatINR(c.outstanding));
  }
  function subFor(c: SegCustomer): string {
    if (active === "slowPayers") return `${formatINR(c.outstanding)} pending`;
    if (active === "dormant") return c.days !== null ? `${c.days}d quiet` : "quiet";
    if (active === "top") return `${formatINR(c.revenue)} lifetime`;
    if (active === "newCust") return "new customer";
    return "quoted, not ordered";
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 pb-10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Target className="w-6 h-6 text-gold" /> Marketing helper
      </h1>
      <p className="text-sm text-slate-400">Who to reach, and what to say — from {totalCustomers} customers.</p>

      {/* segment summary tiles */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {SEG.map((s) => {
          const t = TONE[s.tone];
          const Icon = s.icon;
          const on = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${on ? `bg-white/[0.06] ${t.border}` : "border-graphite-600 bg-white/[0.03]"}`}
            >
              <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center ${t.chip}`}>
                <Icon className="w-4 h-4" />
              </span>
              <p className={`mt-1.5 text-xl font-extrabold ${t.text}`}>{segments[s.key].length}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{s.title}</p>
            </button>
          );
        })}
      </div>

      {/* active segment */}
      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2">
          <meta.icon className={`w-4 h-4 ${TONE[meta.tone].text}`} />
          <h2 className="text-sm font-bold text-white">{meta.title}</h2>
          <span className="ml-auto text-xs text-slate-500">{list.length} {list.length === 1 ? "customer" : "customers"}</span>
        </div>
        <p className="mt-1 text-[12px] text-slate-400">{meta.desc}</p>

        <textarea
          value={message}
          onChange={(e) => setOverride((o) => ({ ...o, [active]: e.target.value }))}
          rows={4}
          className="mt-3 w-full text-sm leading-relaxed !min-h-0 p-3 focus:border-gold outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          <code className="text-gold">{"{name}"}</code>{active === "slowPayers" ? <> and <code className="text-gold">{"{amount}"}</code></> : ""} fill in per customer.
        </p>
      </div>

      {/* customer list */}
      {list.length === 0 ? (
        <p className="mt-5 text-center text-sm text-slate-500 py-6">No customers in this segment right now. 🎉</p>
      ) : (
        <div className="mt-4 space-y-2">
          {list.map((c) => {
            const blocked = meta.marketing && !c.optIn;
            const link = `https://wa.me/${waDigits(c.phone)}?text=${encodeURIComponent(personalize(c))}`;
            const isSent = sent.has(c.id + active);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400">{subFor(c)}{blocked ? " · opted out" : ""}</p>
                </div>
                {blocked ? (
                  <span className="text-[11px] text-slate-500 px-2">no consent</span>
                ) : (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSent((s) => new Set(s).add(c.id + active))}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                      isSent ? "bg-granite-green2/15 text-granite-green2 border border-granite-green2/30" : "bg-[#25D366] text-[#06351a]"
                    }`}
                  >
                    {isSent ? <><Check className="w-4 h-4" /> Sent</> : <><MessageCircle className="w-4 h-4" /> Send</>}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
