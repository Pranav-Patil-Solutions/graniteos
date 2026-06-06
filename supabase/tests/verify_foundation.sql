-- Manual RLS + RPC verification. Run blocks in the SQL Editor.
-- NOTE: the SQL Editor runs as a privileged role; to truly exercise RLS use
-- the app (Task 12). These checks confirm structure + RPC behavior.

-- 1. Display number formatting (uses a throwaway company id).
do $$
declare cid uuid; n1 text; n2 text;
begin
  insert into public.companies (name, city) values ('VERIFY CO', 'Test') returning id into cid;
  n1 := public.generate_display_number(cid, 'quote');
  n2 := public.generate_display_number(cid, 'quote');
  raise notice 'quote numbers: % then %', n1, n2;  -- expect QT-YYYY-0001 then -0002
  raise notice 'customer number: %', public.generate_display_number(cid, 'customer'); -- CUST-0001
  delete from public.companies where id = cid;  -- cascade cleans sequences
end $$;

-- 2. RLS is enabled + forced on all three tables.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('companies','users','display_number_sequences')
order by relname;  -- expect all true/true
