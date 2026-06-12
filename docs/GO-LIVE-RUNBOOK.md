# GraniteOS Go-Live Runbook (vendor copy)

The exact, ordered steps to deliver GraniteOS to a paying client. Everything
here is scripted except the four human-only decisions at the bottom.
Companion doc: `customer-handover-playbook.md` (the sales/training flow).

---

## Part A — One-time platform activation (do once, ~10 minutes)

### A1. Apply the product-key migration  ← DO THIS FIRST
The app code now requires a product key at company setup. Until this SQL is
applied, a **new** signup will fail (existing companies are untouched — setup
only ever runs once per account, and logins are still beta-allowlisted).

1. Open **Supabase dashboard → your project → SQL Editor → New query**
2. Paste the entire contents of `supabase/migrations/0016_product_keys.sql`
3. Run. Expect "Success. No rows returned."

What it does: creates the `product_keys` table (RLS on, service-role only)
and replaces `setup_company()` so it atomically redeems an unused key —
one key activates exactly one company, double-redeem is row-locked out.

### A2. Generate product keys
```
node scripts/generate-product-keys.mjs 5 standard "first client batch"
```
- Inserts 5 unused keys into the DB and appends them to
  `D:\vyaparwerk\graniteos-product-keys.txt` (outside the repo on purpose).
- Key format `GRNT-XXXX-XXXX-XXXX` — no 0/O/1/I/L, so it survives being
  read out over a WhatsApp call. Dashes/case don't matter at redemption.
- Fails with a clear message if you skipped A1.

### A3. Mint the client's licence (per deployment)
The app refuses to run without a valid Ed25519-signed `GRANITEOS_LICENSE`.
Your signing key lives in `license-keys/private.pem` (gitignored — never ship).

```
node scripts/gen-license.mjs --company "Sharma Stone Industries" --days 365 --plan standard
```
- Prints the token + writes `license.json` (also gitignored).
- Optional `--domain client-domain.in` locks it to their host.
- On a **shared** deployment (today's model — one Vercel app, tenant
  isolation via RLS) the existing prod licence already covers the app;
  mint per-client licences when a client gets their **own** deployment.
- Renewal = re-run the command, update the env var. Expired licence stops
  the app, so calendar the expiry date.

---

## Part B — Per-client delivery (repeat for each client)

| # | Step | Command / where |
|---|------|-----------------|
| 1 | Add the client's login phone/email to the beta allowlist | Vercel env `BETA_ALLOWED_LOGINS` (comma-separated), then redeploy |
| 2 | Hand them ONE unused product key | from `graniteos-product-keys.txt` |
| 3 | They sign up at the app → **Set up your company** asks for the key | self-serve; key typos get friendly errors |
| 4 | Bulk-import their Excel (customers/stock) | in-app `/import` |
| 5 | Add team members + roles | in-app `/team` |
| 6 | Acceptance test: one real quote → order → tax invoice with THEIR GSTIN, checked against their accountant | playbook Stage 2.4 |
| 7 | Mark the key in your txt file with the client name | manual, 10 seconds |

### Demo company (for the sales demo, not for the client's tenant)
`scripts/provision-and-seed.mjs` provisions a demo company with realistic
stock (6 blocks / 36 slabs) on YOUR account so the demo shows a living app.
The client's real tenant always starts empty. Edit the constants at the top
of the script before running. Additional seeders: `seed-parties.mjs`,
`seed-quotes.mjs`, `seed-money.mjs`, `seed-fabrication.mjs`, `seed-gst.mjs`,
`seed-products.mjs`.

---

## Part C — Human-only items (no script can decide these)

1. **Legal placeholders** — `/terms` §11 (registered place of business) and
   `/privacy` §10 (Grievance Officer name). Edit
   `src/app/terms/page.tsx` + `src/app/privacy/page.tsx`, get lawyer sign-off.
2. **Price** — one number; invoice from your entity, collect via UPI/bank.
3. **Support channel** — a WhatsApp Business number the client can reach.
4. **SMS provider** — until wired, logins stay allowlist-gated (Part B step 1
   is the workaround; it works fine for the first clients).

## Known limits to state honestly (unchanged)
No e-invoicing IRN/QR (fine under ₹5Cr turnover), no credit/debit notes,
no PO/GRN procurement, no Tally export, payments recorded manually.

## Compliance reminder
Every prod deploy auto-writes a record to `D:\vyaparwerk\compliance`
(Companies Act 8y / CERT-In 180d / DPDP / GST retention) via the
PostToolUse hook — verify the record exists after each client go-live.
