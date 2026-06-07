import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  in_stock: "bg-granite-green2/20 text-granite-green2",
  reserved: "bg-amber-500/15 text-amber-300",
  sold: "bg-slate-500/20 text-slate-300",
};

export default async function SlabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: slab } = await admin
    .from("slabs")
    .select(
      "id, company_id, length_in, width_in, sqft, net_sqft, thickness_mm, finish, grade, bundle_no, slab_no, godown, status, photo_path, blocks(material, color, label, origin)",
    )
    .eq("id", id)
    .single();
  if (!slab) notFound();

  const block = (slab as unknown as { blocks?: { material: string; color: string | null; label: string; origin: string | null } }).blocks;
  const { data: company } = await admin
    .from("companies")
    .select("name, phone")
    .eq("id", slab.company_id)
    .single();

  const spec = (k: string, v: string | number | null | undefined) =>
    v ? (
      <div className="flex justify-between py-2 border-b border-graphite-600 text-sm">
        <span className="text-slate-400">{k}</span>
        <span className="text-white font-medium">{v}</span>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#e8e6e1]">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-xs text-gold uppercase tracking-wider font-bold">
          {company?.name ?? "Slab"} · slab passport
        </div>

        <div className="mt-3 rounded-3xl overflow-hidden border border-graphite-600">
          {slab.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slab.photo_path} alt="slab" className="w-full h-56 object-cover" />
          ) : (
            <StoneSwatch material={block?.material ?? "Stone"} color={block?.color} className="w-full h-56" />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{block?.material ?? "Stone slab"}</h1>
          <span className={`text-xs font-bold rounded-md px-2.5 py-1 capitalize ${STATUS[slab.status] ?? ""}`}>
            {slab.status.replace("_", " ")}
          </span>
        </div>
        {block?.color && <p className="text-sm text-slate-400">{block.color}</p>}

        <div className="mt-4 rounded-2xl border border-graphite-600 bg-white/[0.04] px-4 py-1">
          {spec("Size", `${Number(slab.sqft).toFixed(2)} sq-ft (${slab.length_in}″ × ${slab.width_in}″)`)}
          {spec("Usable area", slab.net_sqft ? `${Number(slab.net_sqft).toFixed(2)} sq-ft` : null)}
          {spec("Thickness", slab.thickness_mm ? `${slab.thickness_mm} mm` : null)}
          {spec("Finish", slab.finish)}
          {spec("Grade", slab.grade)}
          {spec("Bundle / Slab", slab.bundle_no ? `${slab.bundle_no}${slab.slab_no ? ` · #${slab.slab_no}` : ""}` : null)}
          {spec("Block", block?.label)}
          {spec("Quarry", block?.origin)}
          {spec("Location", slab.godown)}
        </div>

        {company?.phone && (
          <a
            href={`https://wa.me/${company.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in this ${block?.material ?? "stone"} slab (${Number(slab.sqft).toFixed(0)} sq-ft).`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block text-center rounded-xl bg-[#25D366] text-[#06351a] py-3 font-bold"
          >
            💬 Enquire about this slab
          </a>
        )}
        <p className="mt-6 text-center text-[11px] text-graphite-500">Powered by GraniteOS</p>
      </div>
    </div>
  );
}
