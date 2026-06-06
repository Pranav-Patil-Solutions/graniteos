-- 0005_inventory_industry.sql — bring Stock up to granite/marble industry standard.

-- Blocks: dimensions (cm) → CBM, colour, quarry origin. Weight becomes optional.
alter table public.blocks
  add column if not exists color text,
  add column if not exists length_cm numeric(7,1),
  add column if not exists width_cm numeric(7,1),
  add column if not exists height_cm numeric(7,1),
  add column if not exists origin text;

alter table public.blocks alter column weight_tonnes drop not null;

-- Slabs: bundle/slab numbering, finish, grade, net (usable) area.
alter table public.slabs
  add column if not exists bundle_no text,
  add column if not exists slab_no int,
  add column if not exists finish text,
  add column if not exists grade text,
  add column if not exists net_sqft numeric(10,2);
