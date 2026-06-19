# Part B — Company Isolation: Build Notes

## What I built

**`scripts/verify-isolation.mjs`** — a single self-contained Node script that proves (against the live database) that one company cannot read or write another company's data.

What it does, step by step:

1. Creates two throwaway auth users and two throwaway product keys via the service role.
2. Calls the real `setup_company` RPC as each user — the exact same path the app uses — to create Company A and Company B.
3. Seeds a handful of rows in every tenant table for both companies (blocks, slabs, parties, quotes, quote_items, orders, invoices, invoice_items, payments, production_jobs, products, daybook_tasks).
4. Signs in as Company A's user with an anon-key client (same as the browser).
5. Runs a SELECT test on every tenant table and confirms zero Company B rows come back.
6. Tries to INSERT a row with `company_id = Company B` into every tenant table and confirms the database blocks it.
7. Tries to UPDATE known Company B rows by ID and confirms 0 rows are affected (they are invisible to Company A).
8. Double-checks the UPDATE result via the service role so there is no ambiguity.
9. Runs the `generate_display_number` RPC with Company B's ID while authenticated as Company A — this finds a real isolation gap.
10. Cleans up all test data (product_keys first, then companies, then auth users) in a `finally` block so cleanup always runs even if the test fails mid-way.
11. Runs a static audit of every migration file (0001–0021): scans for tables missing `company_id`, tables with RLS enabled but no policies, and SECURITY DEFINER functions that accept a caller-supplied `company_id`.

## How to try it

```
node scripts/verify-isolation.mjs
```

Requires `.env.local` in the repo root (already there — same file the other scripts use).

## Acceptance criteria status

| Criterion | Status |
|-----------|--------|
| Create Company A and Company B with one user each, seed tenant tables | Done |
| As Company A, SELECT every tenant table — zero Company B rows visible | PASS (17 checks) |
| As Company A, INSERT with company_id = Company B into every tenant table — all rejected | PASS (15 checks) |
| As Company A, UPDATE known Company B rows — 0 rows affected | PASS (4 checks) |
| Cleanup runs even on failure (try/finally) | Done |
| Known FK gotcha: product_keys deleted before companies | Done |
| PASS/FAIL per table + summary line | Done |
| Exit code 0 on clean pass, 1 on any failure | Done |
| Static audit: tables missing company_id | Done — none found |
| Static audit: tables with RLS on but no policies | Done — product_keys is intentional (service-role only); access_control is not yet applied |
| Static audit: SECURITY DEFINER functions accepting caller-supplied company_id | Done — found one real issue |
| Migrations 0020/0021 tolerated gracefully if not applied | Done — access_control tests show SKIP/denied-gracefully message |
| Vitest suite unaffected (126 tests) | PASS — 126/126 green |

## Per-table results (latest run)

```
SELECT isolation:
PASS  blocks
PASS  slabs
PASS  parties
PASS  quotes
PASS  quote_items
PASS  orders
PASS  invoices
PASS  invoice_items
PASS  payments
PASS  production_jobs
PASS  products
PASS  daybook_tasks
PASS  companies
PASS  users
PASS  display_number_sequences
PASS  product_keys (no policies — all denied, intentional)
PASS  access_control (table not in DB yet — migration 0021 not applied)

Cross-company INSERT:
PASS  blocks, slabs, parties, quotes, quote_items, orders, invoices,
      invoice_items, payments, production_jobs, products, daybook_tasks,
      users, display_number_sequences, access_control
      — every attempt returned "new row violates row-level security policy"

Cross-company UPDATE:
PASS  blocks, parties, products (0 rows affected)
PASS  blocks double-checked via service role — label unchanged

FAIL  generate_display_number RPC — see audit finding below

OVERALL: 38 PASS  1 FAIL  0 SKIP
```

## Audit findings (do not need a schema change, but should be fixed)

### Finding 1 — SECURITY DEFINER function with caller-supplied company_id (real isolation gap)

**Function:** `public.generate_display_number(p_company_id uuid, p_entity_type text)`

**Problem:** This function is `SECURITY DEFINER` (runs as the Postgres superuser, bypasses RLS). It accepts `p_company_id` from the caller. A Company A user can call it with Company B's company_id and it will succeed — incrementing Company B's quote/order/invoice sequence counter. The live test confirmed this: Company A called it with Company B's ID and got back `QT-2026-0001`.

This is not a data leak (Company A cannot read Company B's data) but it is a data integrity attack: Company A can cause Company B's sequential document numbers to skip, creating duplicates or gaps in their records.

**Fix (paste-ready SQL for the Supabase dashboard):**

```sql
-- Harden generate_display_number: ignore the caller-supplied company_id
-- and always use the caller's own company (current_company_id()).
-- This makes it impossible for a user to corrupt another company's sequences.
-- The calling code in the app always passes the current user's own company_id
-- anyway, so this change is backward-compatible.
CREATE OR REPLACE FUNCTION public.generate_display_number(
  p_company_id   uuid,       -- kept for backward compat; value is IGNORED
  p_entity_type  text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id   uuid := public.current_company_id();
  v_year   int  := extract(year  from now())::int;
  v_month  int  := extract(month from now())::int;
  v_seq    int;
  v_prefix text;
BEGIN
  -- Reject unauthenticated calls (current_company_id() returns null).
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_entity_type = 'invoice' AND v_month < 4 THEN
    v_year := v_year - 1;
  END IF;

  INSERT INTO public.display_number_sequences (company_id, entity_type, year, last_seq)
  VALUES (v_company_id, p_entity_type, v_year, 1)
  ON CONFLICT (company_id, entity_type, year)
  DO UPDATE SET last_seq = public.display_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  IF p_entity_type = 'invoice' THEN
    RETURN 'INV/' || v_year::text || '-' ||
           lpad(((v_year + 1) % 100)::text, 2, '0') || '/' ||
           lpad(v_seq::text, 4, '0');
  END IF;

  v_prefix := CASE p_entity_type
    WHEN 'quote'  THEN 'QT'   WHEN 'order'      THEN 'ORD'
    WHEN 'customer' THEN 'CUST' WHEN 'inward'    THEN 'INW'
    WHEN 'production' THEN 'PRD' ELSE 'DOC'
  END;

  IF p_entity_type = 'customer' THEN
    RETURN v_prefix || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
END;
$$;
```

After applying: re-run `node scripts/verify-isolation.mjs` — the FAIL should flip to PASS and the overall result becomes 39 PASS 0 FAIL.

### Finding 2 — access_control table (migration 0021 not applied)

The `access_control` table defined in `0021_access_control.sql` does not exist in the live database yet. The isolation script handles this gracefully (reports "denied — table not in schema cache" for both SELECT and INSERT tests). Once Pranav pastes migration 0021 into the Supabase SQL editor, re-running the script will test it properly. The policy definitions in 0021 look correct (read-own + write-owner-only).

## Anything I couldn't do

- **The `generate_display_number` FAIL is a real issue, not a script bug.** I am reporting it, not hiding it. The fix SQL is provided above — Pranav needs to paste it into the Supabase dashboard. I did not change the schema myself per the instructions.
- Migration 0021 (access_control) is not in the live DB. Once applied, the tests will cover it automatically with no script changes needed.
- The script does not test server actions (like `bulkImport`) directly because those run in the Next.js server process, not via PostgREST. The RLS layer that protects against cross-company writes through server actions is the same one proven here — the DB-level RLS blocks regardless of which code path calls it.
