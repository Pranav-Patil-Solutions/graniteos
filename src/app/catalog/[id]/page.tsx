import { createAdminClient } from "@/lib/supabase/admin";
import { StoneSwatch } from "@/components/inventory/StoneSwatch";

export const dynamic = "force-dynamic";

type Slab = {
  id: string;
  sqft: number;
  finish: string | null;
  thickness_mm: number | null;
  photo_path: string | null;
  blocks: { material: string; color: string | null } | null;
};

export default async function CatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: company } = await admin.from("companies").select("name, city, phone").eq("id", id).single();
  const { data: slabData } = await admin
    .from("slabs")
    .select("id, sqft, finish, thickness_mm, photo_path, blocks(material, color)")
    .eq("company_id", id)
    .eq("status", "in_stock")
    .order("created_at", { ascending: false })
    .limit(200);
  const slabs = (slabData ?? []) as unknown as Slab[];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#e8e6e1]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-granite-green to-granite-green2 grid place-items-center font-extrabold text-white text-xl">
            {(company?.name ?? "G").charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{company?.name ?? "Stock catalogue"}</h1>
            <p className="text-xs text-slate-400">
              Live stock{company?.city ? ` · ${company.city}` : ""} · {slabs.length} slabs available
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-gold">✨ Currently in stock — tap us to enquire.</p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {slabs.map((s) => (
            <div key={s.id} className="rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden">
              {s.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo_path} alt="slab" className="w-full h-32 object-cover" />
              ) : (
                <StoneSwatch
                  material={s.blocks?.material ?? "Stone"}
                  color={s.blocks?.color}
                  className="w-full h-32"
                />
              )}
              <div className="p-3">
                <p className="font-bold text-white text-sm truncate">
                  {s.blocks?.material ?? "Stone"}
                </p>
                <p className="text-xs text-slate-400">
                  {Number(s.sqft).toFixed(0)} sq-ft
                  {s.thickness_mm ? ` · ${s.thickness_mm}mm` : ""}
                  {s.finish ? ` · ${s.finish}` : ""}
                </p>
              </div>
            </div>
          ))}
          {slabs.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-500 py-10">
              No stock listed right now.
            </p>
          )}
        </div>

        {company?.phone && (
          <a
            href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
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
