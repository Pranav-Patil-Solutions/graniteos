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

/** The current app user (via the my_user RPC), or null if not signed in / no row yet. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("my_user");
  if (!data) return null;
  return data as AppUser;
}

/** Use at the top of every protected page/action. Redirects to /login if absent. */
export async function requireSession(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
