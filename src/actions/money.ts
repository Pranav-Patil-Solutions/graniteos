"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { paymentSchema, invoiceEditSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import {
  supplyType as resolveSupplyType,
  splitLineTax,
  computeRoundOff,
  parseStateFromGstin,
  DEFAULT_HSN,
  type SupplyType,
} from "@/lib/gst";

type QuoteLine = {
  slab_id: string | null;
  product_id: string | null;
  description: string;
  hsn_code: string | null;
  uom: string | null;
  sqft: number;
  rate_paise: number;
  gst_rate: number;
  line_subtotal_paise: number;
};

export async function createInvoiceFromOrder(orderId: string) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to create invoices." };
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

  // ── Place of supply: seller state vs customer state → intra/inter ──
  const { data: company } = await supabase
    .from("companies")
    .select("gst_state_code, gst_number")
    .eq("id", me.company_id)
    .single();
  const sellerState =
    company?.gst_state_code || parseStateFromGstin(company?.gst_number) || null;

  let customerState: string | null = null;
  if (order.customer_id) {
    const { data: cust } = await supabase
      .from("parties")
      .select("gst_state_code, gstin")
      .eq("id", order.customer_id)
      .single();
    customerState = cust?.gst_state_code || parseStateFromGstin(cust?.gstin) || null;
  }
  const placeOfSupply = customerState || sellerState;
  // When either side's state is unknown we cannot split inter-state safely;
  // default to intra (CGST+SGST), the common case for a local stone shop.
  const type: SupplyType =
    sellerState && placeOfSupply ? resolveSupplyType(sellerState, placeOfSupply) : "intra";

  // ── Line items: snapshot from the quote (Rule 46 needs per-line HSN+tax) ──
  let lines: QuoteLine[] = [];
  if (order.quote_id) {
    const { data: qItems } = await supabase
      .from("quote_items")
      .select("slab_id, product_id, description, hsn_code, uom, sqft, rate_paise, gst_rate, line_subtotal_paise")
      .eq("quote_id", order.quote_id);
    lines = (qItems ?? []) as QuoteLine[];
  }
  // Fallback: order with no quote lines → one summary line at default rate.
  if (lines.length === 0) {
    const sub = Math.round(Number(order.total_paise) / 1.18);
    lines = [
      {
        slab_id: null,
        product_id: null,
        description: "Stone supply",
        hsn_code: DEFAULT_HSN,
        uom: "SQF",
        sqft: 0,
        rate_paise: sub,
        gst_rate: 18,
        line_subtotal_paise: sub,
      },
    ];
  }

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const itemRows = lines.map((ln) => {
    const sub = Number(ln.line_subtotal_paise);
    const tax = splitLineTax(sub, Number(ln.gst_rate), type);
    subtotal += sub;
    cgst += tax.cgst;
    sgst += tax.sgst;
    igst += tax.igst;
    return {
      company_id: me.company_id,
      slab_id: ln.slab_id,
      product_id: ln.product_id ?? null,
      description: ln.description,
      hsn_code: ln.hsn_code || DEFAULT_HSN,
      uom: ln.uom || "SQF",
      sqft: ln.sqft,
      rate_paise: Number(ln.rate_paise),
      gst_rate: Number(ln.gst_rate),
      line_subtotal_paise: sub,
      line_cgst_paise: tax.cgst,
      line_sgst_paise: tax.sgst,
      line_igst_paise: tax.igst,
      line_total_paise: sub + tax.cgst + tax.sgst + tax.igst,
    };
  });

  const taxTotal = cgst + sgst + igst;
  const { roundedTotalPaise, roundOffPaise } = computeRoundOff(subtotal + taxTotal);

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
      gst_paise: taxTotal,
      total_paise: roundedTotalPaise,
      place_of_supply: placeOfSupply,
      supply_type: type,
      cgst_paise: cgst,
      sgst_paise: sgst,
      igst_paise: igst,
      round_off_paise: roundOffPaise,
      status: "unpaid",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: itemErr } = await supabase
    .from("invoice_items")
    .insert(itemRows.map((r) => ({ ...r, invoice_id: inv.id })));
  if (itemErr) return { error: itemErr.message };

  revalidatePath("/invoices");
  revalidatePath("/orders");
  return { ok: true as const, id: inv.id as string };
}

export async function updateInvoice(invoiceId: string, input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to edit invoices." };
  const parsed = invoiceEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, supply_type, total_paise")
    .eq("id", invoiceId)
    .single();
  if (!inv) return { error: "Invoice not found." };

  // Don't let totals drift out from under recorded money.
  const { data: pays } = await supabase
    .from("payments")
    .select("amount_paise")
    .eq("invoice_id", invoiceId);
  const paid = (pays ?? []).reduce((n, p) => n + Number(p.amount_paise), 0);
  if (paid > 0)
    return { error: "This invoice already has payments — edit it after reversing the payment." };

  // Keep the invoice's settled supply type (the customer doesn't change on edit).
  const type: SupplyType = (inv.supply_type as SupplyType) || "intra";

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const itemRows = v.items.map((it) => {
    const ratePaise = rupeesToPaise(it.rateRupees);
    const sub = Math.round(it.sqft * ratePaise);
    const tax = splitLineTax(sub, it.gstRate, type);
    subtotal += sub;
    cgst += tax.cgst;
    sgst += tax.sgst;
    igst += tax.igst;
    return {
      company_id: me.company_id,
      invoice_id: invoiceId,
      slab_id: it.slabId || null,
      product_id: it.productId || null,
      description: it.description,
      hsn_code: it.hsn || DEFAULT_HSN,
      uom: it.uom || "SQF",
      sqft: it.sqft,
      rate_paise: ratePaise,
      gst_rate: it.gstRate,
      line_subtotal_paise: sub,
      line_cgst_paise: tax.cgst,
      line_sgst_paise: tax.sgst,
      line_igst_paise: tax.igst,
      line_total_paise: sub + tax.cgst + tax.sgst + tax.igst,
    };
  });

  const taxTotal = cgst + sgst + igst;
  const { roundedTotalPaise, roundOffPaise } = computeRoundOff(subtotal + taxTotal);

  const { error: uErr } = await supabase
    .from("invoices")
    .update({
      subtotal_paise: subtotal,
      gst_paise: taxTotal,
      total_paise: roundedTotalPaise,
      cgst_paise: cgst,
      sgst_paise: sgst,
      igst_paise: igst,
      round_off_paise: roundOffPaise,
    })
    .eq("id", invoiceId);
  if (uErr) return { error: uErr.message };

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  const { error: iErr } = await supabase.from("invoice_items").insert(itemRows);
  if (iErr) return { error: iErr.message };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/${invoiceId}/tax-invoice`);
  revalidatePath("/invoices");
  return { ok: true as const, id: invoiceId };
}

export async function recordPayment(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to record payments." };
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
