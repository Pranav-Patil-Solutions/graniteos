-- 0026_role_gated_writes.sql — CRITICAL fix from the 2026-06-14 audit.
--
-- Problem: every business table had a single `<t>_all` policy gated ONLY on
-- company_id. So any active company member could INSERT/UPDATE/DELETE on any of
-- them via direct PostgREST — bypassing the app's module-level RBAC
-- (requireEditAccess / access_control config). A sales_manager (money='none')
-- could delete invoices or insert payments straight from the browser console.
--
-- Fix: enforce the SAME access_control model at the DB. Reads stay company-scoped
-- (so view-only members still see data); writes additionally require can_edit_module().
--
-- Scope: ONLY the modules the app itself gates with requireEditAccess —
--   inventory (blocks, slabs), products, parties, quotes (quotes, quote_items),
--   orders, money (invoices, invoice_items, payments).
-- Procurement (purchase_*, supplier_payments), fabrication (production_jobs) and
-- daybook_tasks are intentionally left company-scoped here because the app guards
-- them with requireSession() only — DB-gating them would diverge from app
-- behaviour. Tighten those once the app moves them under requireEditAccess.

-- ── Helper: does the caller have 'edit' on a module? ───────────────────────────
-- Owner ⇒ always true. Otherwise read the company's access_control.config, falling
-- back to the baked-in defaults (matches accessFor() in src/lib/access-control.ts).
-- SECURITY DEFINER so it reads access_control without recursing through RLS.
create or replace function public.can_edit_module(p_module text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_role    text := public.current_user_role();
  v_company uuid := public.current_company_id();
  v_level   text;
begin
  if v_company is null then return false; end if;
  if v_role = 'owner' then return true; end if;

  v_level := coalesce(
    (select config -> v_role ->> p_module
       from public.access_control
      where company_id = v_company),
    public.default_access_config() -> v_role ->> p_module
  );

  return v_level = 'edit';
end;
$$;

grant execute on function public.can_edit_module(text) to authenticated;

-- ── Generic helper macro (manual, since SQL has no policy loop) ─────────────────
-- For each table: drop the company-only `_all` policy, then add
--   <t>_select  : any company member may read
--   <t>_cud     : writes require company + can_edit_module(<module>)
-- (<t>_cud is FOR ALL; its USING is OR'd with <t>_select for SELECT, so view-only
--  members keep read access.)

-- inventory ────────────────────────────────────────────────────────────────────
drop policy if exists blocks_all on public.blocks;
create policy blocks_select on public.blocks for select
  using (company_id = public.current_company_id());
create policy blocks_cud on public.blocks for all
  using (company_id = public.current_company_id() and public.can_edit_module('inventory'))
  with check (company_id = public.current_company_id() and public.can_edit_module('inventory'));

drop policy if exists slabs_all on public.slabs;
create policy slabs_select on public.slabs for select
  using (company_id = public.current_company_id());
create policy slabs_cud on public.slabs for all
  using (company_id = public.current_company_id() and public.can_edit_module('inventory'))
  with check (company_id = public.current_company_id() and public.can_edit_module('inventory'));

-- products ──────────────────────────────────────────────────────────────────────
drop policy if exists products_all on public.products;
create policy products_select on public.products for select
  using (company_id = public.current_company_id());
create policy products_cud on public.products for all
  using (company_id = public.current_company_id() and public.can_edit_module('products'))
  with check (company_id = public.current_company_id() and public.can_edit_module('products'));

-- parties ───────────────────────────────────────────────────────────────────────
drop policy if exists parties_all on public.parties;
create policy parties_select on public.parties for select
  using (company_id = public.current_company_id());
create policy parties_cud on public.parties for all
  using (company_id = public.current_company_id() and public.can_edit_module('parties'))
  with check (company_id = public.current_company_id() and public.can_edit_module('parties'));

-- quotes ────────────────────────────────────────────────────────────────────────
drop policy if exists quotes_all on public.quotes;
create policy quotes_select on public.quotes for select
  using (company_id = public.current_company_id());
create policy quotes_cud on public.quotes for all
  using (company_id = public.current_company_id() and public.can_edit_module('quotes'))
  with check (company_id = public.current_company_id() and public.can_edit_module('quotes'));

drop policy if exists quote_items_all on public.quote_items;
create policy quote_items_select on public.quote_items for select
  using (company_id = public.current_company_id());
create policy quote_items_cud on public.quote_items for all
  using (company_id = public.current_company_id() and public.can_edit_module('quotes'))
  with check (company_id = public.current_company_id() and public.can_edit_module('quotes'));

-- orders ────────────────────────────────────────────────────────────────────────
drop policy if exists orders_all on public.orders;
create policy orders_select on public.orders for select
  using (company_id = public.current_company_id());
create policy orders_cud on public.orders for all
  using (company_id = public.current_company_id() and public.can_edit_module('orders'))
  with check (company_id = public.current_company_id() and public.can_edit_module('orders'));

-- money: invoices, invoice_items, payments ──────────────────────────────────────
drop policy if exists invoices_all on public.invoices;
create policy invoices_select on public.invoices for select
  using (company_id = public.current_company_id());
create policy invoices_cud on public.invoices for all
  using (company_id = public.current_company_id() and public.can_edit_module('money'))
  with check (company_id = public.current_company_id() and public.can_edit_module('money'));

drop policy if exists invoice_items_all on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select
  using (company_id = public.current_company_id());
create policy invoice_items_cud on public.invoice_items for all
  using (company_id = public.current_company_id() and public.can_edit_module('money'))
  with check (company_id = public.current_company_id() and public.can_edit_module('money'));

drop policy if exists payments_all on public.payments;
create policy payments_select on public.payments for select
  using (company_id = public.current_company_id());
create policy payments_cud on public.payments for all
  using (company_id = public.current_company_id() and public.can_edit_module('money'))
  with check (company_id = public.current_company_id() and public.can_edit_module('money'));
