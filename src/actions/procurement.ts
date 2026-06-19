"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";
import { allocateFifo } from "@/lib/allocate";

const MODES = ["cash", "upi", "bank", "cheque", "other"] as const;
const GST_RATES = [0, 5, 12, 18, 28] as const;

async function displayNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  entity: "purchase_order" | "purchase_bill",
): Promise<string | null> {
  const { data } = await supabase.rpc("generate_display_number", {
    p_company_id: companyId,
    p_entity_type: entity,
  });
  return (data as string) ?? null;
}

// ── validation ────────────────────────────────────────────────────────────
const poItemSchema = z.object({
  description: z.string().trim().min(1, "Each line needs a description").max(160),
  material: z.string().trim().max(80).optional().or(z.literal("")),
  qty: z.coerce.number().positive("Qty must be greater than zero"),
  uom: z.string().trim().max(8).default("SQF"),
  rateRupees: z.coerce.number().min(0, "Rate can't be negative"),
  gstRate: z.coerce.number().refine((n) => (GST_RATES as readonly number[]).includes(n), "Invalid GST %"),
});
const poSchema = z.object({
  supplierId: z.string().uuid("Pick a supplier"),
  quoteId: z.string().uuid().optional().or(z.literal("")),
  expectedDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  items: z.array(poItemSchema).min(1, "Add at least one line"),
});
const billSchema = z.object({
  supplierId: z.string().uuid("Pick a supplier"),
  poId: z.string().uuid().optional().or(z.literal("")),
  vendorBillNo: z.string().trim().max(60).optional().or(z.literal("")),
  billDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  subtotalRupees: z.coerce.number().min(0),
  gstRate: z.coerce.number().refine((n) => (GST_RATES as readonly number[]).includes(n), "Invalid GST %").default(18),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

function lineTotals(qty: number, rate_paise: number, gstRate: number) {
  const subtotal = Math.round(qty * rate_paise);
  const gst = Math.round((subtotal * gstRate) / 100);
  return { subtotal, gst, total: subtotal + gst };
}

// ── Purchase Orders ─────────────────────────────────────────────────────────
export async function createPurchaseOrder(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to raise purchase orders." };
  const parsed = poSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const rows = v.items.map((it) => {
    const rate_paise = rupeesToPaise(it.rateRupees);
    const { subtotal, gst, total } = lineTotals(it.qty, rate_paise, it.gstRate);
    return {
      company_id: me.company_id,
      description: it.description,
      material: it.material || null,
      qty: it.qty,
      uom: it.uom || "SQF",
      rate_paise,
      gst_rate: it.gstRate,
      line_subtotal_paise: subtotal,
      line_gst_paise: gst,
      line_total_paise: total,
    };
  });
  const subtotal_paise = rows.reduce((s, r) => s + r.line_subtotal_paise, 0);
  const gst_paise = rows.reduce((s, r) => s + r.line_gst_paise, 0);
  const total_paise = subtotal_paise + gst_paise;

  const po_no = await displayNumber(supabase, me.company_id, "purchase_order");
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: me.company_id,
      supplier_id: v.supplierId,
      quote_id: v.quoteId || null,
      po_no,
      expected_date: v.expectedDate || null,
      notes: v.notes || null,
      subtotal_paise,
      gst_paise,
      total_paise,
    })
    .select("id")
    .single();
  if (error || !po) return { error: error?.message ?? "Could not create the purchase order." };

  const { error: itErr } = await supabase
    .from("purchase_order_items")
    .insert(rows.map((r) => ({ ...r, po_id: po.id })));
  if (itErr) return { error: itErr.message };

  revalidatePath("/purchase-orders");
  return { ok: true as const, id: po.id, po_no, total_paise };
}

export async function getPurchaseOrders() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_no, status, po_date, total_paise, supplier:parties!purchase_orders_supplier_id_fkey(name), quote_id")
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    po_no: p.po_no,
    status: p.status,
    po_date: p.po_date,
    total_paise: p.total_paise,
    supplierName: (p as { supplier?: { name?: string } }).supplier?.name ?? "—",
    quote_id: p.quote_id,
  }));
}

export async function getPurchaseOrderById(poId: string) {
  await requireSession();
  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
  if (!po) return null;
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("po_id", poId)
    .order("created_at", { ascending: true });
  return { po, items: items ?? [] };
}

