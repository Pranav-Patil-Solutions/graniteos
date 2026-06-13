"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { productSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { requireEditAccess } from "@/lib/access-control-guard";

function toRow(v: ReturnType<typeof productSchema.parse>, companyId: string) {
  return {
    company_id: companyId,
    name: v.name,
    hsn_code: v.hsn || null,
    uom: v.uom || "SQF",
    default_rate_paise: v.rateRupees ? rupeesToPaise(v.rateRupees) : 0,
    gst_rate: v.gstRate ?? 18,
    material: v.material || null,
    finish: v.finish || null,
    notes: v.notes || null,
  };
}

export async function createProduct(input: unknown) {
  const guard = await requireEditAccess("products");
  if ("error" in guard) return guard;
  const me = guard.user;
  if (!can(me.role, "viewCompanySettings"))
    return { error: "Only the owner can manage products." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(toRow(parsed.data, me.company_id))
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { ok: true as const, id: data.id as string };
}

export async function updateProduct(id: string, input: unknown) {
  const guard = await requireEditAccess("products");
  if ("error" in guard) return guard;
  const me = guard.user;
  if (!can(me.role, "viewCompanySettings"))
    return { error: "Only the owner can manage products." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update(toRow(parsed.data, me.company_id))
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { ok: true as const, id };
}

/** Soft-delete: keep the row (it may be referenced by old quotes) but hide it. */
export async function archiveProduct(id: string) {
  const guard = await requireEditAccess("products");
  if ("error" in guard) return guard;
  const me = guard.user;
  if (!can(me.role, "viewCompanySettings"))
    return { error: "Only the owner can manage products." };
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  return { ok: true as const };
}
