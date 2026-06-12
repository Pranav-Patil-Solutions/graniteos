-- 0019_block_photos.sql — real photos for stone blocks.
-- The block list/detail previously showed a procedural CSS texture guessed
-- from the material name, which read as a "random photo". Now: the owner
-- uploads a real photo (camera on mobile); until then a neutral chip shows.
-- Uploads go through a server action with the service role, so the bucket
-- needs no storage RLS policies — it just has to exist (public read).

alter table public.blocks add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('stone-photos', 'stone-photos', true)
on conflict (id) do nothing;