export async function setPurchaseOrderStatus(poId: string, status: string) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "Not allowed." };
  const allowed = ["draft", "sent", "approved", "received", "cancelled"];
  if (!allowed.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", poId);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  return { ok: true as const };
}

/** Seed a purchase order from a customer quote (Step 5: "Raise PO from this Quote"). */
export async function raisePOFromQuote(quoteId: string) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "Not allowed." };
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("id, total_paise").eq("id", quoteId).single();
  if (!quote) return { error: "Quote not found." };
  const { data: qItems } = await supabase
    .from("quote_items")
    .select("description, sqft, rate_paise, gst_rate, line_subtotal_paise, line_gst_paise, line_total_paise")
    .eq("quote_id", quoteId);
  const items = qItems ?? [];
  const subtotal_paise = items.reduce((s, r) => s + Number(r.line_subtotal_paise), 0);
  const gst_paise = items.reduce((s, r) => s + Number(r.line_gst_paise), 0);

  const po_no = await displayNumber(supabase, me.company_id, "purchase_order");
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: me.company_id,
      quote_id: quoteId,
      po_no,
      subtotal_paise,
      gst_paise,
      total_paise: subtotal_paise + gst_paise,
    })
    .select("id")
    .single();
  if (error || !po) return { error: error?.message ?? "Could not raise the PO." };

  if (items.length) {
    await supabase.from("purchase_order_items").insert(
      items.map((r) => ({
        company_id: me.company_id,
        po_id: po.id,
        description: r.description,
        qty: Number(r.sqft),
        uom: "SQF",
        rate_paise: Number(r.rate_paise),
        gst_rate: Number(r.gst_rate),
        line_subtotal_paise: Number(r.line_subtotal_paise),
        line_gst_paise: Number(r.line_gst_paise),
        line_total_paise: Number(r.line_total_paise),
      })),
    );
  }
  revalidatePath("/purchase-orders");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true as const, id: po.id, po_no };
}

// ── Vendor Bills (accounts payable) ─────────────────────────────────────────
export async function createPurchaseBill(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to record bills." };
  const parsed = billSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const subtotal_paise = rupeesToPaise(v.subtotalRupees);
  const gst_paise = Math.round((subtotal_paise * v.gstRate) / 100);
  const total_paise = subtotal_paise + gst_paise;
  if (!(total_paise > 0)) return { error: "Bill total must be greater than zero." };

  const supabase = await createClient();
  const bill_no = await displayNumber(supabase, me.company_id, "purchase_bill");
  const { data: bill, error } = await supabase
    .from("purchase_bills")
    .insert({
      company_id: me.company_id,
      supplier_id: v.supplierId,
      po_id: v.poId || null,
      bill_no,
      vendor_bill_no: v.vendorBillNo || null,
      bill_date: v.billDate || undefined,
      due_date: v.dueDate || null,
      notes: v.notes || null,
      subtotal_paise,
      gst_paise,
      total_paise,
    })
    .select("id")
    .single();
  if (error || !bill) return { error: error?.message ?? "Could not record the bill." };
  revalidatePath("/batch-payment");
  return { ok: true as const, id: bill.id, bill_no, total_paise };
}

/** Open bills for one supplier with balance, overdue days, and linked PO.
 *  Status (overdue / due-soon / open) is computed here, not in the UI. */
