import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function MorningCard({ companyId }: { companyId: string }) {
  const supabase = await createClient();
  const [{ data: parties }, { data: invoices }, { data: payments }, { data: blocks }, { data: slabs }, { data: jobs }] =
    await Promise.all([
      supabase.from("parties").select("kind, opening_balance_paise"),
      supabase.from("invoices").select("total_paise, gst_paise"),
      supabase.from("payments").select("amount_paise, paid_on"),
      supabase.from("blocks").select("cost_paise"),
      supabase.from("slabs").select("status"),
      supabase.from("production_jobs").select("stage"),
    ]);

  const custOpening = (parties ?? [])
    .filter((p) => p.kind === "customer")
    .reduce((n, p) => n + Number(p.opening_balance_paise), 0);
  const invTotal = (invoices ?? []).reduce((n, i) => n + Number(i.total_paise), 0);
  const payTotal = (payments ?? []).reduce((n, p) => n + Number(p.amount_paise), 0);
  const receivables = Math.max(0, custOpening + invTotal - payTotal);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cashIn = (payments ?? [])
    .filter((p) => new Date(p.paid_on) >= cutoff)
    .reduce((n, p) => n + Number(p.amount_paise), 0);

  const inStock = (slabs ?? []).filter((s) => s.status === "in_stock").length;
  const ready = (jobs ?? []).filter((j) => j.stage === "ready").length;

  const outputGst = (invoices ?? []).reduce((n, i) => n + Number(i.gst_paise), 0);
  const inputItc = Math.round((blocks ?? []).reduce((n, b) => n + Number(b.cost_paise), 0) * 0.05);
  const netGst = outputGst - inputItc;

  const rupees = (paise: number) => Math.round(paise / 100);

  return (
    <Link href="/money" className="block">
      <div className="mt-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-[#14110a] to-graphite-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gold uppercase tracking-wider">Today&apos;s pulse</span>
          {ready > 0 && (
            <span className="text-[11px] text-granite-green2 font-semibold">
              🏭 {ready} ready to dispatch
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile label="Cash in (30d)" value={rupees(cashIn)} green />
          <Tile label="Udhaar pending" value={rupees(receivables)} red />
          <Tile label="Slabs in stock" value={inStock} plain />
          <Tile label={netGst >= 0 ? "GST payable (net)" : "GST credit"} value={Math.abs(rupees(netGst))} />
        </div>
        {inputItc > 0 && (
          <p className="mt-3 text-[12px] text-gold/90">
            🧾 You have <b>₹{rupees(inputItc).toLocaleString("en-IN")}</b> input-tax credit to offset against GST.
          </p>
        )}
      </div>
    </Link>
  );
}

function Tile({
  label,
  value,
  green,
  red,
  plain,
}: {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
  plain?: boolean;
}) {
  const color = green ? "text-granite-green2" : red ? "text-red-300" : plain ? "text-white" : "text-gold";
  return (
    <div className="rounded-xl bg-white/[0.04] border border-graphite-600 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <AnimatedNumber
        value={value}
        prefix={plain ? "" : "₹"}
        className={`block text-xl font-extrabold mt-0.5 ${color}`}
      />
    </div>
  );
}
