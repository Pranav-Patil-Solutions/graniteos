import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail, MapPin, FileText, ShoppingCart, ReceiptText, Wallet, Box } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import { stateLabel } from "@/lib/gst";

type Kind = "customer" | "supplier";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type Entry = {
  kind: "quote" | "order" | "invoice" | "payment";
  date: string;
  label: string;
  sub: string;
  amount: number;
  pending?: number; // for invoices: how much is still unpaid
  href: string;
  tone: "in" | "out" | "neutral";
};

const META = {
  quote: { icon: FileText, color: "text-slate-300", bg: "bg-white/[0.06]", word: "Quote" },
  order: { icon: ShoppingCart, color: "text-blue-300", bg: "bg-blue-500/10", word: "Order" },
  invoice: { icon: ReceiptText, color: "text-gold", bg: "bg-gold/10", word: "Invoice" },
  payment: { icon: Wallet, color: "text-granite-green2", bg: "bg-granite-green2/10", word: "Payment" },
} as const;

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select(
      "id, kind, name, party_type, phone, email, city, address, gstin, gst_state_code, legal_name, credit_limit_paise, opening_balance_paise, notes",
    )
    .eq("id", id)
    .single();
  if (!party) notFound();

  const kind = party.kind as Kind;
  const isCustomer = kind === "customer";

  // ── Customer ledger: quotes + orders + invoices + payments ────────────────
  const [{ data: quotes }, { data: orders }, { data: invoices }, { data: payments }] =
    isCustomer
      ? await Promise.all([
          supabase.from("quotes").select("id, quote_no, status, quote_date, total_paise").eq("customer_id", id),
          supabase.from("orders").select("id, order_no, status, total_paise, created_at").eq("customer_id", id),
          supabase.from("invoices").select("id, invoice_no, status, invoice_date, total_paise").eq("customer_id", id),
          supabase.from("payments").select("id, amount_paise, mode, reference, paid_on, invoice_id").eq("customer_id", id),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  // ── Supplier: blocks they supplied (matched by name) ──────────────────────
  const { data: blocks } = isCustomer
    ? { data: [] }
    : await supabase
        .from("blocks")
        .select("id, label, material, cost_paise, created_at")
        // exact (case-insensitive) match — ilike with the raw name would treat
        // any % or _ in the supplier name as a wildcard and match wrong blocks.
        .ilike("supplier", (party.name as string).trim().replace(/([%_\\])/g, "\\$1"))
        .order("created_at", { ascending: false });

  const opening = Number(party.opening_balance_paise);
  const invoicedTotal = (invoices ?? []).reduce((n, i) => n + Number(i.total_paise), 0);
  const paidTotal = (payments ?? []).reduce((n, p) => n + Number(p.amount_paise), 0);
  const quotedTotal = (quotes ?? []).reduce((n, q) => n + Number(q.total_paise), 0);
  const outstanding = opening + invoicedTotal - paidTotal;
  const blockCost = (blocks ?? []).reduce((n, b) => n + Number(b.cost_paise), 0);

  // How much has been paid against each invoice → per-invoice pending.
  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.invoice_id)
      paidByInvoice.set(p.invoice_id as string, (paidByInvoice.get(p.invoice_id as string) ?? 0) + Number(p.amount_paise));
  }
  const totalPending = (invoices ?? []).reduce(
    (n, iv) => n + Math.max(0, Number(iv.total_paise) - (paidByInvoice.get(iv.id as string) ?? 0)),
    0,
  );

  const entries: Entry[] = isCustomer
    ? [
        ...(quotes ?? []).map((q) => ({
          kind: "quote" as const,
          date: (q.quote_date as string) ?? "",
          label: (q.quote_no as string) ?? "Quote",
          sub: q.status as string,
          amount: Number(q.total_paise),
          href: `/quotes/${q.id}`,
          tone: "neutral" as const,
        })),
        ...(orders ?? []).map((o) => ({
          kind: "order" as const,
          date: ((o.created_at as string) ?? "").slice(0, 10),
          label: (o.order_no as string) ?? "Order",
          sub: (o.status as string).replace("_", " "),
          amount: Number(o.total_paise),
          href: `/orders/${o.id}`,
          tone: "neutral" as const,
        })),
        ...(invoices ?? []).map((iv) => {
          const pending = Math.max(0, Number(iv.total_paise) - (paidByInvoice.get(iv.id as string) ?? 0));
          return {
            kind: "invoice" as const,
            date: (iv.invoice_date as string) ?? "",
            label: (iv.invoice_no as string) ?? "Invoice",
            sub: iv.status as string,
            amount: Number(iv.total_paise),
            pending,
            href: `/invoices/${iv.id}`,
            tone: "out" as const,
          };
        }),
        ...(payments ?? []).map((p) => ({
          kind: "payment" as const,
          date: (p.paid_on as string) ?? "",
          label: `Payment · ${p.mode}`,
          sub: (p.reference as string) || "received",
          amount: Number(p.amount_paise),
          href: p.invoice_id ? `/invoices/${p.invoice_id}` : `/parties/${id}`,
          tone: "in" as const,
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    : [];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link href="/parties" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft className="w-4 h-4" /> Parties
      </Link>

      {/* header */}
      <div className="mt-2 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center text-lg font-bold shrink-0">
          {party.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white leading-tight">{party.name}</h1>
          <p className="text-sm text-slate-400">
            <span className="capitalize">{kind}</span>
            {party.party_type ? ` · ${party.party_type}` : ""}
          </p>
        </div>
      </div>

      {/* contact chips */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        {party.phone && <Chip icon={Phone} href={`tel:${party.phone}`}>{party.phone}</Chip>}
        {party.email && <Chip icon={Mail} href={`mailto:${party.email}`}>{party.email}</Chip>}
        {party.city && <Chip icon={MapPin}>{party.city}</Chip>}
      </div>
      {party.gstin && (
        <p className="mt-2 text-xs text-slate-400">
          <b className="text-slate-300">GSTIN:</b> {party.gstin} · {stateLabel(party.gst_state_code)}
          {party.legal_name ? ` · ${party.legal_name}` : ""}
        </p>
      )}

      {/* summary */}
      {isCustomer ? (
        <>
          <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
            <div className="flex items-end justify-between">
              <span className="text-sm text-slate-400">Outstanding (they owe you)</span>
              <span className={`text-2xl font-extrabold ${outstanding > 0 ? "text-red-300" : "text-granite-green2"}`}>
                {formatINR(outstanding)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Invoiced" value={formatINR(invoicedTotal)} />
              <Mini label="Paid" value={formatINR(paidTotal)} green />
              <Mini label="Quoted" value={formatINR(quotedTotal)} />
            </div>
            {totalPending > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <span className="text-xs text-red-200">
                  {(invoices ?? []).filter((iv) => Number(iv.total_paise) - (paidByInvoice.get(iv.id as string) ?? 0) > 0).length} invoice(s) pending
                </span>
                <span className="text-sm font-bold text-red-300">{formatINR(totalPending)}</span>
              </div>
            )}
            {opening !== 0 && (
              <p className="mt-2 text-[11px] text-slate-500">Includes opening balance of {formatINR(opening)}.</p>
            )}
          </div>

          {/* timeline */}
          <h2 className="mt-6 mb-2 text-sm font-bold text-slate-300">
            History <span className="text-slate-500 font-normal">· {entries.length} records</span>
          </h2>
          {entries.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              No transactions yet for this customer.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => {
                const m = META[e.kind];
                const Icon = m.icon;
                return (
                  <Link
                    key={i}
                    href={e.href}
                    className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] p-3 hover:border-gold/40 transition-colors"
                  >
                    <span className={`w-8 h-8 rounded-lg grid place-items-center ${m.bg} ${m.color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{e.label}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{fmtDate(e.date)} · {e.sub}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`block text-sm font-bold ${
                          e.tone === "in" ? "text-granite-green2" : e.tone === "out" ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {e.tone === "in" ? "+" : ""}
                        {formatINR(e.amount)}
                      </span>
                      {e.kind === "invoice" &&
                        (e.pending && e.pending > 0 ? (
                          <span className="mt-0.5 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            {formatINR(e.pending)} pending
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block rounded-full bg-granite-green2/15 px-2 py-0.5 text-[10px] font-bold text-granite-green2">
                            paid
                          </span>
                        ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
            <div className="flex items-end justify-between">
              <span className="text-sm text-slate-400">Payable (you owe them)</span>
              <span className={`text-2xl font-extrabold ${opening > 0 ? "text-amber-300" : "text-granite-green2"}`}>
                {formatINR(opening)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <Mini label="Blocks supplied" value={String((blocks ?? []).length)} />
              <Mini label="Stock value" value={formatINR(blockCost)} />
            </div>
          </div>

          <h2 className="mt-6 mb-2 text-sm font-bold text-slate-300">
            Blocks supplied <span className="text-slate-500 font-normal">· {(blocks ?? []).length}</span>
          </h2>
          {(blocks ?? []).length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              No blocks recorded from this supplier yet.
              <br />
              <span className="text-[11px]">
                (Blocks are linked by supplier name — make sure it matches “{party.name}”.)
              </span>
            </p>
          ) : (
            <div className="space-y-2">
              {(blocks ?? []).map((b) => (
                <Link
                  key={b.id as string}
                  href={`/inventory/${b.id}`}
                  className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] p-3 hover:border-gold/40 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg grid place-items-center bg-white/[0.06] text-slate-300 shrink-0">
                    <Box className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{b.label as string}</p>
                    <p className="text-[11px] text-slate-400">{(b.material as string) ?? ""} · {fmtDate((b.created_at as string)?.slice(0, 10))}</p>
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">{formatINR(Number(b.cost_paise))}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {party.notes && (
        <div className="mt-6 rounded-xl border border-graphite-600 bg-white/[0.04] p-3 text-xs text-slate-300">
          <span className="text-slate-500">Notes: </span>{party.notes}
        </div>
      )}
    </div>
  );
}

function Chip({ icon: Icon, href, children }: { icon: typeof Phone; href?: string; children: React.ReactNode }) {
  const inner = (
    <span className="inline-flex items-center gap-1 rounded-full border border-graphite-600 bg-white/[0.04] px-2.5 py-1">
      <Icon className="w-3 h-3" /> {children}
    </span>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function Mini({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2">
      <div className={`text-sm font-bold ${green ? "text-granite-green2" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
