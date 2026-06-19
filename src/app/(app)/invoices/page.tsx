import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";

const STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-red-500/15 text-red-300",
  partial: "bg-amber-500/15 text-amber-300",
  paid: "bg-granite-green2/20 text-granite-green2",
};

export default async function InvoicesPage() {
  await requireModuleAccess("money");
  const supabase = await createClient();
  const [{ data: invData }, { data: payData }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_no, status, total_paise, parties(name)")
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("invoice_id, amount_paise"),
  ]);

  const invoices = (invData ?? []) as unknown as {
    id: string;
    invoice_no: string | null;
    status: string;
    total_paise: number;
    parties: { name: string } | null;
  }[];
  const pays = (payData ?? []) as { invoice_id: string; amount_paise: number }[];
  const paidFor = (id: string) =>
    pays.filter((p) => p.invoice_id === id).reduce((n, p) => n + Number(p.amount_paise), 0);

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Invoices</h1>
      <p className="text-sm text-slate-400">Bills &amp; payments</p>

      <div className="mt-5 space-y-2">
        {invoices.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">
            No invoices yet — create one from a confirmed order.
          </p>
        )}
        {invoices.map((inv) => {
          const outstanding = Number(inv.total_paise) - paidFor(inv.id);
          return (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
              <div className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 hover:border-gold/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">
                    {inv.invoice_no ?? "Invoice"}{" "}
                    <span className="font-normal text-slate-400">· {inv.parties?.name ?? "—"}</span>
                  </p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-semibold rounded-md px-2 py-0.5 capitalize ${STATUS_STYLE[inv.status] ?? ""}`}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-gold">{formatINR(inv.total_paise)}</div>
                  {outstanding > 0 && (
                    <div className="text-[11px] text-red-300">{formatINR(outstanding)} due</div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
