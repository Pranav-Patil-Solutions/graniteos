import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MeasurementSheetClient, { type MeasureRow } from "@/components/measure/MeasurementSheetClient";

export const dynamic = "force-dynamic";

type Slab = {
  id: string;
  block_id: string;
  length_in: number;
  width_in: number;
  sqft: number;
  rate_paise: number;
  status: string;
  godown: string | null;
  created_at: string;
};

export default async function MeasurePage() {
  const me = await requireSession();
  const supabase = await createClient();

  const [{ data: slabsData }, { data: blocksData }, { data: company }] = await Promise.all([
    supabase
      .from("slabs")
      .select("id, block_id, length_in, width_in, sqft, rate_paise, status, godown, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("blocks").select("id, material, label"),
    supabase.from("companies").select("name").eq("id", me.company_id).single(),
  ]);

  const matById = new Map(
    ((blocksData ?? []) as { id: string; material: string; label: string }[]).map((b) => [b.id, b]),
  );

  const rows: MeasureRow[] = ((slabsData ?? []) as Slab[]).map((s) => {
    const b = matById.get(s.block_id);
    return {
      id: s.id,
      material: b?.material ?? "—",
      label: b?.label ?? "",
      length_in: Number(s.length_in),
      width_in: Number(s.width_in),
      sqft: Number(s.sqft),
      rate_paise: Number(s.rate_paise),
      value_paise: Math.round(Number(s.sqft) * Number(s.rate_paise)),
      status: s.status,
      godown: s.godown,
    };
  });

  const generatedAt = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return <MeasurementSheetClient rows={rows} companyName={company?.name ?? ""} generatedAt={generatedAt} />;
}
