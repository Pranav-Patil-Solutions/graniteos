-- 0003_foundation_rls.sql — multi-tenant isolation.
-- No INSERT/DELETE policies: those go through SECURITY DEFINER RPCs only.
alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.users enable row level security;
alter table public.users force row level security;
alter table public.display_number_sequences enable row level security;
alter table public.display_number_sequences force row level security;

-- companies: read own; owner updates own.
create policy companies_select on public.companies for select
  using (id = public.current_company_id());
create policy companies_update on public.companies for update
  using (id = public.current_company_id() and public.current_user_role() = 'owner')
  with check (id = public.current_company_id() and public.current_user_role() = 'owner');

-- users: read same company; owner or self may update (within same company).
create policy users_select on public.users for select
  using (company_id = public.current_company_id());
create policy users_update on public.users for update
  using (company_id = public.current_company_id()
         and (public.current_user_role() = 'owner' or auth_user_id = auth.uid()))
  with check (company_id = public.current_company_id());

-- sequences: read own company; writes are RPC-only (no insert/update/delete policy).
create policy seq_select on public.display_number_sequences for select
  using (company_id = public.current_company_id());
