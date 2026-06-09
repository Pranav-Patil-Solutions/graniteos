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
  ] = await Promise.all([
    supabase.from("invoices").select("id, customer_id, total_paise, invoice_date, invoice_no, status, parties(name)"),
    supabase.from("payments").select("amount_paise, paid_on, invoice_id"),
    supabase.from("quotes").select("status, total_paise"),
    supabase.from("orders").select("status"),
    supabase.from("slabs").select("status, net_sqft, rate_paise"),
  ]);

  const inv = invoices ?? [];
  const pays = payments ?? [];
  const qts = quotes ?? [];
  const ords = orders ?? [];
  const slb = slabs ?? [];

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
  const receivables = pendingInvoices.reduce((n, i) => n + i.pending, 0);

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

      {/* revenue trend */}
      <Section title="Revenue · last 6 months" icon={TrendingUp}>
        <div className="flex items-end justify-between gap-2 h-28 px-1">
          {months.map((mk, i) => (
            <div key={mk} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-gold/40 to-gold"
                style={{ height: `${Math.max(3, (monthRevenue[i] / maxMonth) * 100)}%` }}
                title={formatINR(monthRevenue[i])}
              />
              <span className="text-[10px] text-slate-500">{monthLabel(mk)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Peak month: {formatINR(maxMonth)}
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
              const pct = Math.round((amt / topCustomers[0][1]) * 100);
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
  const color =
    tone === "green" ? "text-granite-green2" : tone === "red" ? "text-red-300" : tone === "gold" ? "text-gold" : "text-white";
  return (
    <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
      <div className="flex items-center gap-1.5 text-slate-400"><Icon className="w-3.5 h-3.5" /><span className="text-[11px]">{label}</span></div>
      <p className={`mt-1 text-xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
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
