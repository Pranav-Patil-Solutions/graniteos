import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QuoteBuilder from "@/components/quotes/QuoteBuilder";

export default async function NewQuotePage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: customers }, { data: slabs }] = await Promise.all([
    supabase.from("parties").select("id, name").eq("kind", "customer").order("name"),
    supabase
      .from("slabs")
      .select("id, sqft, rate_paise, blocks(material, label)")
      .eq("status", "in_stock")
      .limit(200),
  ]);

  const slabOpts = (slabs ?? []).map((s) => {
    const block = (s as { blocks?: { material?: string; label?: string } }).blocks;
    return {
      id: s.id as string,
      label: block?.material ?? block?.label ?? "Slab",
      sqft: Number(s.sqft),
      rateRupees: Number(s.rate_paise) / 100,
    };
  });

  return (
    <QuoteBuilder
      customers={(customers ?? []) as { id: string; name: string }[]}
      slabs={slabOpts}
    />
  );
}
