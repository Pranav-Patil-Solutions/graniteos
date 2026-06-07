import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import OrderInvoiceButton from "@/components/money/OrderInvoiceButton";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-blue-500/15 text-blue-300",
  in_production: "bg-amber-500/15 text-amber-300",
  dispatched: "bg-purple-500/15 text-purple-300",
  delivered: "bg-granite-green2/20 text-granite-green2",
  cancelled: "bg-red-500/15 text-red-300",
};

export default async function OrdersPage() {
  await requireSession();
  const supabase = await createClient();
  const [{ data }, { data: invData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_no, status, total_paise, created_at, parties(name), quotes(quote_no)")
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, order_id"),
  ]);

  const orders = (data ?? []) as unknown as {
    id: string;
    order_no: string | null;
    status: string;
    total_paise: number;
    parties: { name: string } | null;
    quotes: { quote_no: string | null } | null;
  }[];
  const invoiceForOrder = new Map(
    ((invData ?? []) as { id: string; order_id: string | null }[])
      .filter((i) => i.order_id)
      .map((i) => [i.order_id as string, i.id]),
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Orders</h1>
      <p className="text-sm text-slate-400">Confirmed from quotes</p>

      <div className="mt-5 space-y-2">
        {orders.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">
            No orders yet — confirm a quote to create one.
          </p>
        )}
        {orders.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4"
          >
            <Link href={`/orders/${o.id}`} className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">
                {o.order_no ?? "Order"}{" "}
                <span className="font-normal text-slate-400">· {o.parties?.name ?? "—"}</span>
              </p>
              <span
                className={`inline-block mt-1 text-[11px] font-semibold rounded-md px-2 py-0.5 capitalize ${STATUS_STYLE[o.status] ?? ""}`}
              >
                {o.status.replace("_", " ")}
              </span>
            </Link>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-gold">{formatINR(o.total_paise)}</div>
              <div className="mt-1">
                <OrderInvoiceButton orderId={o.id} invoiceId={invoiceForOrder.get(o.id) ?? null} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
