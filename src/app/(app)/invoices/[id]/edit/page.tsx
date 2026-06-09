import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import InvoiceEditor from "@/components/money/InvoiceEditor";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_no")
    .eq("id", id)
    .single();
  if (!invoice) notFound();

  // A paid / part-paid invoice is locked — bounce back to the read view.
  const { data: pays } = await supabase
    .from("payments")
    .select("amount_paise")
    .eq("invoice_id", id);
  const paid = (pays ?? []).reduce((n, p) => n + Number(p.amount_paise), 0);
  if (paid > 0) redirect(`/invoices/${id}`);

  const [{ data: itemsData }, { data: products }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("description, product_id, hsn_code, uom, sqft, rate_paise, gst_rate")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, hsn_code, uom, default_rate_paise, gst_rate")
      .eq("active", true)
      .order("name"),
  ]);

  const initialItems = (itemsData ?? []).map((it) => ({
    description: (it.description as string) ?? "",
    productId: (it.product_id as string | null) ?? "",
    hsn: (it.hsn_code as string | null) ?? "",
    uom: (it.uom as string) ?? "SQF",
    sqft: String(it.sqft ?? ""),
    rateRupees: String(Number(it.rate_paise ?? 0) / 100),
    gstRate: String(it.gst_rate ?? "18"),
  }));

  const productOpts = (products ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    hsn: (p.hsn_code as string | null) ?? null,
    uom: (p.uom as string) ?? "SQF",
    rateRupees: Number(p.default_rate_paise) / 100,
    gstRate: Number(p.gst_rate),
  }));

  return (
    <InvoiceEditor
      invoiceId={id}
      invoiceNo={(invoice.invoice_no as string) ?? "Invoice"}
      initialItems={initialItems}
      products={productOpts}
    />
  );
}
