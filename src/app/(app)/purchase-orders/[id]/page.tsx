import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import POActions from "@/components/procurement/POActions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  sent: "bg-blue-500/15 text-blue-300",
  approved: "bg-granite-green2/20 text-granite-green2",
  received: "bg-gold/15 text-gold",
  cancelled: "bg-red-500/15 text-red-300",
};
const BILL_STYLE: Record<string, string> = {
  unpaid: "bg-red-500/15 text-red-300",
  partial: "bg-amber-500/15 text-amber-300",
  paid: "bg-granite-green2/20 text-granite-green2",
};

export default async function PurchaseOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("*, supplier:parties!purchase_orders_supplier_id_fkey(name), quote:quotes!purchase_orders_quote_id_fkey(quote_no)")
    .eq("id", id)
    .single();
  if (!po) notFound();

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("po_id", id)
    .order("created_at", { ascending: true });

  const { data: bills } = await supabase
    .from("purchase_bills")
    .select("id, bill_no, vendor_bill_no, total_paise, status, bill_date")
    .eq("po_id", id)
    .order("created_at", { ascending: false });

  // Suppliers — needed so a PO raised from a quote (which carries no supplier)
  // can still have its vendor bill recorded against a chosen supplier.
  const { data: suppliers } = await supabase
    .from("parties")
    .select("id, name")
    .eq("kind", "supplier")
    .order("name", { ascending: true });

  const lines = items ?? [];
  const supplierName = (po as { supplier?: { name?: string } }).supplier?.name ?? "—";
  const quoteNo = (po as { quote?: { quote_no?: string } }).quote?.quote_no ?? null;

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-gold">
        <ChevronLeft className="w-4 h-4" /> Purchase Orders
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{po.po_no ?? "Purchase order"}</h1>
          <p className="text-sm text-slate-400">{supplierName}</p>
          {quoteNo && (
            <p className="mt-1 text-xs text-slate-500">
              Raised from quote <span className="text-slate-300">{quoteNo}</span>
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold rounded-md px-2 py-1 capitalize ${STATUS_STYLE[po.status] ?? ""}`}>
          {po.status}
        </span>
      </div>

      {/* line items */}
      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden">
        {lines.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No line items.</p>
        ) : (
          lines.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-graphite-600/50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{it.description}</p>
                <p className="text-xs text-slate-500">
                  {Number(it.qty)} {it.uom} · {formatINR(Number(it.rate_paise))}/unit · GST {Number(it.gst_rate)}%
                </p>
              </div>
              <span className="text-sm font-semibold text-white shrink-0">{formatINR(Number(it.line_total_paise))}</span>
            </div>
          ))
        )}
      </div>

      {/* totals */}
      <div className="mt-4 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="text-white">{formatINR(Number(po.subtotal_paise))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">GST</span>
          <span className="text-white">{formatINR(Number(po.gst_paise))}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Total</span>
          <span className="font-extrabold text-gold text-lg">{formatINR(Number(po.total_paise))}</span>
        </div>
      </div>

      {/* status + record-bill actions */}
      <POActions
        poId={po.id}
        status={po.status}
        supplierId={po.supplier_id}
        suppliers={(suppliers ?? []) as { id: string; name: string }[]}
        subtotalRupees={Math.round(Number(po.subtotal_paise) / 100)}
      />

      {/* bills raised against this PO */}
      <h2 className="mt-7 text-xs font-bold uppercase tracking-widest text-gold">Vendor bills</h2>
      <div className="mt-2 space-y-2">
        {(bills ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No bills recorded yet for this PO.</p>
        ) : (
          (bills ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] px-4 py-3">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {b.bill_no ?? "Bill"}
                  {b.vendor_bill_no ? <span className="text-slate-500"> · {b.vendor_bill_no}</span> : null}
                </p>
                <span className={`inline-block mt-0.5 text-[10px] font-semibold rounded px-1.5 py-0.5 capitalize ${BILL_STYLE[b.status] ?? ""}`}>
                  {b.status}
                </span>
              </div>
              <span className="text-sm font-semibold text-white shrink-0">{formatINR(Number(b.total_paise))}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
