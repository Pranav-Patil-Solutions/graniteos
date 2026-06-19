═══════════════════════════════════════════
GRANITEOS — CERTIFICATION READINESS REPORT
Generated: 2026-06-14
Scope: full app (live on localhost:3000/:3001) + Supabase data layer (migrations 0001–0024)
Codebase: D:\vyaparwerk\graniteos (Next.js 15 App Router + Supabase Postgres + phone-OTP/MFA + RBAC;
          multi-tenant granite/marble SaaS for India; AI Studio = Groq + Google Gemini )
Method: 4 parallel domain audits (DPDP/GDPR, OWASP/AppSec, Supabase-RLS, WCAG) + CLI ground-truth
═══════════════════════════════════════════

EXECUTIVE SUMMARY
GraniteOS is a genuinely mature build — real RLS with FORCE on every business table, server-side
Zod on every action, MFA, RBAC, strong security headers (HSTS/CSP/nosniff/poweredByHeader:false/no
source maps), parameterised queries, and even a self-isolation test harness — so it is far closer to
certifiable than a typical pre-launch product. BUT the audit found two CRITICAL database-layer
privilege holes that must be fixed before any real-customer launch: (1) a non-owner user can promote
themselves to OWNER via the public PostgREST API because the users_update RLS WITH CHECK doesn't
constrain the role column, and (2) every business-table write policy is gated on company only, not
role — so any teammate can mutate/delete invoices, payments and supplier_payments directly via the
API, bypassing the app's RBAC entirely. Recommended first action: ship the two one-migration RLS
fixes + add requireSession() to the unauthenticated paid Gemini endpoint + gate /dev/ui (together <1
day), then close the India-legal placeholders (Grievance Officer name, legal entity/address) which are
DPDP-mandatory. PCI is out of scope (no card data — UPI/cash/bank/cheque accounting only).

SCORECARD
┌─────────────────┬──────────┬──────────────────────────┬───────────────┐
│ Standard        │ Score    │ Status                   │ Time to ready │
├─────────────────┼──────────┼──────────────────────────┼───────────────┤
│ DPDP / GDPR     │ 13.5/20  │ PARTIALLY COMPLIANT (DPDP)│ ~2–3 weeks    │
│ SOC 2 Type II   │ 10/25    │ NOT READY (strong base)  │ ~6–9 months*  │
│ ISO 27001       │ 3/12     │ NOT READY                │ ~9–12 months* │
│ PCI DSS         │ N/A      │ OUT OF SCOPE             │ N/A           │
│ WCAG 2.1 AA     │ 8/20     │ NON-COMPLIANT            │ ~2 weeks      │
│ OWASP Top 10    │ 5/10     │ PARTIALLY READY          │ ~1–2 weeks    │
└─────────────────┴──────────┴──────────────────────────┴───────────────┘
* India-facing → DPDP Act 2023 is the GOVERNING privacy law (not GDPR). GDPR applies only if EU data
  principals use the public catalog/AI tools — and there it is currently UNMET (no GDPR basis for the
  unauthenticated photo→Gemini flow). SOC 2 / ISO clocks include controls work + a 3–6 month
  observation window; the technical foundation is already strong, so the gap is governance + the fixes
  below, not a rebuild.

