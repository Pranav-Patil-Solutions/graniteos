-- 0014_perf_indexes.sql — indexes on foreign keys that are actually filtered on
-- hot paths (party history page filters by customer_id; RLS filters quote_items
-- by company_id; product/slab deletes cascade-null the line items). Idempotent.

create index if not exists idx_payments_customer   on public.payments(customer_id);
create index if not exists idx_quotes_customer      on public.quotes(customer_id);
create index if not exists idx_orders_customer      on public.orders(customer_id);

create index if not exists idx_quote_items_company  on public.quote_items(company_id);
create index if not exists idx_quote_items_product  on public.quote_items(product_id);
create index if not exists idx_quote_items_slab     on public.quote_items(slab_id);
create index if not exists idx_invoice_items_product on public.invoice_items(product_id);
create index if not exists idx_invoice_items_slab    on public.invoice_items(slab_id);
