import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight, Eye, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";
import { getAccessLevel } from "@/lib/access-control-guard";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  sent: "bg-blue-500/15 text-blue-300",
  accepted: "bg-granite-green2/20 text-granite-green2",
  rejected: "bg-red-500/15 text-red-300",
  expired: "bg-amber-500/15 text-amber-300",
};

export default async function QuotesPage() {
  const { level } = await getAccessLevel("quotes");
  // 'none' → redirect away; 'view' and 'edit' → show page.
  if (level === "none") redirect("/dashboard");

  const viewOnly = level === "view";

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("quotes")
    .select("id, quote_no, status, total_paise, created_at, parties(name)")
    .order("created_at", { ascending: false });

  const { data: poData } = await supabase
    .from("purchase_orders")
    .select("quote_id, po_no")
    .not("quote_id", "is", null);
  const poByQuote = new Map<string, string>();
  for (const p of (poData ?? []) as { quote_id: string | null; po_no: string | null }[]) {
    if (p.quote_id && p.po_no) poByQuote.set(p.quote_id, p.po_no);
  }

  const quotes = (data ?? []) as unknown as {
    id: string;
    quote_no: string | null;
    status: string;
    total_paise: number;
    parties: { name: string } | null;
  }[];

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Quotes</h1>
        {viewOnly ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/15 text-blue-300 px-3.5 py-2 text-sm font-semibold border border-blue-500/20">
            <Eye className="w-4 h-4" /> View only
          </span>
        ) : (
          <Link
            href="/quotes/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-granite-green2 text-white px-3.5 py-2 text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> New
          </Link>
        )}
      </div>

      {viewOnly && (
        <p className="mt-2 text-xs text-blue-300/70">
          You have read-only access. Ask the owner to enable editing for your role.
        </p>
      )}

      {loadError && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Couldn&apos;t load quotes right now. Please refresh — if it keeps happening, contact support.
        </div>
      )}

      <div className="mt-5 space-y-2">
        {!loadError && quotes.length === 0 && (
          <EmptyState
            heading="No quotes yet"
            subtext={
              viewOnly
                ? "Quotes are professional price proposals sent to customers. Contact the owner to create one."
                : "A quote is a price proposal for a customer. Create one here — it auto-calculates GST and can be converted to an order."
            }
            actionLabel={!viewOnly ? "Create your first quote" : undefined}
            actionHref={!viewOnly ? "/quotes/new" : undefined}
            icon={<FileText className="w-10 h-10" />}
          />
        )}
        {quotes.map((q) => (
          <Link key={q.id} href={`/quotes/${q.id}`} className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 hover:border-gold/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">
                  {q.quote_no ?? "Quote"}{" "}
                  <span className="font-normal text-slate-400">· {q.parties?.name ?? "—"}</span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block text-[11px] font-semibold rounded-md px-2 py-0.5 capitalize ${STATUS_STYLE[q.status] ?? ""}`}
                  >
                    {q.status}
                  </span>
                  {poByQuote.get(q.id) && (
                    <span className="inline-flex items-center text-[11px] font-semibold rounded-md px-2 py-0.5 bg-gold/10 text-gold border border-gold/20">
                      {poByQuote.get(q.id)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-gold">{formatINR(q.total_paise)}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
