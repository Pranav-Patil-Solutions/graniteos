/**
 * Server-only access control guard.
 * Wraps requireSession() + DB fetch of the company's access_control row.
 *
 * Tolerates the access_control table not existing (migration 0021 not applied)
 * by falling back to DEFAULT_CONFIG — so the app never 500s before migration.
 *
 * Do NOT import this file from client components; use access-control.ts instead.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, type AppUser } from "@/lib/auth";
import {
  accessFor,
  DEFAULT_CONFIG,
  type AccessModule,
  type AccessLevel,
  type AccessConfig,
} from "@/lib/access-control";

export type { AccessConfig, AccessModule, AccessLevel };

/** Shared function that loads the company's access config from the DB.
 *  Returns DEFAULT_CONFIG on any error (missing table, network hiccup). */
export async function loadAccessConfig(companyId: string): Promise<AccessConfig> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("access_control")
      .select("config")
      .eq("company_id", companyId)
      .maybeSingle();
    if (!error && data?.config) return data.config as AccessConfig;
  } catch {
    // Table not yet created → use defaults.
  }
  return DEFAULT_CONFIG as unknown as AccessConfig;
}

/**
 * Call at the top of a mutating server action instead of requireSession().
 *
 * Returns either:
 *   { user: AppUser } — caller is allowed to proceed
 *   { error: string } — caller must return this error to the UI
 *
 * requireSession() itself will redirect() if the user is not logged in.
 */
export async function requireEditAccess(
  module: AccessModule,
): Promise<{ user: AppUser } | { error: string }> {
  const me = await requireSession();

  // Owners always have full access.
  if (me.role === "owner") return { user: me };

  const config = await loadAccessConfig(me.company_id);
  const level = accessFor(config, me.role, module);

  if (level !== "edit") {
    return {
      error:
        level === "view"
          ? "You have view-only access to this module — ask the owner to enable editing."
          : "You don't have access to this module — contact the owner.",
    };
  }

  return { user: me };
}

/**
 * For page-level checks: returns the user + their access level for a module.
 * Use this in server-component pages to gate rendering or pass viewOnly to clients.
 */
export async function getAccessLevel(
  module: AccessModule,
): Promise<{ user: AppUser; level: AccessLevel; config: AccessConfig }> {
  const me = await requireSession();
  if (me.role === "owner") {
    return { user: me, level: "edit", config: DEFAULT_CONFIG as unknown as AccessConfig };
  }
  const config = await loadAccessConfig(me.company_id);
  const level = accessFor(config, me.role, module);
  return { user: me, level, config };
}

/**
 * Page-level READ guard. Use at the top of a server-component page that shows a
 * module's data so a role configured `none` for that module can't reach the data
 * by typing the URL (the nav already hides the tab; this closes the direct-URL gap).
 *
 * - level "none"          → redirect away (to `redirectTo`, default /dashboard)
 * - opts.needEdit + !edit → redirect away (use on create/edit-only pages)
 * - otherwise             → returns { user, level, viewOnly } so the page can
 *                           pass `viewOnly` down to disable/hide mutating controls.
 */
export async function requireModuleAccess(
  module: AccessModule,
  opts?: { needEdit?: boolean; redirectTo?: string },
): Promise<{ user: AppUser; level: AccessLevel; viewOnly: boolean }> {
  const { user, level } = await getAccessLevel(module);
  const denied = level === "none" || (opts?.needEdit === true && level !== "edit");
  if (denied) redirect(opts?.redirectTo ?? "/dashboard");
  return { user, level, viewOnly: level !== "edit" };
}
