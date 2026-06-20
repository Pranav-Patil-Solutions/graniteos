import Link from "next/link";
import { Plus, ChevronRight, ShoppingCart } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  sent: "bg-blue-500/15 text-blue-300",
  approved: "bg-granite-green2/20 text-granite-green2",
  received: "bg-gold/15 text-gold",
  cancelled: "bg-red-500/15 text-red-300",
};

export default async function PurchaseOrdersPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_no, status, po_date, total_paise, parties(name)")
    .order("created_at", { ascending: false });

  const pos = (data ?? []) as unknown as {
    id: string;
    po_no: string | null;
    status: string;
    po_date: string;
    total_paise: number;
    parties: { name: string } | null;
  }[];

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Purchase Orders</h1>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-granite-green2 text-white px-3.5 py-2 text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> New
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {pos.length === 0 && (
          <EmptyState
            heading="No purchase orders yet"
            subtext="Raise a purchase order to buy stone or supplies from a supplier. GST is auto-calculated and you can record the vendor's bill against it."
            actionLabel="Raise your first PO"
            actionHref="/purchase-orders/new"
            icon={<ShoppingCart className="w-10 h-10" />}
          />
        )}
        {pos.map((p) => (
          <Link key={p.id} href={`/purchase-orders/${p.id}`} className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 hover:border-gold/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">
                  {p.po_no ?? "PO"}{" "}
                  <span className="font-normal text-slate-400">· {p.parties?.name ?? "—"}</span>
                </p>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold rounded-md px-2 py-0.5 capitalize ${STATUS_STYLE[p.status] ?? ""}`}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-gold">{formatINR(p.total_paise)}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
