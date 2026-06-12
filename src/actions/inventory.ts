"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { blockSchema, slabSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

const MAX_PHOTO_BYTES = 6 * 1024 * 1024; // matches the AI-studio photo cap
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Upload a real photo for a block (camera/file). Storage write happens with
 *  the service role server-side; ownership is checked via an RLS-scoped read
 *  first, so users can only attach photos to their own company's blocks. */
export async function uploadBlockPhoto(input: { blockId: string; imageBase64: string; mimeType: string }) {
  const me = await requireSession();

  const blockId = String(input?.blockId || "");
  const ext = PHOTO_TYPES[String(input?.mimeType)];
  if (!blockId || !input.imageBase64) return { error: "No photo provided." };
  if (!ext) return { error: "Use a JPG, PNG or WebP photo." };
  if (Math.floor(input.imageBase64.length * 0.75) > MAX_PHOTO_BYTES)
    return { error: "That photo is too large — please use one under ~6 MB." };

  // RLS-scoped read = proof this block belongs to the caller's company.
  const supabase = await createClient();
  const { data: block } = await supabase.from("blocks").select("id").eq("id", blockId).single();
  if (!block) return { error: "Block not found." };

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } },
  );
  const path = `${me.company_id}/block-${blockId}.${ext}`;
  const { error: upErr } = await service.storage
    .from("stone-photos")
    .upload(path, Buffer.from(input.imageBase64, "base64"), {
      contentType: input.mimeType,
      upsert: true,
    });
  if (upErr) return { error: upErr.message.includes("Bucket not found") ? "Photo storage isn't set up yet — apply migration 0019 first." : upErr.message };

  const { data: pub } = service.storage.from("stone-photos").getPublicUrl(path);
  const { error: updErr } = await supabase
    .from("blocks")
    .update({ photo_path: pub.publicUrl })
    .eq("id", blockId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${blockId}`);
  return { ok: true as const, url: pub.publicUrl };
}

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
      color: v.color || null,
      length_cm: v.lengthCm ?? null,
      width_cm: v.widthCm ?? null,
      height_cm: v.heightCm ?? null,
      weight_tonnes: v.weightTonnes ?? null,
      origin: v.origin || null,
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
    bundle_no: v.bundleNo || null,
    slab_no: v.slabNo ?? null,
    length_in: v.lengthIn,
    width_in: v.widthIn,
    net_sqft: v.netSqft ?? null,
    thickness_mm: v.thicknessMm ?? null,
    finish: v.finish || null,
    grade: v.grade || null,
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
  const me = await requireSession();
  if (!can(me.role, "logInwardReceipt")) return { error: "You don't have permission to change stock." };
  const supabase = await createClient();
  const { error } = await supabase.from("slabs").update({ status }).eq("id", slabId);
  if (error) return { error: error.message };
  revalidatePath(`/inventory/${blockId}`);
  revalidatePath("/inventory");
  return { ok: true as const };
}
