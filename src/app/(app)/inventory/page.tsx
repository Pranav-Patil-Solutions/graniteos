import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatINR } from "@/lib/money";
import AddBlockForm from "@/components/inventory/AddBlockForm";

type Block = {
  id: string;
  label: string;
  material: string;
  weight_tonnes: number;
  supplier: string | null;
};
type Slab = {
  block_id: string;
  sqft: number;
  rate_paise: number;
  status: string;
};

export default async function InventoryPage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: blocksData }, { data: slabsData }] = await Promise.all([
    supabase
      .from("blocks")
      .select("id, label, material, weight_tonnes, supplier")
      .order("created_at", { ascending: false }),
    supabase.from("slabs").select("block_id, sqft, rate_paise, status"),
  ]);

  const blocks = (blocksData ?? []) as Block[];
  const slabs = (slabsData ?? []) as Slab[];

  const statsFor = (blockId: string) => {
    const own = slabs.filter((s) => s.block_id === blockId);
    const totalSqft = own.reduce((n, s) => n + Number(s.sqft), 0);
    const inStock = own.filter((s) => s.status === "in_stock");
    const inStockValue = inStock.reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);
    return { count: own.length, totalSqft, inStockCount: inStock.length, inStockValue };
  };

  const enriched = blocks.map((b) => {
    const s = statsFor(b.id);
    const perTonne = b.weight_tonnes > 0 ? s.totalSqft / b.weight_tonnes : 0;
    return { ...b, ...s, perTonne };
  });

  const totalSlabs = slabs.length;
  const totalSqft = slabs.reduce((n, s) => n + Number(s.sqft), 0);
  const totalValue = slabs
    .filter((s) => s.status === "in_stock")
    .reduce((n, s) => n + Number(s.rate_paise) * Number(s.sqft), 0);

  const withYield = enriched.filter((b) => b.count > 0);
  const best = withYield.reduce<(typeof enriched)[number] | null>(
    (a, b) => (!a || b.perTonne > a.perTonne ? b : a),
    null,
  );
  const worst = withYield.reduce<(typeof enriched)[number] | null>(
    (a, b) => (!a || b.perTonne < a.perTonne ? b : a),
    null,
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Stock</h1>
      <p className="text-sm text-slate-400">Blocks → slabs → godown</p>

      {/* summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <AnimatedNumber value={totalSlabs} className="block text-2xl font-extrabold text-white" />
          <div className="text-[11px] text-slate-400 mt-0.5">slabs</div>
        </Card>
        <Card className="p-3 text-center">
          <AnimatedNumber
            value={Math.round(totalSqft)}
            className="block text-2xl font-extrabold text-white"
          />
          <div className="text-[11px] text-slate-400 mt-0.5">sq-ft</div>
        </Card>
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-gold">{formatINR(totalValue)}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">in stock</div>
        </Card>
      </div>

      {/* Recovery Radar */}
      {best && worst && best.id !== worst.id && (
        <div className="mt-4 rounded-2xl border border-[#3a3320] bg-gold/[0.06] p-4">
          <div className="flex items-center gap-2 text-gold font-bold">
            <Layers className="w-4 h-4" /> Recovery Radar ⭐
          </div>
          <p className="mt-2 text-sm text-slate-300">
            <span className="text-granite-green2 font-semibold">{best.label}</span> gives your best
            yield at <b>{best.perTonne.toFixed(0)} sq-ft/tonne</b> — that&apos;s{" "}
            <b>{(best.perTonne - worst.perTonne).toFixed(0)} more</b> than{" "}
            <span className="text-red-300 font-semibold">{worst.label}</span> (
            {worst.perTonne.toFixed(0)}). Buy more like {best.label.split(" ")[0]}.
          </p>
        </div>
      )}

      <div className="mt-5">
        <AddBlockForm />
      </div>

      {/* blocks list */}
      <div className="mt-4 space-y-2.5">
        {enriched.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-6">
            No blocks yet — add your first stone block above.
          </p>
        )}
        {enriched.map((b) => (
          <Link key={b.id} href={`/inventory/${b.id}`} className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 hover:border-gold/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{b.label}</p>
                <p className="text-xs text-slate-400 truncate">
                  {b.material} · {b.weight_tonnes} t{b.supplier ? ` · ${b.supplier}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill>{b.count} slabs</Pill>
                  <Pill>{Math.round(b.totalSqft)} sq-ft</Pill>
                  {b.perTonne > 0 && <Pill gold>{b.perTonne.toFixed(0)} sq-ft/t</Pill>}
                  {b.inStockValue > 0 && <Pill>{formatINR(b.inStockValue)}</Pill>}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Pill({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
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
