"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, X } from "lucide-react";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";
import StoneVisualizer, { type VizMaterial } from "@/components/catalog/StoneVisualizer";

const SlabViewer = dynamic(() => import("@/components/three/SlabViewer"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-graphite-500 text-xs">Loading 3D…</div>,
});

export type CatalogSlab = {
  id: string;
  sqft: number;
  finish: string | null;
  thickness_mm: number | null;
  photo_path: string | null;
  material: string;
  color: string | null;
};

type Company = { id: string; name: string; city: string | null; phone: string | null };
type Sort = "featured" | "large" | "small" | "az";

export default function CatalogView({
  company,
  slabs,
}: {
  company: Company;
  slabs: CatalogSlab[];
}) {
  const materials = useMemo(
    () => [...new Set(slabs.map((s) => s.material).filter(Boolean))].sort(),
    [slabs],
  );
  const finishes = useMemo(
    () => [...new Set(slabs.map((s) => s.finish).filter(Boolean))].sort() as string[],
    [slabs],
  );

  const vizMaterials = useMemo<VizMaterial[]>(() => {
    const seen = new Map<string, VizMaterial>();
    for (const s of slabs) {
      if (!seen.has(s.material))
        seen.set(s.material, {
          label: s.material,
          material: s.material,
          color: s.color,
          photo_path: s.photo_path,
        });
    }
    return [...seen.values()];
  }, [slabs]);

  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState<string>("");
  const [finish, setFinish] = useState<string>("");
  const [sort, setSort] = useState<Sort>("featured");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = slabs.filter((s) => {
      if (material && s.material !== material) return false;
      if (finish && s.finish !== finish) return false;
      if (q) {
        const hay = `${s.material} ${s.color ?? ""} ${s.finish ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "large") sorted.sort((a, b) => b.sqft - a.sqft);
    else if (sort === "small") sorted.sort((a, b) => a.sqft - b.sqft);
    else if (sort === "az") sorted.sort((a, b) => a.material.localeCompare(b.material));
    return sorted;
  }, [slabs, query, material, finish, sort]);

  const hero = slabs[0];
  const wa = company.phone ? company.phone.replace(/\D/g, "") : "";
  const hasFilters = !!query || !!material || !!finish;

  function clearAll() {
    setQuery("");
    setMaterial("");
    setFinish("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#e8e6e1]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-granite-green to-granite-green2 grid place-items-center font-extrabold text-white text-xl">
            {(company.name ?? "G").charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{company.name ?? "Stock catalogue"}</h1>
            <p className="text-xs text-slate-400">
              Live stock{company.city ? ` · ${company.city}` : ""} · {slabs.length} slabs · {materials.length} stones
            </p>
          </div>
        </div>

        {/* hero 3D */}
        {hero && (
          <div className="relative mt-5 h-56 rounded-3xl overflow-hidden border border-graphite-600 bg-gradient-to-b from-graphite-800 to-graphite-900">
            <SlabViewer material={hero.material} color={hero.color ?? undefined} className="absolute inset-0" />
            <div className="absolute left-4 bottom-3 text-xs text-slate-300">
              {hero.material} · <span className="text-gold font-semibold">spin it in 3D</span>
            </div>
          </div>
        )}

        {vizMaterials.length > 0 && (
          <div className="mt-3">
            <StoneVisualizer
              materials={vizMaterials}
              triggerLabel="See it in your space"
              triggerClassName="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-[#0b0e11] hover:brightness-110"
            />
          </div>
        )}

        {/* sticky controls: search + sort + filters */}
        <div className="sticky top-0 z-20 -mx-4 mt-5 bg-[#0b0e11]/85 backdrop-blur px-4 pt-3 pb-2 border-b border-graphite-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                suppressHydrationWarning
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stone, colour, finish…"
                aria-label="Search stone, colour, finish"
                className="w-full rounded-xl border border-graphite-600 bg-white/[0.04] pl-9 pr-8 py-2 text-sm text-white placeholder:text-slate-500 focus:border-gold outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              suppressHydrationWarning
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort slabs"
              className="rounded-xl border border-graphite-600 bg-white/[0.04] px-2 py-2 text-sm text-slate-300 focus:border-gold outline-none"
            >
              <option value="featured">Featured</option>
              <option value="large">Largest</option>
              <option value="small">Smallest</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          {(materials.length > 1 || finishes.length > 1) && (
            <div className="mt-2 space-y-1.5">
              {materials.length > 1 && (
                <Chips label="Stone" value={material} onChange={setMaterial} options={materials} />
              )}
              {finishes.length > 1 && (
                <Chips label="Finish" value={finish} onChange={setFinish} options={finishes} />
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gold">✨ {filtered.length} in stock</p>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-slate-400 hover:text-white underline">
              Clear filters
            </button>
          )}
        </div>

        {/* grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/s/${s.id}`}
              className="group rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden hover:border-gold/50 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(201,139,75,.5)] transition-all"
            >
              <div className="relative h-40">
                {s.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_path} alt={s.material} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <StoneSwatch material={s.material} color={s.color} className="w-full h-full" />
                )}
                {/* gradient + name overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {s.finish && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/50 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
                    {s.finish}
                  </span>
                )}
                <div className="absolute left-3 right-3 bottom-2">
                  <p className="font-bold text-white text-sm leading-tight drop-shadow truncate">{s.material}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge>{Number(s.sqft).toFixed(0)} sq-ft</Badge>
                    {s.thickness_mm ? <Badge>{s.thickness_mm}mm</Badge> : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[11px] text-gold/80 group-hover:text-gold font-medium">Price on request</span>
                <span className="text-gold/70 group-hover:text-gold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-slate-400">
                {hasFilters
                  ? "No slabs match your search."
                  : "No stock is listed in this catalogue yet — please check back soon."}
              </p>
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="mt-3 rounded-lg border border-graphite-500 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${company.name}, I'd like to enquire about your stock.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-[#06351a] px-5 py-3 font-bold shadow-lg hover:brightness-105"
          >
            💬 Enquire
          </a>
        )}
        <p className="mt-8 text-center text-[11px] text-ondark-muted">
          Powered by <span className="text-slate-400">GraniteOS</span> · made by{" "}
          <span className="text-gold/70 font-semibold">HandelOS</span>
        </p>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">{children}</span>
  );
}

function Chips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[11px] text-slate-500 shrink-0">{label}:</span>
      <Chip on={value === ""} onClick={() => onChange("")}>
        All
      </Chip>
      {options.map((o) => (
        <Chip key={o} on={value === o} onClick={() => onChange(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      suppressHydrationWarning
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
        on
          ? "bg-gold/15 text-gold border-gold/40"
          : "border-graphite-600 text-slate-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
