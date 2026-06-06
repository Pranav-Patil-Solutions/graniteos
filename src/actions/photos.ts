"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";

const BUCKET = "slabs";

export async function uploadSlabPhoto(slabId: string, blockId: string, formData: FormData) {
  const me = await requireSession();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No image selected." };
  if (file.size > 8 * 1024 * 1024) return { error: "Image too large (max 8 MB)." };

  // verify the slab belongs to the caller's company (RLS-scoped read)
  const supabase = await createClient();
  const { data: slab } = await supabase.from("slabs").select("id").eq("id", slabId).single();
  if (!slab) return { error: "Slab not found." };

  const admin = createAdminClient();
  // ensure the public bucket exists (idempotent — ignores "already exists")
  await admin.storage.createBucket(BUCKET, { public: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${me.company_id}/${slabId}-${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (upErr) return { error: upErr.message };

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { error: updErr } = await supabase
    .from("slabs")
    .update({ photo_path: pub.publicUrl })
    .eq("id", slabId);
  if (updErr) return { error: updErr.message };

  revalidatePath(`/inventory/${blockId}`);
  revalidatePath("/inventory");
  return { ok: true as const, url: pub.publicUrl };
}

export async function removeSlabPhoto(slabId: string, blockId: string) {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("slabs").update({ photo_path: null }).eq("id", slabId);
  if (error) return { error: error.message };
  revalidatePath(`/inventory/${blockId}`);
  return { ok: true as const };
}
