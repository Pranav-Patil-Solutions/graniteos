import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import RecordPaymentForm from "@/components/money/RecordPaymentForm";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_no, status, invoice_date, subtotal_paise, gst_paise, total_paise, parties(name, phone, city)",
    )
    .eq("id", id)
    .single();
  if (!invoice) notFound();

  const { data: payData } = await supabase
    .from("payments")
    .select("id, amount_paise, mode, paid_on, reference")
    .eq("invoice_id", id)
    .order("paid_on", { ascending: false });
  const pays = (payData ?? []) as {
    id: string;
    amount_paise: number;
    mode: string;
    paid_on: string;
    reference: string | null;
  }[];

  const customer = (invoice as unknown as { parties?: { name: string; city: string | null } }).parties;
  const paid = pays.reduce((n, p) => n + Number(p.amount_paise), 0);
  const outstanding = Number(invoice.total_paise) - paid;

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Invoices
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{invoice.invoice_no ?? "Invoice"}</h1>
          <p className="text-sm text-slate-400">
            {customer?.name ?? "—"}
            {customer?.city ? ` · ${customer.city}` : ""}
          </p>
        </div>
        <span className="text-xs font-semibold rounded-md px-2 py-1 bg-white/[0.06] text-slate-300 capitalize">
          {invoice.status}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-1.5">
        <Row label="Subtotal" value={formatINR(invoice.subtotal_paise)} />
        <Row label="GST" value={formatINR(invoice.gst_paise)} />
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Total</span>
          <span className="font-extrabold text-white">{formatINR(invoice.total_paise)}</span>
        </div>
        <Row label="Paid" value={formatINR(paid)} green />
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Outstanding</span>
          <span className={`font-extrabold ${outstanding > 0 ? "text-red-300" : "text-granite-green2"}`}>
            {formatINR(outstanding)}
          </span>
        </div>
      </div>

      {pays.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Payments</p>
          <div className="space-y-1.5">
            {pays.map((p) => (
              <div
                key={p.id}
                className="flex justify-between rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2 text-sm"
              >
                <span className="text-slate-300 capitalize">
                  {p.mode}
                  {p.reference ? ` · ${p.reference}` : ""}
                  <span className="text-slate-500"> · {p.paid_on}</span>
                </span>
                <span className="font-semibold text-granite-green2">{formatINR(p.amount_paise)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <RecordPaymentForm invoiceId={id} outstandingPaise={outstanding} />
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={green ? "text-granite-green2" : "text-white"}>{value}</span>
    </div>
  );
}
