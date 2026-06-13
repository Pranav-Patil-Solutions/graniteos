-- 0022: close the cross-company gap in generate_display_number.
-- The function is SECURITY DEFINER and trusted p_company_id from the caller,
-- letting any authenticated user increment another company's sequences
-- (found by scripts/verify-isolation.mjs). Service-role callers (seed/scripts)
-- are exempt; app callers must match their own company.
-- Body otherwise identical to 0012_gst_compliance.sql.

create or replace function public.generate_display_number(
  p_company_id uuid, p_entity_type text
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now())::int;
  v_month int := extract(month from now())::int;
  v_seq int;
  v_prefix text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and p_company_id is distinct from public.current_company_id() then
    raise exception 'forbidden_company';
  end if;

  -- Invoices follow the Indian financial year (Apr–Mar).
  if p_entity_type = 'invoice' and v_month < 4 then
    v_year := v_year - 1;
  end if;

  insert into public.display_number_sequences (company_id, entity_type, year, last_seq)
  values (p_company_id, p_entity_type, v_year, 1)
  on conflict (company_id, entity_type, year)
  do update set last_seq = public.display_number_sequences.last_seq + 1
  returning last_seq into v_seq;

  if p_entity_type = 'invoice' then
    return 'INV\' || v_year::text || '-' || lpad(((v_year + 1) % 100)::text, 2, '0')
      || '\' || lpad(v_seq::text, 4, '0');
  end if;

  v_prefix := case p_entity_type
    when 'quote' then 'QT' when 'order' then 'ORD' when 'customer' then 'CUST'
    when 'inward' then 'INW' when 'production' then 'PRD'
    else 'DOC' end;

  if p_entity_type = 'customer' then
    return v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
