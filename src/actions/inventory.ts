"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { blockSchema, slabSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function addBlock(input: unknown) {
  const me = await requireSession();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .insert({
      company_id: me.company_id,
      label: v.label,
      material: v.material,
      weight_tonnes: v.weightTonnes,
      supplier: v.supplier || null,
      cost_paise: v.costRupees ? rupeesToPaise(v.costRupees) : 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { ok: true as const, id: data.id as string };
}

export async function addSlab(input: unknown) {
  const me = await requireSession();
  const parsed = slabSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("slabs").insert({
    company_id: me.company_id,
    block_id: v.blockId,
    length_in: v.lengthIn,
    width_in: v.widthIn,
    thickness_mm: v.thicknessMm ?? null,
    godown: v.godown || null,
    rate_paise: v.rateRupees ? rupeesToPaise(v.rateRupees) : 0,
  });
  if (error) return { error: error.message };

  revalidatePath(`/inventory/${v.blockId}`);
  revalidatePath("/inventory");
  return { ok: true as const };
}

export async function setSlabStatus(
  slabId: string,
  status: "in_stock" | "reserved" | "sold",
  blockId: string,
) {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("slabs").update({ status }).eq("id", slabId);
  if (error) return { error: error.message };
  revalidatePath(`/inventory/${blockId}`);
  revalidatePath("/inventory");
  return { ok: true as const };
}
