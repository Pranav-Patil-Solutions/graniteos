-- 0013b — re-assert the products RLS policy (the policy didn't take on the
-- first paste, leaving RLS enabled with no policy = all rows denied).
-- Safe to run repeatedly.

alter table public.products enable row level security;
alter table public.products force row level security;

drop policy if exists products_all on public.products;
create policy products_all on public.products for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
