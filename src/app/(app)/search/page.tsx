import Link from "next/link";
import { Search as SearchIcon, Users, Boxes, Receipt, FileText, Wallet } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { matches } from "@/lib/search";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

type Hit = { kind: string; icon: typeof Users; title: string; sub: string; href: string };

const STYLE: Record<string, string> = {
  Customer: "bg-sky-500/15 text-sky-300",
  Stock: "bg-stone-400/15 text-stone-300",
  Invoice: "bg-violet-500/15 text-violet-300",
  Quote: "bg-blue-500/15 text-blue-300",
  Order: "bg-amber-500/15 text-amber-300",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession();
  const { q = "" } = await searchParams;
  const query = q.trim();

  const hits: Hit[] = [];
  if (query) {
    const supabase = await createClient();
    const [{ data: parties }, { data: blocks }, { data: invoices }, { data: quotes }, { data: orders }] =
      await Promise.all([
        supabase.from("parties").select("id, name, kind"),
        supabase.from("blocks").select("id, label, material, color, supplier"),
        supabase.from("invoices").select("id, invoice_no, customer_id, total_paise"),
        supabase.from("quotes").select("id, quote_no, customer_id, total_paise"),
        supabase.from("orders").select("id, order_no, status"),
      ]);

    const nameById = new Map(((parties ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name] as const));
    const nm = (id: string | null) => (id ? nameById.get(id) ?? "—" : "—");

    for (const p of (parties ?? []) as { id: string; name: string; kind: string }[]) {
      if (matches(query, p.name, p.kind))
        hits.push({ kind: "Customer", icon: Users, title: p.name, sub: p.kind === "supplier" ? "Supplier" : "Customer", href: `/parties/${p.id}` });
    }
    for (const b of (blocks ?? []) as { id: string; label: string; material: string; color: string | null; supplier: string | null }[]) {
      if (matches(query, b.material, b.label, b.color, b.supplier))
        hits.push({ kind: "Stock", icon: Boxes, title: b.material, sub: [b.label, b.supplier].filter(Boolean).join(" · ") || "Block", href: `/inventory/${b.id}` });
    }
    for (const i of (invoices ?? []) as { id: string; invoice_no: string | null; customer_id: string | null; total_paise: number }[]) {
      if (matches(query, i.invoice_no, nm(i.customer_id)))
        hits.push({ kind: "Invoice", icon: Receipt, title: i.invoice_no ?? "Invoice", sub: `${nm(i.customer_id)} · ${formatINR(i.total_paise)}`, href: `/invoices/${i.id}` });
    }
    for (const qt of (quotes ?? []) as { id: string; quote_no: string | null; customer_id: string | null; total_paise: number }[]) {
      if (matches(query, qt.quote_no, nm(qt.customer_id)))
        hits.push({ kind: "Quote", icon: FileText, title: qt.quote_no ?? "Quote", sub: `${nm(qt.customer_id)} · ${formatINR(qt.total_paise)}`, href: `/quotes/${qt.id}` });
    }
    for (const o of (orders ?? []) as { id: string; order_no: string | null; status: string | null }[]) {
      if (matches(query, o.order_no, o.status))
        hits.push({ kind: "Order", icon: Wallet, title: o.order_no ?? "Order", sub: o.status ?? "", href: `/orders/${o.id}` });
    }
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-3">Search</h1>

      <form action="/search" method="get" className="relative mb-5">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Customers, stock, invoices, quotes, orders…"
          className="w-full rounded-xl bg-white/[0.05] border border-graphite-600 pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </form>

      {!query ? (
        <Card><p className="text-sm text-slate-400">Type anything — names work in Hindi or English.</p></Card>
      ) : hits.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No matches for &ldquo;{query}&rdquo;.</p></Card>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-2">{hits.length} result{hits.length === 1 ? "" : "s"}</p>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-graphite-600/60">
              {hits.map((h, idx) => {
                const Icon = h.icon;
                return (
                  <li key={idx}>
                    <Link href={h.href} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04]">
                      <span className={`shrink-0 w-9 h-9 grid place-items-center rounded-lg ${STYLE[h.kind] ?? "bg-white/10 text-slate-300"}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">{h.title}</p>
                        <p className="text-xs text-slate-400 truncate">{h.sub}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STYLE[h.kind] ?? "bg-white/10 text-slate-300"}`}>
                        {h.kind}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
