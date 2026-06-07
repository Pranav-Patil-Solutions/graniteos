import Link from "next/link";
import { FileText, MessageCircle } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatINR } from "@/lib/money";

type Party = { id: string; name: string; phone: string | null; opening_balance_paise: number };

export default async function MoneyPage() {
  const me = await requireSession();
  const supabase = await createClient();

  const [{ data: company }, { data: parties }, { data: invoices }, { data: payments }] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", me.company_id).single(),
      supabase.from("parties").select("id, kind, name, phone, opening_balance_paise"),
      supabase.from("invoices").select("customer_id, total_paise, gst_paise"),
      supabase.from("payments").select("customer_id, amount_paise, paid_on"),
    ]);

  const customers = ((parties ?? []) as (Party & { kind: string })[]).filter(
    (p) => p.kind === "customer",
  );
  const suppliers = ((parties ?? []) as (Party & { kind: string })[]).filter(
    (p) => p.kind === "supplier",
  );
  const invs = (invoices ?? []) as { customer_id: string; total_paise: number; gst_paise: number }[];
  const pays = (payments ?? []) as { customer_id: string; amount_paise: number; paid_on: string }[];

  const invByCust = (cid: string) =>
    invs.filter((i) => i.customer_id === cid).reduce((n, i) => n + Number(i.total_paise), 0);
  const payByCust = (cid: string) =>
    pays.filter((p) => p.customer_id === cid).reduce((n, p) => n + Number(p.amount_paise), 0);

  const udhaar = customers
    .map((c) => ({
      ...c,
      outstanding: Number(c.opening_balance_paise) + invByCust(c.id) - payByCust(c.id),
    }))
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const receivables = udhaar.reduce((n, c) => n + c.outstanding, 0);
  const payables = suppliers.reduce((n, s) => n + Number(s.opening_balance_paise), 0);
  const gstBilled = invs.reduce((n, i) => n + Number(i.gst_paise), 0);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cashIn = pays
    .filter((p) => new Date(p.paid_on) >= cutoff)
    .reduce((n, p) => n + Number(p.amount_paise), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Money</h1>
      <p className="text-sm text-slate-400">{company?.name ?? ""}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Udhaar (receivable)" paise={receivables} gold />
        <Stat label="Cash in (30 days)" paise={cashIn} />
        <Stat label="GST billed" paise={gstBilled} />
        <Stat label="Payable to suppliers" paise={payables} />
      </div>

      <Link
        href="/invoices"
        className="mt-4 flex items-center gap-2 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 text-slate-200 hover:border-gold/40"
      >
        <FileText className="w-5 h-5 text-gold" />
        <span className="font-semibold">Invoices</span>
        <span className="ml-auto text-sm text-slate-400">{invs.length}</span>
      </Link>

      {/* Udhaar Radar */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-gold flex items-center gap-2">
          ⭐ Udhaar Radar — who owes you
        </h2>
        <div className="mt-3 space-y-2">
          {udhaar.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-4">
              No outstanding udhaar. 🎉
            </p>
          )}
          {udhaar.map((c) => {
            const digits = (c.phone ?? "").replace(/\D/g, "");
            const rupees = Math.round(c.outstanding / 100).toLocaleString("en-IN");
            const msg = encodeURIComponent(
              `Namaste ${c.name}, gentle reminder from ${company?.name ?? "us"}: ₹${rupees} is pending. Kindly clear at your convenience. Thank you.`,
            );
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-red-300 font-bold">{formatINR(c.outstanding)}</p>
                </div>
                {digits && (
                  <a
                    href={`https://wa.me/${digits}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-[#06351a] px-3 py-2 text-xs font-bold"
                  >
                    <MessageCircle className="w-4 h-4" /> Remind
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, paise, gold }: { label: string; paise: number; gold?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <AnimatedNumber
        value={Math.round(paise / 100)}
        prefix="₹"
        className={`block text-2xl font-extrabold mt-0.5 ${gold ? "text-gold" : "text-white"}`}
      />
    </Card>
  );
}
