import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import BatchPaymentForm from "@/components/money/BatchPaymentForm";

export const dynamic = "force-dynamic";

export default async function BatchPaymentPage() {
  await requireModuleAccess("money");
  const supabase = await createClient();

  const [{ data: parties }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("parties").select("id, kind, name"),
    supabase.from("invoices").select("id, invoice_no, customer_id, total_paise, status, created_at"),
    supabase.from("payments").select("invoice_id, amount_paise"),
  ]);

  const customers = ((parties ?? []) as { id: string; kind: string; name: string }[]).filter(
    (p) => p.kind === "customer",
  );
  const invs = (invoices ?? []) as {
    id: string; invoice_no: string | null; customer_id: string | null; total_paise: number; status: string; created_at: string;
  }[];
  const pays = (payments ?? []) as { invoice_id: string | null; amount_paise: number }[];

  // Paid-so-far per invoice → outstanding per invoice (mirrors the action).
  const paidByInv = new Map<string, number>();
  for (const p of pays) {
    if (p.invoice_id) paidByInv.set(p.invoice_id, (paidByInv.get(p.invoice_id) || 0) + Number(p.amount_paise));
  }

  // Open invoices grouped by customer, oldest first — exactly what FIFO fills.
  const openByCustomer = new Map<string, { id: string; no: string | null; outstanding_paise: number; created_at: string }[]>();
  for (const i of invs) {
    if (!i.customer_id || i.status === "paid") continue;
    const out = Number(i.total_paise) - (paidByInv.get(i.id) || 0);
    if (out <= 0) continue;
    const arr = openByCustomer.get(i.customer_id) ?? [];
    arr.push({ id: i.id, no: i.invoice_no, outstanding_paise: out, created_at: i.created_at });
    openByCustomer.set(i.customer_id, arr);
  }
  for (const arr of openByCustomer.values()) {
    arr.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }

  // Only customers who actually have open invoices to settle.
  const withDues = customers
    .map((c) => {
      const inv = openByCustomer.get(c.id) ?? [];
      return {
        id: c.id,
        name: c.name,
        outstanding_paise: inv.reduce((n, x) => n + x.outstanding_paise, 0),
        invoices: inv.map((x) => ({ id: x.id, no: x.no, outstanding_paise: x.outstanding_paise })),
      };
    })
    .filter((c) => c.invoices.length > 0)
    .sort((a, b) => b.outstanding_paise - a.outstanding_paise);

  return (
    <div className="px-4 pt-12 pb-8 max-w-md lg:max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Batch Payment</h1>
        <p className="text-sm text-slate-400">
          One payment, auto-allocated across a customer&apos;s open invoices — oldest first.
        </p>
      </div>
      <BatchPaymentForm customers={withDues} />
    </div>
  );
}
