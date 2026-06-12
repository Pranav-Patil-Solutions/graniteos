"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { companySetupSchema, companySettingsSchema } from "@/lib/validation";

export async function setupCompany(input: unknown) {
  const parsed = companySetupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const v = parsed.data;
  const { error } = await supabase.rpc("setup_company", {
    p_company_name: v.companyName,
    p_city: v.city,
    p_owner_name: v.ownerName,
    p_phone: v.phone || null,
    p_address: v.address || null,
    p_gst_number: v.gstNumber || null,
    p_product_key: v.productKey,
  });
  if (error) {
    if (error.message.includes("already_setup")) return { error: "Company already set up." };
    if (error.message.includes("product_key_required"))
      return { error: "Enter your product key." };
    if (error.message.includes("invalid_product_key"))
      return { error: "That product key isn't valid. Check it for typos." };
    if (error.message.includes("product_key_used"))
      return { error: "This product key has already been used for another company." };
    return { error: error.message };
  }
  return { ok: true as const };
}

export async function updateCompany(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) return { error: "Only the owner can edit settings." };
  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: v.name,
      legal_name: v.legalName || null,
      city: v.city || null,
      gst_number: v.gstNumber || null,
      gst_state_code: v.gstStateCode || (v.gstNumber ? v.gstNumber.slice(0, 2) : null),
      pan: v.pan || (v.gstNumber ? v.gstNumber.slice(2, 12) : null),
      upi_id: v.upiId || null,
      quote_terms_text: v.quoteTerms || null,
    })
    .eq("id", me.company_id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
