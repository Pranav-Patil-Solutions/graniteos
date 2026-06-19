import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PurchaseOrderBuilder from "@/components/procurement/PurchaseOrderBuilder";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  await requireSession();
  const { quote } = await searchParams;
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("parties")
    .select("id, name")
    .eq("kind", "supplier")
    .order("name", { ascending: true });

  // When raised from a quote, pre-fill the lines (buying rates default to the
  // quote's rates — the user adjusts them to the supplier's price).
  let quoteNo: string | undefined;
  let initialItems:
    | { description: string; material: string; qty: string; uom: string; rateRupees: string; gstRate: string }[]
    | undefined;
  if (quote) {
    const { data: q } = await supabase.from("quotes").select("quote_no").eq("id", quote).maybeSingle();
    quoteNo = q?.quote_no ?? undefined;
    const { data: qItems } = await supabase
      .from("quote_items")
      .select("description, sqft, rate_paise, gst_rate")
      .eq("quote_id", quote)
      .order("created_at", { ascending: true });
    initialItems = (qItems ?? []).map((it) => ({
      description: String(it.description ?? ""),
      material: "",
      qty: String(it.sqft ?? ""),
      uom: "SQF",
      rateRupees: String(Number(it.rate_paise ?? 0) / 100),
      gstRate: String(Number(it.gst_rate ?? 18)),
    }));
  }

  return (
    <PurchaseOrderBuilder
      suppliers={(suppliers ?? []) as { id: string; name: string }[]}
      quoteId={quote}
      quoteNo={quoteNo}
      initialItems={initialItems}
    />
  );
}
