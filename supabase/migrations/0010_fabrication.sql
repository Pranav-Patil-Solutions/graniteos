-- 0010_fabrication.sql — Production jobs (fabrication + QC). Company-scoped.
create table public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_no text,
  order_id uuid references public.orders(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  material text,
  qty_sqft numeric(10,2) not null default 0,
  machine text,
  stage text not null default 'queued'
    check (stage in ('queued','cutting','polishing','edging','qc','ready','dispatched')),
  qc_status text not null default 'pending' check (qc_status in ('pending','passed','failed')),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_jobs_company on public.production_jobs(company_id);
create index idx_jobs_stage on public.production_jobs(company_id, stage);

alter table public.production_jobs enable row level security;
alter table public.production_jobs force row level security;

create policy jobs_all on public.production_jobs for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
