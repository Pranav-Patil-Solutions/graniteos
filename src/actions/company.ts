"use server";

import { createClient } from "@/lib/supabase/server";
import { companySetupSchema } from "@/lib/validation";

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
  });
  if (error) {
    if (error.message.includes("already_setup")) return { error: "Company already set up." };
    return { error: error.message };
  }
  return { ok: true as const };
}
