import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export type AppUser = {
  id: string;
  company_id: string;
  name: string;
  role: Role;
  phone: string | null;
  status: string;
};

/** The current app user (via the my_user RPC), or null if not signed in / no company row yet. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("my_user");
  // PostgREST can return a single object or a (possibly empty) array.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as AppUser;
}

/**
 * Use at the top of every protected page/action.
 * - Not signed in at all → /login
 * - Signed in but hasn't created a company yet → /setup
 */
export async function requireSession(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (user) return user;

  // Distinguish "no session" from "authenticated but no company row yet".
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  redirect(authUser ? "/setup" : "/login");
}
