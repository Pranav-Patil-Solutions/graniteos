import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MarketingStudio from "@/components/growth/MarketingStudio";

export default async function GrowthPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("blocks").select("material").limit(80);
  const materials = Array.from(new Set((data ?? []).map((b) => b.material as string)))
    .filter(Boolean)
    .slice(0, 6);
  return <MarketingStudio materials={materials} />;
}
