-- 0015_stock_alert_optin.sql — per-customer opt-in for WhatsApp new-stock alerts.
-- Default true for existing B2B contacts; the owner can opt anyone out (DPDP).
alter table public.parties
  add column if not exists notify_new_stock boolean not null default true;
