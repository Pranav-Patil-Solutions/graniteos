"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ACCESS_MODULES, type AccessConfig, type AccessLevel } from "@/lib/access-control";

const VALID_ROLES = ["sales_manager", "store_manager", "fabrication_supervisor"] as const;
const VALID_LEVELS: AccessLevel[] = ["none", "view", "edit"];

/** Owner-only: persist the access control config for the company.
 *  Config is validated server-side to prevent injection of arbitrary keys. */
export async function saveAccessControl(rawConfig: unknown) {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings"))
    return { error: "Only the owner can change access control." };

  // Validate shape: must be { [role]: { [module]: level } }
  if (typeof rawConfig !== "object" || rawConfig === null)
    return { error: "Invalid config." };

  const cleaned: AccessConfig = {};
  for (const role of VALID_ROLES) {
    const roleObj = (rawConfig as Record<string, unknown>)[role];
    if (!roleObj || typeof roleObj !== "object") continue;
    const roleConfig: Partial<Record<string, AccessLevel>> = {};
    for (const mod of ACCESS_MODULES) {
      const level = (roleObj as Record<string, unknown>)[mod];
      if (VALID_LEVELS.includes(level as AccessLevel)) {
        roleConfig[mod] = level as AccessLevel;
      }
    }
    cleaned[role] = roleConfig as AccessConfig[typeof role];
  }

  const supabase = await createClient();

  // Upsert — the row should already exist (seeded at company creation).
  const { error } = await supabase.from("access_control").upsert(
    { company_id: me.company_id, config: cleaned, updated_at: new Date().toISOString() },
    { onConflict: "company_id" },
  );

  if (error) {
    // Migration 0021 not applied — tolerate gracefully.
    if (
      error.code === "42P01" ||
      error.message.includes("access_control") ||
      error.message.includes("does not exist")
    ) {
      return {
        error:
          "Setup needed — ask Pranav to apply migration 0021_access_control.sql first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/access-control");
  return { ok: true as const };
}
