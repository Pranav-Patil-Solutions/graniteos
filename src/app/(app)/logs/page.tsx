import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { buildActivityLog, type LogKind } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const KIND_STYLE: Record<LogKind, string> = {
  party: "bg-sky-500/15 text-sky-300",
  invoice: "bg-violet-500/15 text-violet-300",
  payment: "bg-emerald-500/15 text-emerald-300",
  order: "bg-amber-500/15 text-amber-300",
  quote: "bg-blue-500/15 text-blue-300",
  slab: "bg-stone-400/15 text-stone-300",
  security: "bg-red-500/15 text-red-300",
};

function fmtStamp(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} · ${hh}:${mm}`;
}

export default async function LogsPage() {
  await requireSession();
  const supabase = await createClient();

  // RLS scopes every query to the signed-in company.
  const results = await Promise.all([
    supabase.from("parties").select("id, kind, name, created_at"),
    supabase.from("invoices").select("invoice_no, customer_id, total_paise, created_at"),
    supabase.from("payments").select("customer_id, amount_paise, mode, created_at"),
    supabase.from("orders").select("order_no, status, created_at"),
    supabase.from("quotes").select("quote_no, customer_id, total_paise, created_at"),
    supabase.from("slabs").select("sqft, created_at"),
    supabase.from("security_events").select("event_type, created_at"),
  ]);
  const [
    { data: parties },
    { data: invoices },
    { data: payments },
    { data: orders },
    { data: quotes },
    { data: slabs },
    { data: security },
  ] = results;
  // Distinguish a real load failure from a genuinely empty feed.
  const loadError = results.some((r) => r.error);

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
      security: (security ?? []) as never,
    },
    pname,
  );

  return (
    <div className="px-4 pt-12 pb-8 max-w-3xl lg:max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Logs</h1>
          <p className="text-sm text-slate-400">Every action, newest first — fully timestamped.</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300 shrink-0">
          {rows.length} event{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Some activity couldn&apos;t be loaded just now — this list may be incomplete. Please refresh.
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No activity yet — it&apos;ll appear here as you work.</p>
        ) : (
          <ul className="divide-y divide-graphite-600/60">
            {rows.map((r, idx) => (
              <li key={idx} className="flex items-start gap-3 px-4 py-3">
                <span className="text-[11px] tabular-nums text-slate-400 w-20 shrink-0 pt-0.5">{fmtStamp(r.at)}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${KIND_STYLE[r.kind]}`}>
                  {r.label.toUpperCase()}
                </span>
                <span className="text-sm text-slate-200 leading-snug">{r.desc}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
