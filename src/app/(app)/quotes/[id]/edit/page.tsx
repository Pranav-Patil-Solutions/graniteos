import { notFound, redirect } from "next/navigation";
import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import QuoteBuilder, { type QuoteInitial } from "@/components/quotes/QuoteBuilder";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireModuleAccess("quotes", { needEdit: true });
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, customer_id, valid_until, notes")
    .eq("id", id)
    .single();
  if (!quote) notFound();

  // Confirmed or accepted quotes are locked — bounce back to the read view.
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("quote_id", id)
    .maybeSingle();
  if (order || quote.status === "accepted") redirect(`/quotes/${id}`);

  const [{ data: customers }, { data: slabs }, { data: products }, { data: itemsData }] =
    await Promise.all([
      supabase.from("parties").select("id, name").eq("kind", "customer").order("name"),
      supabase
        .from("slabs")
        .select("id, sqft, rate_paise, blocks(material, label)")
        .eq("status", "in_stock")
        .limit(200),
      supabase
        .from("products")
        .select("id, name, hsn_code, uom, default_rate_paise, gst_rate")
        .eq("active", true)
        .order("name"),
      supabase
        .from("quote_items")
        .select("description, slab_id, product_id, hsn_code, uom, sqft, rate_paise, gst_rate")
        .eq("quote_id", id)
        .order("created_at", { ascending: true }),
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
  const productOpts = (products ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    hsn: (p.hsn_code as string | null) ?? null,
    uom: (p.uom as string) ?? "SQF",
    rateRupees: Number(p.default_rate_paise) / 100,
    gstRate: Number(p.gst_rate),
  }));

  const initial: QuoteInitial = {
    customerId: (quote.customer_id as string) ?? "",
    validUntil: (quote.valid_until as string) ?? "",
    notes: (quote.notes as string) ?? "",
    items: (itemsData ?? []).map((it) => ({
      description: (it.description as string) ?? "",
      slabId: (it.slab_id as string | null) ?? "",
      productId: (it.product_id as string | null) ?? "",
      hsn: (it.hsn_code as string | null) ?? "",
      uom: (it.uom as string) ?? "SQF",
      sqft: String(it.sqft ?? ""),
      rateRupees: String(Number(it.rate_paise ?? 0) / 100),
      gstRate: String(it.gst_rate ?? "18"),
    })),
  };

  return (
    <QuoteBuilder
      customers={(customers ?? []) as { id: string; name: string }[]}
      slabs={slabOpts}
      products={productOpts}
      quoteId={id}
      initial={initial}
    />
  );
}
