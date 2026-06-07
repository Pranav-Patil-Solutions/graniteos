"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { paymentSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function createInvoiceFromOrder(orderId: string) {
  const me = await requireSession();
  const supabase = await createClient();

  // already invoiced?
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return { ok: true as const, id: existing.id as string };

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id, total_paise, quote_id")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order not found." };

  let subtotal = 0;
  let gst = 0;
  if (order.quote_id) {
    const { data: q } = await supabase
      .from("quotes")
      .select("subtotal_paise, gst_paise")
      .eq("id", order.quote_id)
      .single();
    if (q) {
      subtotal = Number(q.subtotal_paise);
      gst = Number(q.gst_paise);
    }
  }
  if (!subtotal) subtotal = Number(order.total_paise);

  const { data: no } = await supabase.rpc("generate_display_number", {
    p_company_id: me.company_id,
    p_entity_type: "invoice",
  });

  const { data: inv, error } = await supabase
    .from("invoices")
    .insert({
      company_id: me.company_id,
      customer_id: order.customer_id,
      order_id: order.id,
      invoice_no: (no as string) ?? null,
      subtotal_paise: subtotal,
      gst_paise: gst,
      total_paise: Number(order.total_paise),
      status: "unpaid",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath("/orders");
  return { ok: true as const, id: inv.id as string };
}

export async function recordPayment(input: unknown) {
  const me = await requireSession();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, customer_id, total_paise")
    .eq("id", v.invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found." };

  const { error: pErr } = await supabase.from("payments").insert({
    company_id: me.company_id,
    customer_id: invoice.customer_id,
    invoice_id: v.invoiceId,
    amount_paise: rupeesToPaise(v.amountRupees),
    mode: v.mode,
    paid_on: v.paidOn || undefined,
    reference: v.reference || null,
  });
  if (pErr) return { error: pErr.message };

  // recompute invoice status from total payments
  const { data: pays } = await supabase
    .from("payments")
    .select("amount_paise")
    .eq("invoice_id", v.invoiceId);
  const paid = (pays ?? []).reduce((n, p) => n + Number(p.amount_paise), 0);
  const total = Number(invoice.total_paise);
  const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
  await supabase.from("invoices").update({ status }).eq("id", v.invoiceId);

  revalidatePath(`/invoices/${v.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/money");
  return { ok: true as const };
}
