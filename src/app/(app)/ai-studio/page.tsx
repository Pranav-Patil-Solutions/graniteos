import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AiStudio from "@/components/ai-studio/AiStudio";
import type { VizMaterial } from "@/components/catalog/StoneVisualizer";

export default async function AiStudioPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("blocks").select("material").limit(80);

  const materials = Array.from(new Set((data ?? []).map((b) => b.material as string)))
    .filter(Boolean)
    .slice(0, 6);

  const vizMaterials: VizMaterial[] = materials.map((m) => ({ label: m, material: m }));

  // Gemini tools are metered (paid). The flag flips on after Google billing
  // is set up; until then the UI warns and the server actions refuse to spend.
  const billingReady = process.env.AI_BILLING_READY === "true";

  return <AiStudio vizMaterials={vizMaterials} materials={materials} billingReady={billingReady} />;
}
