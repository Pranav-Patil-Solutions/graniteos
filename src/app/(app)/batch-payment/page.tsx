import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import BatchPaymentForm from "@/components/money/BatchPaymentForm";

export const dynamic = "force-dynamic";

export default async function BatchPaymentPage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: parties }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("parties").select("id, kind, name, opening_balance_paise"),
    supabase.from("invoices").select("customer_id, total_paise"),
    supabase.from("payments").select("customer_id, amount_paise"),
  ]);

  const customers = ((parties ?? []) as { id: string; kind: string; name: string; opening_balance_paise: number }[])
    .filter((p) => p.kind === "customer");
  const invs = (invoices ?? []) as { customer_id: string | null; total_paise: number }[];
  const pays = (payments ?? []) as { customer_id: string | null; amount_paise: number }[];

  const sumBy = (rows: { customer_id: string | null; [k: string]: unknown }[], id: string, key: string) =>
    rows.filter((r) => r.customer_id === id).reduce((n, r) => n + Number(r[key] || 0), 0);

  const withDues = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      outstanding_paise:
        Number(c.opening_balance_paise || 0) + sumBy(invs, c.id, "total_paise") - sumBy(pays, c.id, "amount_paise"),
    }))
    .sort((a, b) => b.outstanding_paise - a.outstanding_paise);

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Batch Payment</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          One payment, auto-allocated across a customer&apos;s open invoices — oldest first.
        </p>
      </div>
      <BatchPaymentForm customers={withDues} />
    </div>
  );
}
