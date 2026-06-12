-- 0017_daybook_tasks.sql — owner's daybook to-do list (voice-first).
-- Open tasks carry forward day to day until completed; completed tasks stay
-- on the day they were finished. Company-scoped via RLS like every table.

create table if not exists public.daybook_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_daybook_tasks_company on public.daybook_tasks(company_id, status);

alter table public.daybook_tasks enable row level security;
alter table public.daybook_tasks force row level security;

create policy daybook_tasks_all on public.daybook_tasks for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
