import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatINRPrecise } from "@/lib/money";
import SlabViewer from "@/components/three/SlabViewer";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";
import AddSlabForm from "@/components/inventory/AddSlabForm";
import SlabStatus from "@/components/inventory/SlabStatus";
import SlabPhoto from "@/components/inventory/SlabPhoto";
import SlabQR from "@/components/inventory/SlabQR";

type Slab = {
  id: string;
  bundle_no: string | null;
  slab_no: number | null;
  length_in: number;
  width_in: number;
  sqft: number;
  net_sqft: number | null;
  thickness_mm: number | null;
  finish: string | null;
  grade: string | null;
  godown: string | null;
  rate_paise: number;
  status: string;
  photo_path: string | null;
};

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select(
      "id, label, material, color, weight_tonnes, supplier, origin, cost_paise, length_cm, width_cm, height_cm",
    )
    .eq("id", id)
    .single();
  if (!block) notFound();

  const { data: slabsData } = await supabase
    .from("slabs")
    .select(
      "id, bundle_no, slab_no, length_in, width_in, sqft, net_sqft, thickness_mm, finish, grade, godown, rate_paise, status, photo_path",
    )
    .eq("block_id", id)
    .order("created_at", { ascending: false });
  const slabs = (slabsData ?? []) as Slab[];

  const cbm =
    block.length_cm && block.width_cm && block.height_cm
      ? (Number(block.length_cm) * Number(block.width_cm) * Number(block.height_cm)) / 1_000_000
      : 0;
  const totalSqft = slabs.reduce((n, s) => n + Number(s.sqft), 0);
  const recovery = cbm > 0 ? totalSqft / cbm : 0;
  const recoveryUnit = cbm > 0 ? "/CBM" : block.weight_tonnes ? "/t" : "";
  const recoveryVal =
    cbm > 0 ? recovery : block.weight_tonnes ? totalSqft / Number(block.weight_tonnes) : 0;
  const inStock = slabs.filter((s) => s.status === "in_stock");
  const inStockValue = inStock.reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);

  // True cost & profit per slab (VISCO-style): allocate the block's cost across
  // its slabs by area, then compare to your selling rates.
  const blockCost = Number((block as { cost_paise?: number }).cost_paise ?? 0);
  const costPerSqft = totalSqft > 0 ? blockCost / totalSqft : 0;
  const potentialRevenue = slabs.reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);
  const potentialProfit = potentialRevenue - blockCost;
  const marginPct = potentialRevenue > 0 ? (potentialProfit / potentialRevenue) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Stock
      </Link>

      <div className="mt-3 relative h-52 rounded-3xl overflow-hidden border border-graphite-600 bg-gradient-to-b from-graphite-800 to-graphite-900 shadow-inner">
        {/* fallback stone texture (shows if WebGL is blocked) */}
        <StoneSwatch
          material={block.material}
          color={block.color}
          className="absolute inset-0 opacity-30"
        />
        <SlabViewer material={block.material} color={block.color} className="absolute inset-0 w-full h-full" />
        <div className="absolute left-4 bottom-3 text-xs text-slate-400">
          👆 spin your <span className="text-gold font-semibold">{block.material}</span> slab
        </div>
      </div>

      <div className="mt-3">
        <h1 className="text-2xl font-bold text-white">{block.label}</h1>
        <p className="text-sm text-slate-400">
          {block.material}
          {block.color ? ` · ${block.color}` : ""}
        </p>
        <p className="text-xs text-slate-500">
          {cbm > 0 ? `${cbm.toFixed(2)} CBM` : ""}
          {block.weight_tonnes ? ` · ${block.weight_tonnes} t` : ""}
          {block.origin ? ` · ${block.origin}` : ""}
          {block.supplier ? ` · ${block.supplier}` : ""}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="slabs" value={String(slabs.length)} />
        <Stat label="sq-ft" value={Math.round(totalSqft).toString()} />
        <Stat label={`recovery${recoveryUnit}`} value={recoveryVal > 0 ? recoveryVal.toFixed(0) : "—"} gold />
      </div>
      <div className="mt-3 flex justify-between rounded-xl border border-graphite-600 bg-white/[0.04] px-4 py-3 text-sm">
        <span className="text-slate-400">In-stock value</span>
        <span className="font-bold text-gold">{formatINR(inStockValue)}</span>
      </div>

      {blockCost > 0 && potentialRevenue > 0 && (
        <div className="mt-3 rounded-2xl border border-[#3a3320] bg-gold/[0.06] p-4">
          <div className="text-gold font-bold flex items-center gap-2">📦 True cost &amp; profit ⭐</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Block cost (landed)</span>
              <span className="text-white">{formatINR(blockCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Slab value at your rates</span>
              <span className="text-white">{formatINR(potentialRevenue)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-[#3a3320]">
              <span className="font-bold text-white">Profit on this block</span>
              <span className={`font-extrabold ${potentialProfit >= 0 ? "text-granite-green2" : "text-red-300"}`}>
                {formatINR(potentialProfit)} · {marginPct.toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-gold/90">
            ≈ {formatINRPrecise(Math.round(costPerSqft))}/sq-ft true cost — anything above is margin.
          </p>
        </div>
      )}

      <div className="mt-5">
        <AddSlabForm blockId={id} />
      </div>

      <div className="mt-4 space-y-2">
        {slabs.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-4">No slabs cut from this block yet.</p>
        )}
        {slabs.map((s) => (
          <div key={s.id} className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3">
            <SlabPhoto
              slabId={s.id}
              blockId={id}
              photo={s.photo_path}
              material={block.material}
              color={block.color}
            />
            <div className="mt-2.5 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">
                  {Number(s.sqft).toFixed(2)} sq-ft
                  {s.net_sqft ? (
                    <span className="text-granite-green2 text-sm font-normal">
                      {" "}
                      (net {Number(s.net_sqft).toFixed(2)})
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.length_in}″ × {s.width_in}″{s.thickness_mm ? ` · ${s.thickness_mm}mm` : ""}
                  {s.godown ? ` · ${s.godown}` : ""}
                  {s.rate_paise > 0 ? ` · ${formatINRPrecise(s.rate_paise)}/sq-ft` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.bundle_no && <Tag>Bundle {s.bundle_no}{s.slab_no ? `·${s.slab_no}` : ""}</Tag>}
                  {s.finish && <Tag>{s.finish}</Tag>}
                  {s.grade && <Tag gold>{s.grade}</Tag>}
                  {Number(s.rate_paise) > 0 && costPerSqft > 0 && (
                    <Tag green>
                      profit {formatINR(Number(s.rate_paise) * Number(s.sqft) - costPerSqft * Number(s.sqft))}
                    </Tag>
                  )}
                </div>
              </div>
              <div className="text-center shrink-0">
                <SlabQR slabId={s.id} />
                <p className="text-[9px] text-slate-500 mt-0.5">scan</p>
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

function Tag({
  children,
  gold,
  green,
}: {
  children: React.ReactNode;
  gold?: boolean;
  green?: boolean;
}) {
  return (
    <span
      className={`text-[11px] rounded-md px-2 py-0.5 ${
        green
          ? "bg-granite-green2/15 text-granite-green2"
          : gold
            ? "bg-gold/15 text-gold"
            : "bg-white/[0.06] text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}
