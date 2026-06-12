"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** Daybook tasks — the owner's voice to-do list. Owner-only writes;
 *  RLS scopes everything to the company. */

const ownerOnly = "Only the owner can manage daybook tasks.";

export async function addTask(title: unknown) {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) return { error: ownerOnly };
  const text = String(title ?? "").trim();
  if (!text) return { error: "Say or type the task first." };
  if (text.length > 300) return { error: "Keep a task under 300 characters." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("daybook_tasks")
    .insert({ company_id: me.company_id, title: text });
  if (error) return { error: error.message };
  revalidatePath("/daybook");
  return { ok: true as const };
}

export async function setTaskDone(id: unknown, done: unknown) {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) return { error: ownerOnly };
  const supabase = await createClient();
  const { error } = await supabase
    .from("daybook_tasks")
    .update(
      done
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "open", completed_at: null },
    )
    .eq("id", String(id));
  if (error) return { error: error.message };
  revalidatePath("/daybook");
  return { ok: true as const };
}

export async function deleteTask(id: unknown) {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) return { error: ownerOnly };
  const supabase = await createClient();
  const { error } = await supabase.from("daybook_tasks").delete().eq("id", String(id));
  if (error) return { error: error.message };
  revalidatePath("/daybook");
  return { ok: true as const };
}
