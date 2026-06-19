import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve a photo_path stored in the DB to a renderable URL.
 *
 * Dual-mode — works BOTH before migration 0027 (bucket still public, legacy
 * photo_path = full CDN URL starting with "http") AND after (bucket private,
 * photo_path = storage object path like "{company_id}/block-{id}.jpg").
 *
 * - Legacy full URLs pass through as-is: still served from the public CDN
 *   while the bucket remains public, enabling a gradual cut-over.
 * - Object paths are signed with the service role for a 1-hour TTL.
 *   Signed URLs work even before the bucket goes private, so deploying this
 *   code ahead of the migration is safe.
 *
 * Returns null when photoPath is falsy or signing fails.
 */
export async function resolvePhotoUrl(
  photoPath?: string | null,
): Promise<string | null> {
  if (!photoPath) return null;

  // Legacy: photo_path was stored as the full public CDN URL.
  // Return it unchanged — still works while bucket is public.
  if (photoPath.startsWith("http")) return photoPath;

  // New style: photo_path is the storage object path.
  // Create a 1-hour signed URL via the service role (bypasses bucket publicity).
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("stone-photos")
    .createSignedUrl(photoPath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Batch-resolve many photo_paths in parallel to avoid N+1 signing latency
 * on list pages. Preserves order; null/undefined entries resolve to null.
 */
export async function resolvePhotoUrls(
  paths: (string | null | undefined)[],
): Promise<(string | null)[]> {
  return Promise.all(paths.map((p) => resolvePhotoUrl(p)));
}
