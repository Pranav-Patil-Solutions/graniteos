# GraniteOS — Backup & Recovery Runbook
**Version:** 1.0 · **Date:** 14 June 2026  
**Governing standards:** SOC 2 Type II (CC9.1, A1), ISO 27001 A.12.3  
**Compliance record storage:** `D:\vyaparwerk\compliance\backup-tests\`

---

## 1. Supabase Plan & PITR Tier

> **TODO(ops): Confirm the active Supabase project tier and PITR window before signing off on this document.**  
> Log in to https://supabase.com/dashboard → Project → Settings → Add-ons / Billing to verify.

| Item | Current status |
|------|---------------|
| Supabase project region | EU (Frankfurt) — `aws-0-eu-central-1` |
| Supabase plan | TODO(ops): Free / Pro / Team / Enterprise |
| Daily backups included | Pro+: yes (daily, 7-day retention). Free: manual only. |
| Point-in-Time Recovery (PITR) | Pro add-on or Team plan: PITR to any second within retention window. Confirm if enabled. |
| PITR retention window | TODO(ops): 7 days / 14 days / 28 days (plan-dependent) |
| Storage bucket backups | Supabase Storage is backed up alongside the database on Pro+. Confirm. |

**Action required:** If the project is on the Free plan, upgrade to Pro (min.) and enable PITR before handling real customer data. Daily backup without PITR means maximum data loss = up to 24 hours.

---

## 2. Backup Schedule (Supabase-managed)

On the Pro plan and above, Supabase automatically takes:
- **Daily full snapshots** — retained per plan (7 days on Pro)
- **Continuous WAL archiving** (PITR add-on) — enables recovery to any point in the retention window

No additional backup job is required in the GraniteOS codebase. The backup schedule is managed entirely by Supabase infrastructure.

**Verify backups are running:** Supabase Dashboard → Project → Database → Backups. If the list is empty or shows failures, raise a Supabase support ticket immediately.

---

## 3. Restore Procedure

### 3a — Point-in-Time Restore (PITR, if enabled)
1. Go to Supabase Dashboard → Project → Database → Backups → Restore
2. Select the target timestamp (must be within the PITR retention window)
3. Supabase will spin up a new database instance — the existing database is NOT overwritten
4. Verify data integrity on the restored instance before cutting over
5. Update environment variables (`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) if the project URL changes
6. Redeploy GraniteOS with the new credentials (`vercel --prod --yes`)
7. Document the restore in `D:\vyaparwerk\compliance\backup-tests\YYYY-MM-DD-restore.md`

### 3b — Daily Snapshot Restore
1. Go to Supabase Dashboard → Project → Database → Backups
2. Select the desired daily snapshot and click "Restore"
3. Follow steps 4–7 from 3a above
4. Note: maximum data loss = time since the snapshot was taken (up to 24h)

### 3c — Manual Export (Free plan or emergency)
```bash
# Export via pg_dump (requires psql client and your database connection string)
pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" \
  --no-owner --no-acl -Fc -f graniteos_backup_$(date +%Y%m%d).dump
```
Store the dump in `D:\vyaparwerk\compliance\backup-tests\` and encrypt it at rest.

---

## 4. Restore Test Checklist

Run this checklist **at least once per quarter** and after every significant schema migration. Log results in `D:\vyaparwerk\compliance\backup-tests\YYYY-MM-DD-restore-test.md`.

### Pre-test
- [ ] Confirm Supabase backup list shows recent successful backups (within last 25h)
- [ ] Confirm PITR is enabled and the WAL lag is < 5 minutes
- [ ] Note the test start time and the target restore point

### Restore execution (use a SEPARATE Supabase project — never restore over production)
- [ ] Create a temporary Supabase project in the same region (EU Frankfurt)
- [ ] Restore the backup/PITR snapshot into the temporary project
- [ ] Apply any pending migrations not yet captured in the snapshot (`supabase db push` against the temp project)

### Verification
- [ ] Connect to the restored database; confirm row counts on key tables:
  - `companies` — expected count matches production
  - `slabs` / `blocks` — spot-check a known slab
  - `invoices` — confirm most recent invoice matches production
  - `security_events` — confirm events are present (CERT-In log continuity)
- [ ] Run `scripts/verify-isolation.mjs` against the restored DB (requires env update)
- [ ] Confirm RLS policies are intact: `select * from pg_policies where tablename='companies'`

### Post-test
- [ ] Record the Recovery Time Objective (RTO) — time from "start restore" to "data verified"
- [ ] Record the Recovery Point Objective (RPO) — oldest data that would have been lost
- [ ] Tear down the temporary Supabase project
- [ ] File the test record in `D:\vyaparwerk\compliance\backup-tests\`
- [ ] If RTO > 4h or RPO > 1h, raise with Pranav to consider plan upgrade or PITR enablement

---

## 5. RTO / RPO Targets

| Metric | Target | Current capability |
|--------|--------|-------------------|
| RTO (restore time) | < 4 hours | Supabase restore: ~30–60 min + migration time |
| RPO (data loss window) | < 1 hour (with PITR) | PITR: seconds to minutes. Daily backup: up to 24h. |

TODO(ops): Confirm actual RTO/RPO from a completed restore test and update this table.

---

## 6. Compliance Record

After every restore test, file in `D:\vyaparwerk\compliance\backup-tests\`:
- `YYYY-MM-DD-restore-test.md` — checklist results, RTO, RPO, tester name
- Keep for minimum **8 years** (Companies Act 2013, S.128) if financial data was in scope, or **3 years** otherwise
