import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatINRPrecise } from "@/lib/money";
import AddSlabForm from "@/components/inventory/AddSlabForm";
import SlabStatus from "@/components/inventory/SlabStatus";

type Slab = {
  id: string;
  length_in: number;
  width_in: number;
  sqft: number;
  thickness_mm: number | null;
  godown: string | null;
  rate_paise: number;
  status: string;
};

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, label, material, weight_tonnes, supplier, cost_paise")
    .eq("id", id)
    .single();
  if (!block) notFound();

  const { data: slabsData } = await supabase
    .from("slabs")
    .select("id, length_in, width_in, sqft, thickness_mm, godown, rate_paise, status")
    .eq("block_id", id)
    .order("created_at", { ascending: false });
  const slabs = (slabsData ?? []) as Slab[];

  const totalSqft = slabs.reduce((n, s) => n + Number(s.sqft), 0);
  const perTonne = block.weight_tonnes > 0 ? totalSqft / block.weight_tonnes : 0;
  const inStock = slabs.filter((s) => s.status === "in_stock");
  const inStockValue = inStock.reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Stock
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-white">{block.label}</h1>
      <p className="text-sm text-slate-400">
        {block.material} · {block.weight_tonnes} tonnes
        {block.supplier ? ` · ${block.supplier}` : ""}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="slabs" value={String(slabs.length)} />
        <Stat label="sq-ft" value={Math.round(totalSqft).toString()} />
        <Stat label="recovery" value={`${perTonne.toFixed(0)}/t`} gold />
      </div>
      <div className="mt-3 flex justify-between rounded-xl border border-graphite-600 bg-white/[0.04] px-4 py-3 text-sm">
        <span className="text-slate-400">In-stock value</span>
        <span className="font-bold text-gold">{formatINR(inStockValue)}</span>
      </div>

      <div className="mt-5">
        <AddSlabForm blockId={id} />
      </div>

      <div className="mt-4 space-y-2">
        {slabs.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-4">No slabs cut from this block yet.</p>
        )}
        {slabs.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">
                  {Number(s.sqft).toFixed(2)} sq-ft
                  <span className="text-slate-500 font-normal text-sm">
                    {" "}
                    · {s.length_in}″ × {s.width_in}″
                    {s.thickness_mm ? ` · ${s.thickness_mm}mm` : ""}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.godown ?? "—"}
                  {s.rate_paise > 0 ? ` · ${formatINRPrecise(s.rate_paise)}/sq-ft` : ""}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <SlabStatus slabId={s.id} blockId={id} status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-graphite-600 bg-white/[0.04] p-3 text-center">
      <div className={`text-2xl font-extrabold ${gold ? "text-gold" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
