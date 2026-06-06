"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validation";

export async function inviteTeamMember(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) return { error: "Only the owner can invite members." };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team_invite", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_role: parsed.data.role,
  });
  if (error) return { error: error.message };

  const token = (data as { invite_token: string }).invite_token;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true as const, inviteUrl: `${base}/invite/accept?token=${token}` };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    if (error.message.includes("invite_invalid_or_expired"))
      return { error: "This invite is invalid or has expired." };
    return { error: error.message };
  }
  return { ok: true as const };
}
