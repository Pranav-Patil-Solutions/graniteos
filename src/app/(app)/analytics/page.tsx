import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, TrendingUp, Wallet, AlertTriangle, Package, Users, FileText } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { formatINR } from "@/lib/money";

function monthKey(d: string): string {
  return (d ?? "").slice(0, 7); // YYYY-MM
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

export default async function AnalyticsPage() {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");

  const supabase = await createClient();
  const [
    { data: invoices },
    { data: payments },
    { data: quotes },
    { data: orders },
    { data: slabs },
    { data: customers },
  ] = await Promise.all([
    supabase.from("invoices").select("id, customer_id, total_paise, invoice_date, invoice_no, status, parties(name)"),
    supabase.from("payments").select("amount_paise, paid_on, invoice_id"),
    supabase.from("quotes").select("status, total_paise"),
    supabase.from("orders").select("status"),
    supabase.from("slabs").select("status, net_sqft, rate_paise"),
    supabase.from("parties").select("opening_balance_paise").eq("kind", "customer"),
  ]);

  const inv = invoices ?? [];
  const pays = payments ?? [];
  const qts = quotes ?? [];
  const ords = orders ?? [];
  const slb = slabs ?? [];
  const openingReceivable = (customers ?? []).reduce((n, c) => n + Number(c.opening_balance_paise), 0);

  // ── headline money ─────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const revenueAll = inv.reduce((n, i) => n + Number(i.total_paise), 0);
  const revenueMonth = inv.filter((i) => monthKey(i.invoice_date as string) === thisMonth).reduce((n, i) => n + Number(i.total_paise), 0);
  const collectedAll = pays.reduce((n, p) => n + Number(p.amount_paise), 0);
  const collectedMonth = pays.filter((p) => monthKey(p.paid_on as string) === thisMonth).reduce((n, p) => n + Number(p.amount_paise), 0);

  // ── receivables: per-invoice pending ───────────────────────────────────────
  const paidByInvoice = new Map<string, number>();
  for (const p of pays) {
    if (p.invoice_id) paidByInvoice.set(p.invoice_id as string, (paidByInvoice.get(p.invoice_id as string) ?? 0) + Number(p.amount_paise));
  }
  const pendingInvoices = inv
    .map((i) => ({
      id: i.id as string,
      no: (i.invoice_no as string) ?? "Invoice",
      name: ((i as unknown as { parties?: { name?: string } }).parties?.name) ?? "—",
      total: Number(i.total_paise),
      pending: Math.max(0, Number(i.total_paise) - (paidByInvoice.get(i.id as string) ?? 0)),
    }))
    .filter((i) => i.pending > 0)
    .sort((a, b) => b.pending - a.pending);
  // Total receivable = unpaid invoice amounts + carried-forward opening balances
  // (matches the per-customer "outstanding" shown on the party page).
  const receivables = pendingInvoices.reduce((n, i) => n + i.pending, 0) + openingReceivable;

  // ── quote funnel ───────────────────────────────────────────────────────────
  const quoteCount = qts.length;
  const acceptedCount = qts.filter((q) => q.status === "accepted").length;
  const conversion = quoteCount ? Math.round((acceptedCount / quoteCount) * 100) : 0;

  // ── orders by status ───────────────────────────────────────────────────────
  const orderStatus = ords.reduce<Record<string, number>>((m, o) => {
    const s = o.status as string;
    m[s] = (m[s] ?? 0) + 1;
    return m;
  }, {});

  // ── inventory value (in-stock slabs) ───────────────────────────────────────
  const inStock = slb.filter((s) => s.status === "in_stock");
  const stockValue = inStock.reduce((n, s) => n + Number(s.net_sqft ?? 0) * Number(s.rate_paise ?? 0), 0);

  // ── top customers by revenue ───────────────────────────────────────────────
  const byCustomer = new Map<string, number>();
  for (const i of inv) {
    const name = ((i as unknown as { parties?: { name?: string } }).parties?.name) ?? "—";
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + Number(i.total_paise));
  }
  const topCustomers = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── last 6 months revenue trend ────────────────────────────────────────────
  const months: string[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthRevenue = months.map((mk) => inv.filter((i) => monthKey(i.invoice_date as string) === mk).reduce((n, i) => n + Number(i.total_paise), 0));
  const maxMonth = Math.max(1, ...monthRevenue);

  // SVG area-chart geometry for the revenue trend (no chart library).
  const CW = 320, CH = 120, PAD = 14, BASE = CH - 16;
  const pts = monthRevenue.map((rev, i) => {
    const x = PAD + (i * (CW - PAD * 2)) / Math.max(1, months.length - 1);
    const y = 12 + (1 - rev / maxMonth) * (BASE - 12);
    return [x, y] as const;
  });
  const linePath = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)} ${BASE} L${pts[0][0].toFixed(1)} ${BASE} Z`;

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft className="w-4 h-4" /> Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Business insights</h1>
      <p className="text-sm text-slate-400">Owner view · live across the whole company</p>

      {/* KPI grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Kpi icon={TrendingUp} label="Revenue (all)" value={formatINR(revenueAll)} sub={`${formatINR(revenueMonth)} this month`} tone="white" />
        <Kpi icon={Wallet} label="Collected" value={formatINR(collectedAll)} sub={`${formatINR(collectedMonth)} this month`} tone="green" />
        <Kpi icon={AlertTriangle} label="Receivables" value={formatINR(receivables)} sub={`${pendingInvoices.length} invoices pending`} tone="red" />
        <Kpi icon={Package} label="Stock value" value={formatINR(stockValue)} sub={`${inStock.length} slabs in stock`} tone="gold" />
      </div>

      {/* revenue trend — gradient area chart */}
      <Section title="Revenue · last 6 months" icon={TrendingUp}>
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0b07a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#c98b4b" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rev-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e0b07a" />
              <stop offset="100%" stopColor="#c98b4b" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={PAD} x2={CW - PAD} y1={12 + g * (BASE - 12)} y2={12 + g * (BASE - 12)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          <path d={areaPath} fill="url(#rev-fill)" />
          <path d={linePath} fill="none" stroke="url(#rev-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? "#e0b07a" : "#0c0a08"} stroke="#e0b07a" strokeWidth="1.5" />
          ))}
        </svg>
        <div className="mt-1 flex justify-between px-1">
          {months.map((mk, i) => (
            <span key={mk} className={`text-[10px] ${i === months.length - 1 ? "text-gold font-semibold" : "text-slate-500"}`}>
              {monthLabel(mk)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          This month: <span className="text-gold font-semibold">{formatINR(monthRevenue[months.length - 1])}</span> · Peak {formatINR(maxMonth)}
        </p>
      </Section>

      {/* pending invoices — which invoice owes how much */}
      <Section title="Pending invoices" icon={AlertTriangle}>
        {pendingInvoices.length === 0 ? (
          <p className="text-center text-sm text-granite-green2 py-2">All invoices fully paid 🎉</p>
        ) : (
          <div className="space-y-1.5">
            {pendingInvoices.slice(0, 8).map((i) => (
              <Link
                key={i.id}
                href={`/invoices/${i.id}`}
                className="flex items-center justify-between rounded-lg border border-graphite-600 bg-white/[0.03] px-3 py-2 hover:border-gold/40"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{i.no}</p>
                  <p className="text-[11px] text-slate-400 truncate">{i.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-sm font-bold text-red-300">{formatINR(i.pending)}</span>
                  <span className="text-[10px] text-slate-500">of {formatINR(i.total)}</span>
                </div>
              </Link>
            ))}
            {pendingInvoices.length > 8 && (
              <p className="text-center text-[11px] text-slate-500 pt-1">+{pendingInvoices.length - 8} more</p>
            )}
          </div>
        )}
      </Section>

      {/* quote funnel + orders */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-slate-300"><FileText className="w-4 h-4" /><span className="text-sm font-semibold">Quote funnel</span></div>
          <p className="mt-2 text-3xl font-extrabold text-gold">{conversion}%</p>
          <p className="text-[11px] text-slate-400">{acceptedCount} of {quoteCount} quotes accepted</p>
        </div>
        <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-slate-300"><Package className="w-4 h-4" /><span className="text-sm font-semibold">Orders</span></div>
          <div className="mt-2 space-y-0.5">
            {Object.keys(orderStatus).length === 0 && <p className="text-[11px] text-slate-500">No orders yet.</p>}
            {Object.entries(orderStatus).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-slate-400 capitalize">{s.replace("_", " ")}</span>
                <span className="text-white font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* top customers */}
      <Section title="Top customers by revenue" icon={Users}>
        {topCustomers.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-2">No revenue yet.</p>
        ) : (
          <div className="space-y-2">
            {topCustomers.map(([name, amt]) => {
              const pct = Math.round((amt / (topCustomers[0][1] || 1)) * 100);
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-200 truncate">{name}</span>
                    <span className="text-white font-semibold">{formatINR(amt)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-granite-green to-granite-green2" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub: string;
  tone: "white" | "green" | "red" | "gold";
}) {
  const map = {
    white: { text: "text-white", chip: "bg-white/[0.08] text-slate-200", glow: "rgba(255,255,255,.05)" },
    green: { text: "text-granite-green2", chip: "bg-granite-green2/15 text-granite-green2", glow: "rgba(52,211,153,.10)" },
    red: { text: "text-red-300", chip: "bg-red-500/15 text-red-300", glow: "rgba(248,113,113,.10)" },
    gold: { text: "text-gold", chip: "bg-gold/15 text-gold", glow: "rgba(201,139,75,.12)" },
  }[tone];
  return (
    <div className="relative rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(140px 90px at 100% 0%, ${map.glow}, transparent 70%)` }} />
      <div className="relative">
        <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center ${map.chip}`}>
          <Icon className="w-4 h-4" />
        </span>
        <p className={`mt-2 text-2xl font-extrabold leading-none tracking-tight ${map.text}`}>{value}</p>
        <p className="text-[11px] text-slate-400 mt-1.5">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300">
        <Icon className="w-4 h-4 text-slate-400" /> {title}
      </h2>
      <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">{children}</div>
    </div>
  );
}
