"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { partySchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function addParty(input: unknown) {
  const me = await requireSession();
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
    credit_limit_paise: v.creditLimitRupees ? rupeesToPaise(v.creditLimitRupees) : 0,
    opening_balance_paise: v.openingBalanceRupees ? rupeesToPaise(v.openingBalanceRupees) : 0,
    notes: v.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/parties");
  return { ok: true as const };
}

export async function deleteParty(id: string) {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("parties").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/parties");
  return { ok: true as const };
}
