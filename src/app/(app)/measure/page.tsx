import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { formatINR } from "@/lib/money";
import { sheetTotals } from "@/lib/measure-sheet";

export const dynamic = "force-dynamic";

type Slab = {
  id: string;
  block_id: string;
  length_in: number;
  width_in: number;
  sqft: number;
  rate_paise: number;
  status: string;
  godown: string | null;
  created_at: string;
};

export default async function MeasurePage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: slabsData }, { data: blocksData }] = await Promise.all([
    supabase
      .from("slabs")
      .select("id, block_id, length_in, width_in, sqft, rate_paise, status, godown, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("blocks").select("id, material, label"),
  ]);

  const slabs = (slabsData ?? []) as Slab[];
  const matById = new Map(
    ((blocksData ?? []) as { id: string; material: string; label: string }[]).map((b) => [b.id, b]),
  );
  const totals = sheetTotals(slabs.map((s) => ({ sqft: s.sqft, rate_paise: s.rate_paise })));

  const STATUS_STYLE: Record<string, string> = {
    in_stock: "bg-emerald-500/15 text-emerald-300",
    reserved: "bg-amber-500/15 text-amber-300",
    sold: "bg-slate-500/15 text-slate-300",
  };

  return (
    <div className="px-4 pt-12 pb-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Measurement Sheet</h1>
          <p className="text-sm text-slate-400">Every slab — size, area and value, from your stock.</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300 shrink-0">
          {totals.area.toLocaleString("en-IN")} sq.ft · {totals.count} pcs
        </span>
      </div>

      <Card className="p-0 overflow-x-auto">
        {slabs.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No slabs yet — add stock in Inventory and it&apos;ll appear here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-graphite-600/60">
                <th className="px-4 py-2.5 font-medium">Material</th>
                <th className="px-3 py-2.5 font-medium">Size (in)</th>
                <th className="px-3 py-2.5 font-medium text-right">Area</th>
                <th className="px-3 py-2.5 font-medium text-right">Rate</th>
                <th className="px-3 py-2.5 font-medium text-right">Value</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-600/40">
              {slabs.map((s) => {
                const block = matById.get(s.block_id);
                const value = Math.round(Number(s.sqft) * Number(s.rate_paise));
                return (
                  <tr key={s.id} className="text-slate-200">
                    <td className="px-4 py-2.5">
                      {block?.material ?? "—"}
                      {block?.label ? <span className="text-slate-500"> · {block.label}</span> : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-300">
                      {Number(s.length_in)} × {Number(s.width_in)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-right">{Number(s.sqft).toLocaleString("en-IN")} sq.ft</td>
                    <td className="px-3 py-2.5 tabular-nums text-right text-slate-400">{formatINR(s.rate_paise)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-right">{formatINR(value)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] ?? "bg-slate-500/15 text-slate-300"}`}>
                        {s.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-graphite-600/60 font-semibold text-white">
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="px-3 py-3 tabular-nums text-right">{totals.area.toLocaleString("en-IN")} sq.ft</td>
                <td />
                <td className="px-3 py-3 tabular-nums text-right">{formatINR(totals.value_paise)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
