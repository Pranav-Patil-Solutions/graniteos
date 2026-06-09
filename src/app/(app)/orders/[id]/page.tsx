import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import OrderStatus from "@/components/orders/OrderStatus";
import OrderInvoiceButton from "@/components/money/OrderInvoiceButton";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_no, status, total_paise, quote_id, parties(name, city)")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const customer = (order as unknown as { parties?: { name: string; city: string | null } }).parties;

  const [{ data: items }, { data: invoice }] = await Promise.all([
    order.quote_id
      ? supabase
          .from("quote_items")
          .select("id, description, line_total_paise")
          .eq("quote_id", order.quote_id)
      : Promise.resolve({ data: [] as { id: string; description: string; line_total_paise: number }[] }),
    supabase.from("invoices").select("id, invoice_no").eq("order_id", id).maybeSingle(),
  ]);
  const lines = (items ?? []) as { id: string; description: string; line_total_paise: number }[];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Orders
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-white">{order.order_no ?? "Order"}</h1>
      <p className="text-sm text-slate-400">
        {customer?.name ?? "—"}
        {customer?.city ? ` · ${customer.city}` : ""}
      </p>

      <div className="mt-4">
        <OrderStatus orderId={id} status={order.status} />
      </div>

      <div className="mt-5 space-y-2">
        {lines.map((it) => (
          <div
            key={it.id}
            className="flex justify-between rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2 text-sm"
          >
            <span className="text-slate-200">{it.description}</span>
            <span className="text-white font-semibold">{formatINR(it.line_total_paise)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between rounded-2xl border border-graphite-600 bg-white/[0.04] px-4 py-3">
        <span className="font-bold text-white">Order total</span>
        <span className="font-extrabold text-gold text-lg">{formatINR(order.total_paise)}</span>
      </div>

      {invoice ? (
        <div className="mt-4 flex gap-2">
          <Link
            href={`/invoices/${invoice.id}`}
            className="flex-1 text-center rounded-xl border border-graphite-500 py-2.5 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold"
          >
            View invoice {invoice.invoice_no}
          </Link>
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-graphite-500 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-graphite-600 bg-white/[0.04] px-4 py-3">
          <span className="text-sm text-slate-300">No invoice yet</span>
          <OrderInvoiceButton orderId={id} invoiceId={null} />
        </div>
      )}
    </div>
  );
}
