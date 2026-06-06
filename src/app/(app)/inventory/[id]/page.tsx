import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatINRPrecise } from "@/lib/money";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";
import AddSlabForm from "@/components/inventory/AddSlabForm";
import SlabStatus from "@/components/inventory/SlabStatus";
import SlabPhoto from "@/components/inventory/SlabPhoto";

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

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Stock
      </Link>

      <div className="mt-3 flex items-center gap-4">
        <StoneSwatch
          material={block.material}
          color={block.color}
          className="w-20 h-20 rounded-2xl shrink-0 border border-white/10"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{block.label}</h1>
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
                </div>
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

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={`text-[11px] rounded-md px-2 py-0.5 ${
        gold ? "bg-gold/15 text-gold" : "bg-white/[0.06] text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}
