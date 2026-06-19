import Link from "next/link";
import { ChevronRight, Boxes, Ruler, Wallet } from "lucide-react";
import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrls } from "@/lib/photos";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { BlockPhoto } from "@/components/inventory/BlockPhoto";
import { formatINR } from "@/lib/money";
import AddBlockForm from "@/components/inventory/AddBlockForm";
import ShareCatalog from "@/components/inventory/ShareCatalog";
import { EmptyState } from "@/components/ui/EmptyState";

type Block = {
  id: string;
  label: string;
  material: string;
  color: string | null;
  weight_tonnes: number | null;
  supplier: string | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  photo_path?: string | null;
};
type Slab = { block_id: string; sqft: number; rate_paise: number; status: string };

function cbmOf(b: Block): number {
  if (b.length_cm && b.width_cm && b.height_cm) {
    return (Number(b.length_cm) * Number(b.width_cm) * Number(b.height_cm)) / 1_000_000;
  }
  return 0;
}

export default async function InventoryPage() {
  const { user: me, viewOnly } = await requireModuleAccess("inventory");
  const supabase = await createClient();

  const [{ data: blocksData }, { data: slabsData }] = await Promise.all([
    supabase
      .from("blocks")
      // select * so the page tolerates the photo_path column arriving with
      // migration 0019 (explicit-column selects 500 on a missing column).
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("slabs").select("block_id, sqft, rate_paise, status"),
  ]);

  const blocks = (blocksData ?? []) as Block[];
  const slabs = (slabsData ?? []) as Slab[];

  const enriched = blocks.map((b) => {
    const own = slabs.filter((s) => s.block_id === b.id);
    const totalSqft = own.reduce((n, s) => n + Number(s.sqft), 0);
    const inStock = own.filter((s) => s.status === "in_stock");
    const inStockValue = inStock.reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);
    const cbm = cbmOf(b);
    const perCBM = cbm > 0 ? totalSqft / cbm : 0;
    const perTonne = b.weight_tonnes && b.weight_tonnes > 0 ? totalSqft / b.weight_tonnes : 0;
    return { ...b, count: own.length, totalSqft, inStockValue, cbm, perCBM, perTonne };
  });

  const totalSlabs = slabs.length;
  const totalSqft = slabs.reduce((n, s) => n + Number(s.sqft), 0);
  const totalValue = slabs
    .filter((s) => s.status === "in_stock")
    .reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);

  // Resolve storage object paths → signed URLs (dual-mode: legacy full URLs
  // pass through as-is; new object-path values get a 1-hour signed URL).
  const photoUrls = await resolvePhotoUrls(enriched.map((b) => b.photo_path ?? null));
  const enrichedResolved = enriched.map((b, i) => ({ ...b, photo_path: photoUrls[i] }));

  // Recovery Radar compares CBM yield (the industry standard).
  const byCBM = enrichedResolved.filter((b) => b.count > 0 && b.perCBM > 0);
  const best = byCBM.reduce<(typeof enrichedResolved)[number] | null>(
    (a, b) => (!a || b.perCBM > a.perCBM ? b : a),
    null,
  );

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold text-white tracking-tight">Stock</h1>
        <ShareCatalog companyId={me.company_id} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Tile icon={Boxes} value={totalSlabs} label="slabs" />
        <Tile icon={Ruler} value={Math.round(totalSqft)} label="sq-ft" />
        <Tile icon={Wallet} display={formatINR(totalValue)} label="in stock" gold />
      </div>

      {best && (
        <Link
          href={`/inventory/${best.id}`}
          className="relative mt-4 flex items-center gap-3 rounded-2xl border border-gold/25 bg-gradient-to-br from-[#14110a] to-graphite-800 p-4 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(220px 140px at 100% 0%, rgba(201,139,75,.18), transparent 70%)" }} />
          <BlockPhoto photoPath={best.photo_path} material={best.material} className="relative w-11 h-11 rounded-lg shrink-0 border border-white/10" />
          <div className="relative min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gold font-bold">⭐ Best value stone</p>
            <p className="text-sm font-bold text-white truncate">{best.material}</p>
            <p className="text-[11px] text-slate-400">Gives the most slabs — buy more of this.</p>
          </div>
        </Link>
      )}

      {!viewOnly && (
        <div className="mt-5">
          <AddBlockForm />
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {enrichedResolved.length === 0 && (
          <EmptyState
            heading="No stock yet"
            subtext="Blocks are raw stone units. Add one above, or import your opening stock from an Excel file."
            actionLabel="Import blocks from Excel"
            actionHref="/import"
          />
        )}
        {enrichedResolved.map((b) => (
          <Link
            key={b.id}
            href={`/inventory/${b.id}`}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 hover:border-gold/40 transition-colors"
          >
            <BlockPhoto
              photoPath={b.photo_path}
              material={b.material}
              className="w-14 h-14 rounded-xl shrink-0 border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{b.material}</p>
              <p className="text-xs text-slate-400">
                {b.count} slabs · {Math.round(b.totalSqft)} sq-ft
              </p>
            </div>
            <div className="text-right shrink-0">
              {b.inStockValue > 0 && <p className="text-sm font-bold text-gold">{formatINR(b.inStockValue)}</p>}
              <ChevronRight className="inline-block w-4 h-4 text-slate-500 mt-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  value,
  display,
  label,
  gold,
}: {
  icon: typeof Boxes;
  value?: number;
  display?: string;
  label: string;
  gold?: boolean;
}) {
  const glow = gold ? "rgba(201,139,75,.12)" : "rgba(255,255,255,.05)";
  const chip = gold ? "bg-gold/15 text-gold" : "bg-white/[0.08] text-slate-200";
  const text = gold ? "text-gold" : "text-white";
  return (
    <div className="relative rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(110px 70px at 100% 0%, ${glow}, transparent 70%)` }} />
      <div className="relative">
        <span className={`inline-flex w-6 h-6 rounded-md items-center justify-center ${chip}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        {display !== undefined ? (
          <span className={`block text-xl font-extrabold mt-1.5 leading-none tracking-tight ${text}`}>{display}</span>
        ) : (
          <AnimatedNumber value={value ?? 0} className={`block text-xl font-extrabold mt-1.5 leading-none tracking-tight ${text}`} />
        )}
        <div className="text-[10px] text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

