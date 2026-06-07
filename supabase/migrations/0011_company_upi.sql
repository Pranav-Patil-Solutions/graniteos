-- 0011_company_upi.sql — company UPI id for WhatsApp pay-links.
alter table public.companies add column if not exists upi_id text;
