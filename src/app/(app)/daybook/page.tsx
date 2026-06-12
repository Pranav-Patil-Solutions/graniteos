import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { buildActivityLog, type LogKind } from "@/lib/activity-log";
import { groupByDay } from "@/lib/daybook";

export const dynamic = "force-dynamic";

const KIND_STYLE: Record<LogKind, string> = {
  party: "bg-sky-500/15 text-sky-300",
  invoice: "bg-violet-500/15 text-violet-300",
  payment: "bg-emerald-500/15 text-emerald-300",
  order: "bg-amber-500/15 text-amber-300",
  quote: "bg-blue-500/15 text-blue-300",
  slab: "bg-stone-400/15 text-stone-300",
};

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function DaybookPage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: parties }, { data: invoices }, { data: payments }, { data: orders }, { data: quotes }, { data: slabs }] =
    await Promise.all([
      supabase.from("parties").select("id, kind, name, created_at"),
      supabase.from("invoices").select("invoice_no, customer_id, total_paise, created_at"),
      supabase.from("payments").select("customer_id, amount_paise, mode, created_at"),
      supabase.from("orders").select("order_no, status, created_at"),
      supabase.from("quotes").select("quote_no, customer_id, total_paise, created_at"),
      supabase.from("slabs").select("sqft, created_at"),
    ]);

  const nameById = new Map(
    ((parties ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name] as const),
  );
  const pname = (id: string | null) => (id ? nameById.get(id) ?? "—" : "—");

  const rows = buildActivityLog(
    {
      parties: (parties ?? []) as never,
      invoices: (invoices ?? []) as never,
      payments: (payments ?? []) as never,
      orders: (orders ?? []) as never,
      quotes: (quotes ?? []) as never,
      slabs: (slabs ?? []) as never,
    },
    pname,
  );
  const days = groupByDay(rows);

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Daybook</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your day, grouped — sales, purchases, payments and more.</p>
      </div>

      {days.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No activity yet.</p></Card>
      ) : (
        <div className="space-y-5">
          {days.map((g) => (
            <section key={g.dayKey}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="text-sm font-semibold text-white">{g.label}</h2>
                <span className="text-xs text-slate-500">· {g.rows.length} item{g.rows.length === 1 ? "" : "s"}</span>
              </div>
              <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-graphite-600/60">
                  {g.rows.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-[11px] tabular-nums text-slate-400 w-10 shrink-0 pt-0.5">{hhmm(r.at)}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${KIND_STYLE[r.kind]}`}>
                        {r.label.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-200 leading-snug">{r.desc}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
