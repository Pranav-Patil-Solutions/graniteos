"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { quoteSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

async function displayNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  entity: "quote" | "order",
): Promise<string | null> {
  const { data } = await supabase.rpc("generate_display_number", {
    p_company_id: companyId,
    p_entity_type: entity,
  });
  return (data as string) ?? null;
}

export async function createQuote(input: unknown) {
  const me = await requireSession();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  // GST math (paise)
  const items = v.items.map((it) => {
    const ratePaise = rupeesToPaise(it.rateRupees);
    const subtotal = Math.round(it.sqft * ratePaise);
    const gst = Math.round((subtotal * it.gstRate) / 100);
    return {
      slab_id: it.slabId || null,
      description: it.description,
      sqft: it.sqft,
      rate_paise: ratePaise,
      gst_rate: it.gstRate,
      line_subtotal_paise: subtotal,
      line_gst_paise: gst,
      line_total_paise: subtotal + gst,
    };
  });
  const subtotal = items.reduce((n, i) => n + i.line_subtotal_paise, 0);
  const gst = items.reduce((n, i) => n + i.line_gst_paise, 0);

  const supabase = await createClient();
  const quoteNo = await displayNumber(supabase, me.company_id, "quote");

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .insert({
      company_id: me.company_id,
      customer_id: v.customerId,
      quote_no: quoteNo,
      status: "draft",
      valid_until: v.validUntil || null,
      notes: v.notes || null,
      subtotal_paise: subtotal,
      gst_paise: gst,
      total_paise: subtotal + gst,
    })
    .select("id")
    .single();
  if (qErr) return { error: qErr.message };

  const { error: iErr } = await supabase.from("quote_items").insert(
    items.map((i) => ({ ...i, company_id: me.company_id, quote_id: quote.id })),
  );
  if (iErr) return { error: iErr.message };

  revalidatePath("/quotes");
  return { ok: true as const, id: quote.id as string };
}

export async function setQuoteStatus(
  id: string,
  status: "draft" | "sent" | "accepted" | "rejected" | "expired",
) {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { ok: true as const };
}

export async function setOrderStatus(
  orderId: string,
  status: "confirmed" | "in_production" | "dispatched" | "delivered" | "cancelled",
) {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true as const };
}

export async function confirmOrder(quoteId: string) {
  const me = await requireSession();
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, customer_id, total_paise")
    .eq("id", quoteId)
    .single();
  if (!quote) return { error: "Quote not found." };

  // already confirmed?
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (existing) return { ok: true as const, id: existing.id as string };

  const orderNo = await displayNumber(supabase, me.company_id, "order");
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      company_id: me.company_id,
      quote_id: quoteId,
      customer_id: quote.customer_id,
      order_no: orderNo,
      status: "confirmed",
      total_paise: quote.total_paise,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId);

  revalidatePath("/orders");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true as const, id: order.id as string };
}
