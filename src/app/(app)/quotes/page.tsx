import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  sent: "bg-blue-500/15 text-blue-300",
  accepted: "bg-granite-green2/20 text-granite-green2",
  rejected: "bg-red-500/15 text-red-300",
  expired: "bg-amber-500/15 text-amber-300",
};

export default async function QuotesPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("id, quote_no, status, total_paise, created_at, parties(name)")
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as unknown as {
    id: string;
    quote_no: string | null;
    status: string;
    total_paise: number;
    parties: { name: string } | null;
  }[];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Quotes</h1>
        <Link
          href="/quotes/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-granite-green2 text-white px-3.5 py-2 text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> New
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {quotes.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">
            No quotes yet — tap <b className="text-slate-300">New</b> to create one.
          </p>
        )}
        {quotes.map((q) => (
          <Link key={q.id} href={`/quotes/${q.id}`} className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 hover:border-gold/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">
                  {q.quote_no ?? "Quote"}{" "}
                  <span className="font-normal text-slate-400">· {q.parties?.name ?? "—"}</span>
                </p>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold rounded-md px-2 py-0.5 capitalize ${STATUS_STYLE[q.status] ?? ""}`}
                >
                  {q.status}
                </span>
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
