import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus, ArrowUpRight } from "lucide-react";
import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatINRPrecise } from "@/lib/money";
import QuoteActions from "@/components/quotes/QuoteActions";
import ShareWhatsApp from "@/components/money/ShareWhatsApp";

type Item = {
  id: string;
  description: string;
  sqft: number;
  rate_paise: number;
  gst_rate: number;
  line_total_paise: number;
};

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: me, viewOnly } = await requireModuleAccess("quotes");
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name, upi_id")
    .eq("id", me.company_id)
    .single();

  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, quote_no, status, quote_date, valid_until, notes, subtotal_paise, gst_paise, total_paise, parties(name, phone, city)",
    )
    .eq("id", id)
    .single();
  if (!quote) notFound();

  const [{ data: itemsData }, { data: order }, { data: linkedPO }] = await Promise.all([
    supabase
      .from("quote_items")
      .select("id, description, sqft, rate_paise, gst_rate, line_total_paise")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("orders").select("id, order_no").eq("quote_id", id).maybeSingle(),
    supabase.from("purchase_orders").select("id, po_no, status").eq("quote_id", id).maybeSingle(),
  ]);
  const items = (itemsData ?? []) as Item[];
  const customer = (
    quote as unknown as { parties?: { name: string; phone: string | null; city: string | null } }
  ).parties;

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Quotes
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">{quote.quote_no ?? "Quote"}</h1>
          <p className="text-sm text-slate-400">
            {customer?.name ?? "—"}
            {customer?.city ? ` · ${customer.city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!order && quote.status !== "accepted" && !viewOnly && (
            <Link
              href={`/quotes/${id}/edit`}
              className="inline-flex items-center gap-1 rounded-md border border-graphite-500 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
          )}
          <span className="text-xs font-semibold rounded-md px-2 py-1 bg-white/[0.06] text-slate-300 capitalize">
            {quote.status}
          </span>
        </div>
      </div>

      {order && (
        <div className="mt-3 rounded-xl border border-granite-green2/40 bg-granite-green2/10 px-4 py-2 text-sm text-granite-green2">
          ✅ Confirmed as order <b>{order.order_no}</b>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-graphite-600 bg-white/[0.04] p-3">
            <div className="flex justify-between">
              <p className="text-sm text-white font-medium">{it.description}</p>
              <p className="text-sm font-bold text-white">{formatINR(it.line_total_paise)}</p>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {Number(it.sqft).toFixed(2)} sq-ft × {formatINRPrecise(it.rate_paise)} · GST {it.gst_rate}%
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="text-white">{formatINR(quote.subtotal_paise)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">GST</span>
          <span className="text-white">{formatINR(quote.gst_paise)}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Grand total</span>
          <span className="font-extrabold text-gold text-lg">{formatINR(quote.total_paise)}</span>
        </div>
      </div>

      {quote.notes && <p className="mt-3 text-xs text-slate-400">Terms: {quote.notes}</p>}

      {/* Linked purchase order (procurement) */}
      <div className="mt-4 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
        {linkedPO ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Linked purchase order</p>
              <p className="mt-1 text-sm text-white">
                {linkedPO.po_no} <span className="text-slate-400 capitalize">· {linkedPO.status}</span>
              </p>
            </div>
            <Link
              href={`/purchase-orders/${linkedPO.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/15 text-gold px-3 py-1.5 text-sm font-semibold"
            >
              View PO <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Procurement</p>
              <p className="mt-1 text-sm text-slate-300">No PO raised for this quote yet.</p>
            </div>
            <Link
              href={`/purchase-orders/new?quote=${id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-granite-green2 text-white px-3 py-1.5 text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Raise PO
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4">
        <ShareWhatsApp
          phone={customer?.phone ?? null}
          label="Send quote on WhatsApp"
          message={
            `Hello ${customer?.name ?? ""}, here is your quote ${quote.quote_no ?? ""} from ${company?.name ?? ""}.\n` +
            `Total: ${formatINR(quote.total_paise)} (incl. GST).` +
            (quote.notes ? `\nTerms: ${quote.notes}` : "") +
            (company?.upi_id ? `\n\nPay via UPI: ${company.upi_id}` : "") +
            `\n\nThank you!`
          }
        />
      </div>

      <QuoteActions quoteId={id} status={quote.status} hasOrder={!!order} viewOnly={viewOnly} />
    </div>
  );
}
