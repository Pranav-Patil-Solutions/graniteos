"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { jobSchema, FAB_STAGES } from "@/lib/validation";

export async function createJob(input: unknown) {
  const me = await requireSession();
  if (!can(me.role, "manageProduction")) return { error: "You don't have permission to manage production." };
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: no } = await supabase.rpc("generate_display_number", {
    p_company_id: me.company_id,
    p_entity_type: "production",
  });

  const { error } = await supabase.from("production_jobs").insert({
    company_id: me.company_id,
    job_no: (no as string) ?? null,
    title: v.title,
    material: v.material || null,
    qty_sqft: v.qtySqft ?? 0,
    machine: v.machine || null,
    notes: v.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/fabrication");
  return { ok: true as const };
}

export async function advanceStage(jobId: string, current: string) {
  const me = await requireSession();
  if (!can(me.role, "manageProduction")) return { error: "You don't have permission to manage production." };
  const idx = FAB_STAGES.indexOf(current as (typeof FAB_STAGES)[number]);
  const next = FAB_STAGES[Math.min(idx + 1, FAB_STAGES.length - 1)];
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_jobs")
    .update({ stage: next })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/fabrication");
  return { ok: true as const };
}

export async function setQC(jobId: string, status: "passed" | "failed") {
  const me = await requireSession();
  if (!can(me.role, "manageProduction")) return { error: "You don't have permission to manage production." };
  const supabase = await createClient();
  // pass → move on to ready; fail → send back to polishing for rework
  const stage = status === "passed" ? "ready" : "polishing";
  const { error } = await supabase
    .from("production_jobs")
    .update({ qc_status: status, stage })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/fabrication");
  return { ok: true as const };
}
