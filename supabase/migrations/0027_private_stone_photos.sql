-- 0027_private_stone_photos.sql — close the PUBLIC STORAGE BUCKET finding from
-- the 2026-06-14 certification audit.
--
-- Problem: bucket 'stone-photos' was PUBLIC with no storage RLS.  Anyone who
-- knew or could guess the object path ({company_id}/block-{id}.{ext}) could
-- download any company's stone photos directly from the CDN — no auth needed.
--
-- Fix:
--   1. Make the bucket private.
--   2. Add storage RLS so that authenticated users can only touch objects in
--      their OWN company's folder.  The service role (used by the server action
--      + signed-URL helper) bypasses RLS, so the app still works.
--   3. Normalise legacy photo_path values that were stored as full CDN URLs
--      (the old code called getPublicUrl and stored the result).  Convert them
--      to plain object paths so the signed-URL helper works uniformly after the
--      bucket goes private.
--
-- Application-layer note: the signed-URL helper (src/lib/photos.ts) is
-- deployed BEFORE this migration and handles both modes:
--   • legacy full URL  → returned as-is (bucket still public at that moment)
--   • object path       → signed via service role (works before AND after this)
-- This migration therefore has NO code-deploy dependency: apply it any time
-- after the 2026-06-14 code deploy.

-- ── 1. Make the bucket private ────────────────────────────────────────────────
update storage.buckets
  set public = false
  where id = 'stone-photos';

-- ── 2. Storage RLS for 'stone-photos' ────────────────────────────────────────
-- Authenticated users may SELECT / INSERT / UPDATE / DELETE objects ONLY inside
-- their own company's top-level folder.
-- The folder predicate uses storage.foldername(name) which returns the path
-- components as a 1-indexed text array.  For path "uuid/block-1.jpg" the first
-- component is the company_id.

-- SELECT (read)
drop policy if exists stone_photos_select on storage.objects;
create policy stone_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'stone-photos'
    and (storage.foldername(name))[1] = (public.current_company_id())::text
  );

-- INSERT (upload)
drop policy if exists stone_photos_insert on storage.objects;
create policy stone_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'stone-photos'
    and (storage.foldername(name))[1] = (public.current_company_id())::text
  );

-- UPDATE (upsert / replace)
drop policy if exists stone_photos_update on storage.objects;
create policy stone_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'stone-photos'
    and (storage.foldername(name))[1] = (public.current_company_id())::text
  )
  with check (
    bucket_id = 'stone-photos'
    and (storage.foldername(name))[1] = (public.current_company_id())::text
  );

-- DELETE
drop policy if exists stone_photos_delete on storage.objects;
create policy stone_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'stone-photos'
    and (storage.foldername(name))[1] = (public.current_company_id())::text
  );

-- Public catalog & share pages read via service-role signed URLs (resolvePhotoUrl
-- in src/lib/photos.ts), so NO anon read policy is required here.

-- ── 3. Normalise legacy photo_path values ────────────────────────────────────
-- Old code stored getPublicUrl() output like:
--   https://<project>.supabase.co/storage/v1/object/public/stone-photos/uuid/block-1.jpg
-- New code stores only the object path: uuid/block-1.jpg
-- Strip the CDN prefix for all rows that still hold a full URL.

update public.blocks
  set photo_path = regexp_replace(photo_path, '^.*/stone-photos/', '')
  where photo_path like 'http%';

update public.slabs
  set photo_path = regexp_replace(photo_path, '^.*/stone-photos/', '')
  where photo_path like 'http%';