───────────────────────────────────────────
CRITICAL BLOCKERS (fix before real-customer launch)
───────────────────────────────────────────
1. SELF-ROLE ESCALATION via RLS. supabase/migrations/0003_foundation_rls.sql:21–23 — users_update
   WITH CHECK validates only company_id, not the role column. Any non-owner can run
   `UPDATE public.users SET role='owner' WHERE auth_user_id=auth.uid()` through PostgREST with their
   own session JWT, then unlock owner-only RPCs/policies. FIX: add a role-immutability clause to
   WITH CHECK (non-owner's role must equal their current role). ~0.5h. [OWASP A01 / SOC2 CC6.8]
2. INTRA-COMPANY WRITE POLICIES LACK ROLE CHECKS. All *_all policies (0004,0007–0010,0012,0017,0023)
   are `company_id = current_company_id()` with no role predicate. Any company member — regardless of
   sales/store/fabrication role — can INSERT/UPDATE/DELETE invoices, payments, invoice_items,
   supplier_payments, slabs, etc. directly via the API; the app-layer RBAC (permissions.ts/can()) is
   bypassed. FIX: split SELECT vs write on sensitive financial tables; gate writes on
   current_user_role(). ~3h. [OWASP A01 / SOC2 CC6.3 least-privilege]
3. UNAUTHENTICATED PAID AI ENDPOINT. src/actions/visualize.ts:38 — visualizeStone() has no
   requireSession(); it is reachable from the public /catalog pages. Anonymous callers burn Google
   Gemini credits AND send room photos (which may contain people's faces) to Google with no auth and
   no consent notice — and input.material/input.surface are prompt-injected with no allowlist. FIX:
   add `await requireSession()` (0.5h) + allowlist the prompt fields (1h). [OWASP A01/A03 + DPDP]
4. /dev/ui PUBLICLY ACCESSIBLE IN PROD (HTTP 200 on both ports). src/lib/supabase/middleware.ts:13
   lists "/dev" in PUBLIC_PREFIXES. FIX: remove it + `if (process.env.NODE_ENV!=='production') notFound()`
   in the page. ~0.5h. [OWASP A01/A05]
5. PUBLIC STORAGE BUCKET, NO STORAGE RLS. supabase/migrations/0019_block_photos.sql:10–11 creates
   `stone-photos` as public with zero storage policies. Any party with a photo URL (path =
   {company_id}/block-{id}) can download any company's slab photos directly from the CDN, bypassing
   the app. FIX: make bucket private + storage RLS scoped to the caller's company + serve via
   short-lived signed URLs. ~4h. [SOC2 C1 / ISO A.9]
6. MFA HMAC SECRET FALLS BACK TO service_role THEN A HARDCODED LITERAL. src/lib/mfa/cookie.ts:15–18 —
   `MFA_COOKIE_SECRET || SUPABASE_SERVICE_ROLE_KEY || "graniteos-dev-mfa-secret"`. If the service_role
   key leaks, MFA-bypass cookies can be forged; any deploy missing the env var has trivially forgeable
   MFA. FIX: require MFA_COOKIE_SECRET; crash at startup in prod if absent; drop the fallbacks. ~0.5h.
   [OWASP A02/A07]
7. xlsx FROM CDN TARBALL (unauditable, known CVE). package.json:33 pins
   `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` — not on npm, not covered by
   npm audit, CVE-2023-30533 (prototype pollution); a cdn.sheetjs.com compromise serves malicious
   code to every user. (Parsing is client-side, which contains the pollution blast radius, but the
   supply-chain risk stands.) FIX: switch to an npm-published, auditable lib (exceljs) or pin+verify a
   hash. ~3h. [OWASP A06/A08]
8. DPDP MANDATORY PLACEHOLDERS UNFILLED. src/app/privacy/page.tsx:110 — Grievance Officer name is
   `[Grievance Officer name]` (DPDP S.13 requires a NAMED officer); legal entity name + registered
   address are "available on request" not published (DPDP S.8). Terms §11 jurisdiction is a
   placeholder. FIX: fill + lawyer sign-off. ~1h + legal. [DPDP]

───────────────────────────────────────────
HIGH PRIORITY (fix within 30 days)
───────────────────────────────────────────
1. MFA not mandatory for OWNER — highest-privilege role can run at single-factor forever. ~1h. [A04/A07]
2. No app-layer OTP rate limiting (brute-force/enumeration rely on Supabase defaults). ~2h. [A04]
3. No security-event audit log (auth failures, OTP sends, MFA enroll, role changes, access-control
   changes) — also blocks CERT-In 180-day log requirement. ~6h. [A09 / CERT-In]
4. No CERT-In incident-response procedure (6-hour breach notification) documented anywhere. ~2h. [DPDP/CERT-In]
5. Public catalog routes (/catalog/[id], /s/[id]) use service-role and expose full in-stock inventory +
   warehouse location + company phone to anyone with a company/slab UUID. Add a catalog_enabled flag or
   share-token gate; drop godown/bundle_no from the public payload. ~2h. [SOC2 C1]
6. accept_invite() has no explicit double-join guard (relies on a UNIQUE constraint; a future migration
   could turn this into a company-hop). Add an early-exit. ~0.25h. [data-layer]
7. No self-service data-deletion / export (DPDP S.12 requires withdrawal/erasure be as easy as consent;
   Terms §10 promises export — neither built). ~8h. [DPDP]
8. notify_new_stock DEFAULT TRUE (migration 0015) silently opted-in every existing customer for
   WhatsApp marketing — flip to FALSE + re-collect consent. ~2h. [DPDP S.6]
9. No error.tsx / global-error.tsx; Server Actions return raw Supabase error.message to the client
   (can leak table/constraint names). Add boundaries + sanitise messages. ~1.5h. [A05]
10. WCAG P0s: `maximumScale:1` blocks pinch-zoom (layout.tsx:33); ShareCatalog modal has no
    role=dialog/focus-trap/Esc; SlabViewer 3D auto-rotates with no pause / reduced-motion; no
    skip-to-content link. ~5h. [WCAG 1.4.4/2.1.2/2.2.2/2.4.1]

───────────────────────────────────────────
MEDIUM PRIORITY (fix within 90 days)
───────────────────────────────────────────
1. Nonce-based CSP to remove 'unsafe-inline' (next.config.ts script-src). ~4h. [A05]
2. Column-level encryption/tokenisation for PAN (companies.pan) — plaintext today (platform-AES-256
   covers at-rest; needed for ISO/SOC2 hardening). ~4h. [ISO A.10]
3. Confirm + DOCUMENT Supabase backup/PITR tier (no config in repo) and run a restore test; store the
   record in D:\vyaparwerk\compliance. ~1h. [SOC2 A1 / ISO A.12.3]
4. Add FORCE ROW LEVEL SECURITY to access_control (0021) and product_keys (0016) for consistency. ~0.5h.
5. generate_display_number() cross-tenant check inspects the JWT role claim string — prefer auth.role().
   ~0.5h. [defense-in-depth]
6. WCAG contrast fixes: text-graphite-500 used as text (1.25:1!), text-slate-500 small text (~4.4:1),
   text-gold/60 nav labels (~3.6:1); plus ~10 missing aria-labels on icon-only buttons, catalog
   search/sort labels, chart/3D/QR text alternatives, input focus rings, table <th> scope, login error
   role=alert. ~11h total. [WCAG 1.4.3/1.3.1/4.1.2/2.4.7]
7. Patch the 2 moderate npm-audit items (next ← postcss CSS-stringify XSS). ~0.5h. [A06]
8. Write the governance baseline (infosec policy, data-asset register, supplier/DPA register, access-
   control policy doc, change-management doc, business-continuity/DR plan) — prerequisites for SOC2 & ISO.

───────────────────────────────────────────
PER-STANDARD DETAIL
───────────────────────────────────────────

DPDP / GDPR — 13.5/20 — PARTIALLY COMPLIANT (DPDP)
STRONG: HSTS/CSP, NO third-party tracking/analytics anywhere, sub-processors named (Supabase/Vercel/
Groq/Google/WhatsApp/UPI), data-principal rights enumerated incl. DPB escalation, cross-border
(Supabase Frankfurt) disclosed, no PII in console logs, consent-withdrawal language present.
GAPS: Grievance Officer placeholder (DPDP S.13 — mandatory), legal entity/address not published,
no CERT-In audit log / 180-day retention / 6-hour IR, unauthenticated room-photo→Gemini flow,
notify_new_stock default-on, no self-service deletion/export, signup uses implied-consent notice
(no checkbox). GDPR specifically UNMET for the public AI tools if EU visitors use them.

SOC 2 Type II — 10/25 — NOT READY (foundation strong, close)
Security(CC6): PASS secrets-in-env/server-only, no hardcoded keys (greps clean bar the dev MFA
fallback), OTP-based (no stored passwords); PARTIAL auth-protection (visualize+/dev/ui holes),
MFA (not owner-mandatory + HMAC fallback), anon-key blast radius (widened by the RLS escalation
bug); FAIL OTP rate limiting. Availability(A1): PARTIAL error handling (raw messages, no error.tsx)
+ loading states; FAIL health checks + uptime/status page. Confidentiality(C1): PASS cross-tenant
row isolation (RLS SOUND); PARTIAL intra-company write isolation (BROKEN) + public storage bucket;
backups UNVERIFIED. Processing Integrity(PI1): PASS server-side Zod + positive financial validation;
PARTIAL audit trail (creates logged, no update/delete history, no security events). Privacy(P1–8):
PARTIAL (= DPDP above).

ISO 27001 — 3/12 — NOT READY
PRESENT: communications security (HTTPS/HSTS/CSP), supplier relationships (processors disclosed),
access control IMPLEMENTED (RBAC + RLS) — though the two CRITICAL flaws keep it from "effective".
PARTIAL: asset management (schema/policy lists data, no formal register), cryptography (platform
AES-256 + pgcrypto tokens; PAN plaintext), physical security (inherited, undocumented), operations
security (git + migrations + tests + go-live runbook, no formal change-mgmt), system acquisition
(npm audit ok but xlsx CDN unauditable), compliance (privacy policy exists, DPDP partial).
ABSENT: information-security policy (formal ISMS), incident management, business continuity/DR.

PCI DSS — N/A — OUT OF SCOPE
No card data is processed/stored/transmitted; no payment gateway (Razorpay/Stripe/PayU/etc.). Payment
modes are cash/upi/bank/cheque/other — accounting records of payments received. The stored UPI ID is
the merchant's own collection handle (for QR generation), not cardholder data. IF a card gateway is
ever added, use a hosted/redirect integration to stay in SAQ-A minimal scope.

WCAG 2.1 AA — 8/20 — NON-COMPLIANT
axe-core (Chrome headless) on public pages: 34 violations, mostly region/landmark + meta-viewport
(maximumScale) + a few heading/contrast. The dark theme's PRIMARY text contrast is excellent (~8–18:1);
failures are on small muted/gold text and one mis-used surface token as text (1.25:1). PASS: heading
order, primary-form labels, color-not-sole-indicator, primary contrast, reduced-motion (CSS+JS),
lang=en. FAIL: zoom blocked, modal a11y (dialog/focus-trap/Esc), 3D auto-rotate pause, skip link,
icon-button names, catalog form labels, chart/3D text alternatives, login error announcement,
small-text contrast.

OWASP Top 10 — 5/10 — PARTIALLY READY (3 CRITICAL must-fix)
PASS: A02 Crypto (HSTS, server-only secrets, no source maps — but MFA-key fallback weakens it),
A07 core OTP flow (single-use, session-bound MFA, logout invalidation), A10 SSRF (no user-URL fetch).
PARTIAL: A03 Injection (parameterised queries PASS; prompt injection on unauth endpoint FAILs),
A05 Misconfig (great headers; but /dev/ui public, no error.tsx, unsafe-inline). FAIL: A01 Access
Control (RLS role-escalation + unauth visualize + /dev/ui), A04 Insecure Design (no OTP rate limit,
MFA optional for owner), A06 Vulnerable Components (xlsx CDN tarball CVE), A08 Integrity (xlsx no
hash pin), A09 Logging (no security-event log, CERT-In unmet). CRITICAL vulns: RLS self-escalation,
unauthenticated paid AI endpoint, /dev/ui exposure (+ public storage bucket). No RCE/SQLi found.

───────────────────────────────────────────
RECOMMENDED CERTIFICATION / COMPLIANCE ORDER
───────────────────────────────────────────
0. FIX THE CRITICAL SECURITY HOLES FIRST (not a certificate — a prerequisite for all of them and for
   not being breached): 2 RLS migrations + requireSession on visualize + gate /dev/ui + MFA secret +
   private storage bucket + xlsx swap. ~1.5 days of work. Extend the existing verify-isolation harness
   to cover role-escalation and role-gated writes so this can't regress.
1. DPDP + CERT-In (India legal baseline) — FIRST cert-track item. Mandatory to operate in India with
   real customer data: fill the Grievance Officer + entity placeholders, add the security audit log +
   180-day retention + a 6-hour incident-response doc, build self-service deletion/export, flip the
   marketing opt-in default. Cost: ~25h dev + €1–3k lawyer. Time: ~2–3 weeks.
2. WCAG 2.1 AA — accessibility + trust; mostly a token/colour + ARIA + modal pass. Cost: internal
   ~16–17h. Time: ~2 weeks.
3. SOC 2 Type II — pursue once B2B customers ask; the foundation (RLS, MFA, RBAC, validation) is
   already strong, so this is governance + the fixes + observation. Cost: ~$7–25k/yr tooling +
   ~$10–20k auditor. Time: ~6–9 months (controls + 3–6 month observation window).
4. ISO 27001 — with/after SOC 2 for enterprise/EU clients; ~80% control overlap with SOC 2. Cost:
   ~€15–50k incl. certification body. Time: ~9–12 months.
PCI DSS — only if a card payment gateway is introduced.

───────────────────────────────────────────
TOOLS TO USE
───────────────────────────────────────────
- Compliance automation (NOW justified — this is a real product): Vanta or Drata for SOC 2 + ISO 27001
  + DPDP mapping from one control set; native Vercel/GitHub/Google/Supabase integrations. Vanta = best
  startup onboarding; Drata = strongest multi-framework. Begin the SOC2 track in parallel with the
  observation-window clock once the CRITICALs are fixed.
- Now (high value, low cost): @axe-core/cli + Lighthouse in CI, npm audit in CI, Upstash Ratelimit
  (OTP/forms), a Postgres security_events audit table + Vercel Log Drains → Axiom (CERT-In 180-day +
  SOC2/ISO logging), a lawyer for the DPDP policy/placeholders. Keep using the in-repo verify-isolation
  harness — extend it to role escalation.
- File the post-fix compliance record in D:\vyaparwerk\compliance per the project's deploy-compliance rule.

───────────────────────────────────────────
FULL ISSUE LOG (standard · severity · fix · hours)
───────────────────────────────────────────
RLS/A01   · CRITICAL · users_update WITH CHECK doesn't constrain role → self-escalate to owner · 0.5
RLS/A01   · CRITICAL · business-table write policies lack role check → any member mutates invoices/payments · 3.0
A01/DPDP  · CRITICAL · visualizeStone unauthenticated — paid Gemini + room photos, no auth/consent · 0.5
A03       · CRITICAL · visualize prompt fields (material/surface) injected, no allowlist · 1.0
A01/A05   · CRITICAL · /dev/ui public in prod (HTTP 200) · 0.5
SOC2 C1   · CRITICAL · stone-photos bucket public, no storage RLS — any company's photos downloadable · 4.0
A02/A07   · CRITICAL · MFA HMAC secret falls back to service_role/hardcoded — forgeable bypass · 0.5
A06/A08   · CRITICAL · xlsx from CDN tarball (CVE-2023-30533, unauditable) — swap/pin · 3.0
DPDP      · CRITICAL · Grievance Officer + legal entity/address placeholders unfilled · 1.0
A04/A07   · HIGH     · MFA not mandatory for OWNER · 1.0
A04       · HIGH     · No app-layer OTP rate limiting · 2.0
A09       · HIGH     · No security-event audit log (CERT-In 180d) · 6.0
DPDP      · HIGH     · No CERT-In incident-response (6h) doc · 2.0
SOC2 C1   · HIGH     · Public catalog exposes inventory/warehouse/phone by UUID · 2.0
RLS       · HIGH     · accept_invite() no explicit double-join guard · 0.25
DPDP      · HIGH     · No self-service data deletion/export · 8.0
DPDP      · HIGH     · notify_new_stock DEFAULT TRUE (auto marketing opt-in) · 2.0
A05       · HIGH     · No error.tsx; raw Supabase error.message returned to client · 1.5
WCAG 1.4.4· HIGH     · maximumScale:1 blocks pinch-zoom · 0.25
WCAG 2.1.2· HIGH     · ShareCatalog modal no role=dialog/focus-trap/Esc · 2.0
WCAG 2.2.2· HIGH     · SlabViewer 3D auto-rotate no pause/reduced-motion · 1.0
WCAG 2.4.1· HIGH     · No skip-to-content link · 1.0
A05       · MED      · CSP unsafe-inline — move to nonce CSP · 4.0
ISO A.10  · MED      · PAN stored plaintext — column-level encryption · 4.0
SOC2/ISO  · MED      · Confirm + document Supabase backup/PITR + restore test · 1.0
RLS       · MED      · FORCE RLS missing on access_control + product_keys · 0.5
RLS       · MED      · generate_display_number cross-tenant check uses JWT claim, prefer auth.role() · 0.5
WCAG 1.4.3· MED      · text-graphite-500 as text (1.25:1), slate-500 small (4.4:1), gold/60 (3.6:1) · 3.0
WCAG 4.1.2· MED      · ~10 icon-only buttons / catalog inputs missing aria-label/label · 2.0
WCAG 1.1.1· MED      · chart/3D/QR no text alternative · 1.5
WCAG 2.4.7· MED      · inputs outline-none w/ weak focus replacement · 1.0
WCAG 1.3.1· MED      · table <th> missing scope; login error no role=alert · 1.0
A06       · MED      · 2 moderate npm-audit (next←postcss) · 0.5
SOC2/ISO  · MED      · Governance docs (infosec policy, asset/supplier register, change-mgmt, BC/DR) · (governance)
───────────────────────────────────────────
Pre-launch CRITICAL fixes: ~1.5 days. DPDP+CERT-In legal baseline: ~2–3 weeks. WCAG: ~2 weeks.
SOC 2 / ISO 27001: 6–12 months (foundation strong; gap is governance + observation window). PCI: out of scope.
═══════════════════════════════════════════
