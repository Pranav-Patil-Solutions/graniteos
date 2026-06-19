import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import { getAccessLevel } from "@/lib/access-control-guard";
import OrderInvoiceButton from "@/components/money/OrderInvoiceButton";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-blue-500/15 text-blue-300",
  in_production: "bg-amber-500/15 text-amber-300",
  dispatched: "bg-purple-500/15 text-purple-300",
  delivered: "bg-granite-green2/20 text-granite-green2",
  cancelled: "bg-red-500/15 text-red-300",
};

export default async function OrdersPage() {
  const { level } = await getAccessLevel("orders");
  if (level === "none") redirect("/dashboard");

  const viewOnly = level === "view";

  const supabase = await createClient();
  const [{ data, error: loadError }, { data: invData }] = await Promise.all([
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
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-slate-400">Confirmed from quotes</p>
        </div>
        {viewOnly && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/15 text-blue-300 px-3 py-1.5 text-xs font-semibold border border-blue-500/20">
            <Eye className="w-3.5 h-3.5" /> View only
          </span>
        )}
      </div>

      {viewOnly && (
        <p className="mt-2 text-xs text-blue-300/70">
          You have read-only access. Ask the owner to enable editing for your role.
        </p>
      )}

      {loadError && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Couldn&apos;t load orders right now. Please refresh — if it keeps happening, contact support.
        </div>
      )}

      <div className="mt-5 space-y-2">
        {!loadError && orders.length === 0 && (
          <EmptyState
            heading="No orders yet"
            subtext="Orders are created when a customer confirms a quote. Start by creating a quote — then convert it to an order when they agree."
            actionLabel={!viewOnly ? "Go to Quotes" : undefined}
            actionHref={!viewOnly ? "/quotes" : undefined}
            icon={<ShoppingBag className="w-10 h-10" />}
          />
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
              {!viewOnly && (
                <div className="mt-1">
                  <OrderInvoiceButton orderId={o.id} invoiceId={invoiceForOrder.get(o.id) ?? null} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
