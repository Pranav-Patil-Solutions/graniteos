import { createAdminClient } from "@/lib/supabase/admin";
import CatalogView, { type CatalogSlab } from "@/components/catalog/CatalogView";
import { resolvePhotoUrls } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Row = {
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

  const { data: company } = await admin
    .from("companies")
    .select("name, city, phone")
    .eq("id", id)
    .single();
  const { data: slabData } = await admin
    .from("slabs")
    .select("id, sqft, finish, thickness_mm, photo_path, blocks(material, color)")
    .eq("company_id", id)
    .eq("status", "in_stock")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (slabData ?? []) as unknown as Row[];
  // Resolve photo_paths to signed URLs before handing to the client component.
  // Dual-mode: legacy full URLs pass through; object paths get a 1-hour signed URL.
  const rawSlabs: CatalogSlab[] = rows.map((r) => ({
    id: r.id,
    sqft: r.sqft,
    finish: r.finish,
    thickness_mm: r.thickness_mm,
    photo_path: r.photo_path,
    material: r.blocks?.material ?? "Stone",
    color: r.blocks?.color ?? null,
  }));
  const photoUrls = await resolvePhotoUrls(rawSlabs.map((s) => s.photo_path));
  const slabs: CatalogSlab[] = rawSlabs.map((s, i) => ({ ...s, photo_path: photoUrls[i] }));

  return (
    <CatalogView
      company={{ id, name: company?.name ?? "Stock catalogue", city: company?.city ?? null, phone: company?.phone ?? null }}
      slabs={slabs}
    />
  );
}
