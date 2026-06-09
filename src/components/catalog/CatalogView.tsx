"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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

  // distinct materials for the "see it in your space" visualizer
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

  const [material, setMaterial] = useState<string>("");
  const [finish, setFinish] = useState<string>("");

  const filtered = slabs.filter(
    (s) => (!material || s.material === material) && (!finish || s.finish === finish),
  );
  const hero = filtered[0] ?? slabs[0];

  const wa = company.phone ? company.phone.replace(/\D/g, "") : "";

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#e8e6e1]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-granite-green to-granite-green2 grid place-items-center font-extrabold text-white text-xl">
            {(company.name ?? "G").charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{company.name ?? "Stock catalogue"}</h1>
            <p className="text-xs text-slate-400">
              Live stock{company.city ? ` · ${company.city}` : ""} · {slabs.length} slabs available
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

        {/* filters */}
        {(materials.length > 1 || finishes.length > 1) && (
          <div className="mt-5 space-y-2">
            {materials.length > 1 && (
              <Chips label="Material" value={material} onChange={setMaterial} options={materials} />
            )}
            {finishes.length > 1 && (
              <Chips label="Finish" value={finish} onChange={setFinish} options={finishes} />
            )}
          </div>
        )}

        <p className="mt-4 text-sm text-gold">
          ✨ {filtered.length} in stock — tap a slab for details, or message us to enquire.
        </p>

        {/* grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/s/${s.id}`}
              className="group rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden hover:border-gold/50 transition-colors"
            >
              {s.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo_path} alt={s.material} className="w-full h-32 object-cover" />
              ) : (
                <StoneSwatch material={s.material} color={s.color} className="w-full h-32" />
              )}
              <div className="p-3">
                <p className="font-bold text-white text-sm truncate">{s.material}</p>
                <p className="text-xs text-slate-400">
                  {Number(s.sqft).toFixed(0)} sq-ft
                  {s.thickness_mm ? ` · ${s.thickness_mm}mm` : ""}
                  {s.finish ? ` · ${s.finish}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-gold/80">Price on request →</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-500 py-10">
              No slabs match that filter.
            </p>
          )}
        </div>

        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${company.name}, I'd like to enquire about your stock.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-[#06351a] px-5 py-3 font-bold shadow-lg"
          >
            💬 Enquire
          </a>
        )}
        <p className="mt-8 text-center text-[11px] text-graphite-500">Powered by GraniteOS</p>
      </div>
    </div>
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