export async function getOpenBillsByVendor(supplierId: string) {
  await requireSession();
  if (!supplierId) return [];
  const supabase = await createClient();
  const { data: bills } = await supabase
    .from("purchase_bills")
    .select("id, bill_no, vendor_bill_no, bill_date, due_date, total_paise, status, po:purchase_orders!purchase_bills_po_id_fkey(po_no, id)")
    .eq("supplier_id", supplierId)
    .neq("status", "paid")
    .order("bill_date", { ascending: true });
  const rows = bills ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((b) => b.id);
  const { data: pays } = await supabase
    .from("supplier_payments")
    .select("bill_id, amount_paise")
    .in("bill_id", ids);
  const paidBy = new Map<string, number>();
  for (const p of (pays ?? []) as { bill_id: string; amount_paise: number }[]) {
    paidBy.set(p.bill_id, (paidBy.get(p.bill_id) || 0) + Number(p.amount_paise));
  }

  const today = new Date();
  const out = rows.map((b) => {
    const balance_paise = Number(b.total_paise) - (paidBy.get(b.id) || 0);
    const daysOverdue = b.due_date
      ? Math.floor((today.getTime() - new Date(b.due_date).getTime()) / 86_400_000)
      : 0;
    const status = daysOverdue > 0 ? "overdue" : daysOverdue >= -7 ? "due-soon" : "open";
    return {
      id: b.id,
      bill_no: b.bill_no,
      vendor_bill_no: b.vendor_bill_no,
      bill_date: b.bill_date,
      due_date: b.due_date,
      total_paise: Number(b.total_paise),
      paid_paise: paidBy.get(b.id) || 0,
      balance_paise,
      daysOverdue,
      status,
      po_no: (b as { po?: { po_no?: string; id?: string } }).po?.po_no ?? null,
      po_id: (b as { po?: { po_no?: string; id?: string } }).po?.id ?? null,
    };
  });
  // overdue first, then due-soon, then open; each by due date ascending
  const rank = (s: string) => (s === "overdue" ? 0 : s === "due-soon" ? 1 : 2);
  return out.sort((a, b) => rank(a.status) - rank(b.status) || a.daysOverdue - b.daysOverdue);
}

/** Pay a lump sum to one supplier, allocated FIFO (oldest bill first). */
export async function recordVendorBatchPayment(input: {
  supplierId: string;
  amountRupees: number | string;
  mode: string;
  billIds?: string[];
}) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to pay vendors." };
  const supplierId = String(input?.supplierId || "");
  const amount_paise = rupeesToPaise(Number(input?.amountRupees));
  const mode = (MODES as readonly string[]).includes(String(input?.mode)) ? String(input?.mode) : "cash";
  const selectedIds = Array.isArray(input?.billIds) ? input.billIds.filter(Boolean) : null;
  if (!supplierId) return { error: "Select a supplier." };
  if (!(amount_paise > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: billData } = await supabase
    .from("purchase_bills")
    .select("id, total_paise, bill_date")
    .eq("supplier_id", supplierId)
    .neq("status", "paid")
    .order("bill_date", { ascending: true });
  let open = (billData ?? []) as { id: string; total_paise: number }[];
  // Honour an explicit selection — only allocate across the bills the user ticked
  // (still oldest-first within that set). Without this the FIFO pass could pay
  // different (older) bills than the ones selected in the UI.
  if (selectedIds && selectedIds.length) {
    const set = new Set(selectedIds);
    open = open.filter((b) => set.has(b.id));
  }
  if (open.length === 0) return { error: "No open bills for this supplier." };

  const ids = open.map((b) => b.id);
  const { data: payData } = await supabase
    .from("supplier_payments")
    .select("bill_id, amount_paise")
    .in("bill_id", ids);
  const paidBy = new Map<string, number>();
  for (const p of (payData ?? []) as { bill_id: string; amount_paise: number }[]) {
    paidBy.set(p.bill_id, (paidBy.get(p.bill_id) || 0) + Number(p.amount_paise));
  }

  const allocatable = open.map((b) => ({
    id: b.id,
    outstanding_paise: Number(b.total_paise) - (paidBy.get(b.id) || 0),
  }));
  const { allocations, leftover_paise } = allocateFifo(amount_paise, allocatable);
  if (allocations.length === 0) return { error: "Those bills are already settled — nothing to allocate." };

  const { error: insErr } = await supabase.from("supplier_payments").insert(
    allocations.map((a) => ({
      company_id: me.company_id,
      supplier_id: supplierId,
      bill_id: a.invoiceId,
      amount_paise: a.amount_paise,
      mode,
    })),
  );
  if (insErr) return { error: insErr.message };

  for (const a of allocations) {
    const bill = open.find((b) => b.id === a.invoiceId)!;
    const newPaid = (paidBy.get(a.invoiceId) || 0) + a.amount_paise;
    const total = Number(bill.total_paise);
    const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    await supabase.from("purchase_bills").update({ status }).eq("id", a.invoiceId);
  }

  revalidatePath("/batch-payment");
  return { ok: true as const, allocated: allocations.length, leftover_paise };
}
