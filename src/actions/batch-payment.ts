"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";
import { allocateFifo } from "@/lib/allocate";

const MODES = ["cash", "upi", "bank", "cheque", "other"] as const;

type BatchInput = { customerId: string; amountRupees: number | string; mode: string };

/** Record one payment from a customer, allocated FIFO across their open
 *  invoices (oldest first). Mirrors recordPayment's status-recompute. */
export async function recordBatchPayment(input: BatchInput) {
  const me = await requireSession();
  if (!can(me.role, "confirmOrder")) return { error: "You don't have permission to record payments." };

  const customerId = String(input?.customerId || "");
  const amount_paise = rupeesToPaise(Number(input?.amountRupees));
  const mode = (MODES as readonly string[]).includes(String(input?.mode)) ? String(input?.mode) : "cash";
  if (!customerId) return { error: "Select a customer." };
  if (!(amount_paise > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();

  // Open invoices for this customer, oldest first (RLS scopes to the company).
  const { data: invData } = await supabase
    .from("invoices")
    .select("id, total_paise, created_at")
    .eq("customer_id", customerId)
    .neq("status", "paid")
    .order("created_at", { ascending: true });
  const open = (invData ?? []) as { id: string; total_paise: number }[];
  if (open.length === 0) return { error: "No open invoices for this customer." };

  // Outstanding per invoice = total − already-paid.
  const ids = open.map((i) => i.id);
  const { data: payData } = await supabase
    .from("payments")
    .select("invoice_id, amount_paise")
    .in("invoice_id", ids);
  const paidByInv = new Map<string, number>();
  for (const p of (payData ?? []) as { invoice_id: string; amount_paise: number }[]) {
    paidByInv.set(p.invoice_id, (paidByInv.get(p.invoice_id) || 0) + Number(p.amount_paise));
  }

  const allocatable = open.map((i) => ({
    id: i.id,
    outstanding_paise: Number(i.total_paise) - (paidByInv.get(i.id) || 0),
  }));
  const { allocations, leftover_paise } = allocateFifo(amount_paise, allocatable);
  if (allocations.length === 0) return { error: "Those invoices are already settled — nothing to allocate." };

  const { error: insErr } = await supabase.from("payments").insert(
    allocations.map((a) => ({
      company_id: me.company_id,
      customer_id: customerId,
      invoice_id: a.invoiceId,
      amount_paise: a.amount_paise,
      mode,
    })),
  );
  if (insErr) return { error: insErr.message };

  // Recompute status for each touched invoice.
  for (const a of allocations) {
    const inv = open.find((i) => i.id === a.invoiceId)!;
    const newPaid = (paidByInv.get(a.invoiceId) || 0) + a.amount_paise;
    const total = Number(inv.total_paise);
    const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    await supabase.from("invoices").update({ status }).eq("id", a.invoiceId);
  }

  revalidatePath("/money");
  revalidatePath("/invoices");
  revalidatePath("/batch-payment");
  return { ok: true as const, allocated: allocations.length, leftover_paise };
}
