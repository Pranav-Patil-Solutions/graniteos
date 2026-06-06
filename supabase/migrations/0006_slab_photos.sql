-- 0006_slab_photos.sql — real slab photos (the smart slab catalog).
alter table public.slabs add column if not exists photo_path text;
