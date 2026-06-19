-- 0028_security_events.sql
-- CERT-In Directions 2022: security/access events must be logged and retained ≥180 days.
-- This table is the canonical audit log for GraniteOS.
--
-- WRITE DISCIPLINE: rows are inserted ONLY by server-side code running under the
-- Supabase service-role (SECURITY DEFINER functions or the Next.js server-actions layer).
-- There is intentionally NO user-facing INSERT/UPDATE/DELETE policy — tampering with
-- audit records from a compromised user session is therefore impossible.
-- Authenticated company members may SELECT their own company's events.

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists public.security_events (
  id              uuid        primary key default gen_random_uuid(),
  -- company_id is nullable: system-level events (e.g. cross-tenant probes) may
  -- not belong to a specific company.
  company_id      uuid        null references public.companies(id) on delete set null,
  actor_user_id   uuid        null,   -- auth.uid() at the time of the event
  event_type      text        not null, -- e.g. 'otp_sent', 'login_success', 'login_failed',
                                        --      'mfa_enrolled', 'role_changed', 'invite_accepted',
                                        --      'data_export_requested', 'suspicious_access'
  detail          jsonb       not null default '{}',  -- structured context; never include raw PII
  ip              text        null,   -- client IP from x-forwarded-for (server-side only)
  created_at      timestamptz not null default now()
);

comment on table public.security_events is
  'CERT-In Directions 2022: audit log of authentication, access-control and security events. '
  'Rows are written server-side via the service role only (SECURITY DEFINER / Next.js server actions). '
  'Minimum retention: 180 days. Do not delete rows within the retention window.';

comment on column public.security_events.event_type is
  'Enumerated event class. Examples: otp_sent, login_success, login_failed, mfa_enrolled, '
  'role_changed, invite_accepted, invite_rejected, data_export_requested, suspicious_access, '
  'breach_suspected.';

comment on column public.security_events.detail is
  'Structured JSON context. Must NOT contain raw passwords, OTP codes, or full credit-card numbers. '
  'Phone numbers and emails should be masked (e.g. "+91-XXXX-XX4567") where not strictly required.';

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Primary query patterns: "show all events for company X in the last 30 days"
-- and "show all events of type Y across the system".
create index if not exists security_events_company_time_idx
  on public.security_events (company_id, created_at desc);

create index if not exists security_events_type_time_idx
  on public.security_events (event_type, created_at desc);

-- ── Row-Level Security ─────────────────────────────────────────────────────────
alter table public.security_events enable row level security;
alter table public.security_events force row level security;

-- Company members may read their own company's events.
-- The service role bypasses RLS entirely and is the only writer.
drop policy if exists security_events_company_select on public.security_events;
create policy security_events_company_select
  on public.security_events
  for select
  to authenticated
  using (company_id = public.current_company_id());

-- Intentionally NO insert/update/delete policies for authenticated users.
-- All writes must go through the service role or a SECURITY DEFINER function.
-- This ensures the audit trail cannot be tampered with by a compromised session.
