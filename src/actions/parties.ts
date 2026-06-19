"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { partySchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { requireEditAccess } from "@/lib/access-control-guard";

export async function addParty(input: unknown) {
  const guard = await requireEditAccess("parties");
  if ("error" in guard) return guard;
  const me = guard.user;
  const parsed = partySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("parties").insert({
    company_id: me.company_id,
    kind: v.kind,
    name: v.name,
    party_type: v.partyType || null,
    phone: v.phone || null,
    email: v.email || null,
    city: v.city || null,
    address: v.address || null,
    gstin: v.gstin || null,
    gst_state_code: v.gstStateCode || (v.gstin ? v.gstin.slice(0, 2) : null),
    legal_name: v.legalName || null,
    credit_limit_paise: v.creditLimitRupees ? rupeesToPaise(v.creditLimitRupees) : 0,
    opening_balance_paise: v.openingBalanceRupees ? rupeesToPaise(v.openingBalanceRupees) : 0,
    notes: v.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/parties");
  return { ok: true as const };
}

/** Toggle a customer's opt-in for WhatsApp new-stock alerts (DPDP control). */
export async function setStockNotify(partyId: string, on: boolean) {
  // Editing a party's consent flag is a parties write — gate it on the dynamic
  // parties access config (not a hardcoded capability), like addParty/deleteParty.
  const guard = await requireEditAccess("parties");
  if ("error" in guard) return guard;
  const supabase = await createClient();
  const { error } = await supabase
    .from("parties")
    .update({ notify_new_stock: on })
    .eq("id", partyId);
  if (error) return { error: error.message };
  revalidatePath("/stock-alert");
  return { ok: true as const };
}

export async function deleteParty(id: string) {
  const guard = await requireEditAccess("parties");
  if ("error" in guard) return guard;
  const me = guard.user;
  if (!can(me.role, "viewCompanySettings")) return { error: "Only the owner can delete a customer or supplier." };
  const supabase = await createClient();
  const { error } = await supabase.from("parties").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/parties");
  return { ok: true as const };
}
