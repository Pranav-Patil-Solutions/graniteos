# GraniteOS — Incident Response Runbook
**Version:** 1.0 · **Date:** 14 June 2026  
**Governing standard:** CERT-In Directions on Information Security Practices, 2022; DPDP Act 2023, S.8  
**Compliance record storage:** `D:\vyaparwerk\compliance\` (Companies Act 8y, CERT-In 180d)

---

## 1. Scope

This runbook covers any security incident affecting GraniteOS systems, including:
- Unauthorised access to any Supabase database, storage bucket, or application layer
- Credential compromise (service keys, API keys, Supabase service role key)
- Personal-data breach (any leak of user PII, GSTIN, financial records, slab photos)
- Infrastructure compromise (Vercel deployment, DNS hijack)
- Denial-of-service or sustained abuse that affects service availability

---

## 2. CERT-In 6-Hour Breach Notification Requirement

> **CERT-In Directions 2022, Clause 6:** A covered organisation must report a cybersecurity incident to CERT-In **within 6 hours** of becoming aware of it.

The clock starts the moment **any team member** (not just the founder) becomes aware of a credible incident — do not wait for confirmation or full investigation before notifying.

**CERT-In reporting portal:** https://www.cert-in.org.in/  
**Email:** incident@cert-in.org.in  
**Helpdesk:** +91-1800-11-4949

---

## 3. Severity Levels

| Level | Definition | Example |
|-------|-----------|---------|
| **P0 — Critical** | Confirmed data exfiltration, credential compromise, or active attack in progress | Service-role key leaked; storage bucket exfiltrated |
| **P1 — High** | Suspected breach or significant control failure; not yet confirmed | Anomalous query volume; RLS bypass suspected |
| **P2 — Medium** | Isolated anomaly; no confirmed breach; reduced functionality | Single failed login spike; minor availability degradation |
| **P3 — Low** | Informational; no immediate risk | Dependency CVE with no active exploit |

---

## 4. Incident Response Phases

### Phase 1 — DETECT (T+0)
- **Source:** `public.security_events` table (authentication failures, role changes, suspicious access events), Vercel log drains, Supabase dashboard alerts
- **Who:** Any team member who observes anomalous behaviour
- **Action:** Log the observation with timestamp, source, and initial description. Create an incident ticket (email thread or issue tracker — TODO: define tool)
- **If P0/P1:** Immediately escalate to the Data Fiduciary (Pranav) — do not wait

### Phase 2 — TRIAGE & CONTAIN (T+0 to T+1h)

**Immediate containment actions (in order):**
1. **Rotate compromised credentials** — Supabase service-role key, API keys (Groq, Gemini, Resend), Vercel tokens — via their respective dashboards
2. **Revoke active sessions** — Supabase Auth → "Revoke all refresh tokens" for affected users
3. **Disable the affected surface** — if a specific endpoint is being abused, set `MAINTENANCE_MODE=true` or redeploy without the route
4. **Preserve evidence** — export `public.security_events` rows covering the incident window; download Vercel function logs; do NOT delete anything

**Evidence to capture:**
- Supabase audit log / `security_events` rows (filter: `created_at` in incident window)
- Vercel deployment logs
- `x-forwarded-for` IPs from log lines
- Any attacker-controlled inputs (request bodies, file names)

### Phase 3 — NOTIFY (T+0 to T+6h — MANDATORY for P0/P1)

**Step 3a — CERT-In (mandatory for cybersecurity incidents):**
- File report at https://www.cert-in.org.in/ within 6 hours of awareness
- Required fields: organisation name, incident type, date/time of discovery, affected systems, initial impact assessment, actions taken
- Store a copy of the submitted report in `D:\vyaparwerk\compliance\cert-in\YYYY-MM-DD-incident.pdf`

**Step 3b — Data Protection Board of India (if personal data is affected):**
- DPDP Act S.8 requires notification "without delay" (DPB rules will specify timing once issued)
- Draft notification to include: nature of breach, categories of data, approximate number of data principals, likely consequences, remediation steps
- TODO: DPB portal URL (to be confirmed once DPB rules are notified)

**Step 3c — Affected data principals (businesses using GraniteOS):**
- Notify affected companies via in-app message + email to their account address
- Communicate: what happened, what data was involved, what we have done, what they should do

**Internal notification chain:**
- TODO: Data Fiduciary: Pranav — `pranavpatil.work@gmail.com` (always)
- TODO: Legal counsel: `<lawyer email>`
- TODO: Supabase support (for infrastructure incidents): support@supabase.io

### Phase 4 — ERADICATE & RECOVER (T+1h to T+48h)
- Identify and fix the root cause (patch code, rotate all potentially-exposed secrets, apply missing RLS policy, etc.)
- Deploy the fix via the standard preview-then-production flow (Track B CLI)
- Verify the fix closes the vulnerability using the `scripts/verify-isolation.mjs` harness
- Restore from Supabase PITR backup if data integrity is affected (see `docs/BACKUP-RECOVERY.md`)

### Phase 5 — POST-INCIDENT REVIEW (T+72h to T+2w)
- Write a post-mortem (5-why root cause, timeline, impact, fix, process improvement)
- Store the post-mortem in `D:\vyaparwerk\compliance\incidents\YYYY-MM-DD-postmortem.md`
- Update this runbook and/or the `security_events` event-type list if the detection gap was a logging gap
- Review whether CERT-In requires a follow-up report

---

## 5. What to Log in `security_events`

The auth.ts layer (owned by a separate agent) writes rows. Key event_types to ensure are covered:

| event_type | When |
|-----------|------|
| `login_success` | Successful OTP verification + session created |
| `login_failed` | OTP verification failed |
| `otp_sent` | OTP dispatched to phone |
| `mfa_enrolled` | MFA device registered |
| `mfa_verified` | MFA challenge passed |
| `mfa_failed` | MFA challenge failed |
| `role_changed` | User role updated |
| `invite_accepted` | Team member accepted an invite |
| `invite_rejected` | Invite rejected or expired |
| `data_export_requested` | User requested data export (DPDP S.12) |
| `account_deleted` | Account/company closure initiated |
| `suspicious_access` | RLS-blocked attempt or anomalous query pattern detected |
| `breach_suspected` | Manual flag; triggers P0 response |

**Retention:** rows must NOT be deleted for a minimum of **180 days** (CERT-In Directions 2022).

---

## 6. Contacts & Resources

| Contact | Details |
|---------|---------|
| CERT-In incident portal | https://www.cert-in.org.in/ |
| CERT-In email | incident@cert-in.org.in |
| CERT-In helpdesk | +91-1800-11-4949 |
| Data Fiduciary (Pranav) | pranavpatil.work@gmail.com |
| Legal counsel | TODO(legal): `<lawyer email and phone>` |
| Supabase support | support@supabase.io |
| Vercel support | https://vercel.com/support |

---

## 7. Compliance Record

After every incident (including near-misses), file the following in `D:\vyaparwerk\compliance\incidents\`:
- `YYYY-MM-DD-incident-summary.md` — what happened, when, who was affected
- `YYYY-MM-DD-cert-in-report.pdf` — copy of CERT-In submission
- `YYYY-MM-DD-postmortem.md` — root cause, timeline, fix, process change

Retention: **minimum 180 days** (CERT-In), **8 years** if financial records were involved (Companies Act).
