# GraniteOS — GST Compliance & Tax Invoice (Design Spec)

**Date:** 2026-06-08
**Status:** Phase A design approved-in-progress; Phases B–D scoped, not yet specced
**Author:** Pranav + Claude

---

## Goal

Make GraniteOS quotes and invoices compliant with Indian GST law (CGST Act / Rule 46 tax-invoice rules), and add GSTIN validation/verification with address auto-fill. End-goal also includes e-invoice (IRN), e-way bill, and GSTR-1 export.

## Phasing (build order)

| Phase | Scope | Depends on | External dependency |
|---|---|---|---|
| **A — Foundation + Tax Invoice** (this spec) | State/place-of-supply, HSN per line, CGST/SGST/IGST split, round-off, compliant Tax Invoice doc + PDF, GSTIN validation/verification + address auto-fill | — | None (Layer-2 verify is pluggable, degrades gracefully) |
| **B — e-Invoice (IRN + signed QR)** | Push invoice JSON to IRP, store IRN + signed QR, cancel window | A | GSP/ASP credentials |
| **C — e-Way Bill** | Generate EWB for goods movement >₹50k | A, B | GSP credentials |
| **D — GSTR-1 export** | Aggregate invoices → GSTR-1 JSON (B2B/B2C/HSN summary) | A | Optional GSP / offline upload |

**GSP decision:** deferred. Phase A ships against a pluggable `GstVerifyProvider` interface. B/C/D require Pranav to choose a GSP (ClearTax / Masters India = full stack; Surepass / Signzy = verification-focused) and supply sandbox credentials.

---

## Phase A — Detailed Design

### 1. Schema — new migration `0012_gst_compliance.sql`

**`companies`** (seller) — add:
- `legal_name text` — registered name (vs trade `name`)
- `pan text`
- `gst_state_code text` — 2-digit GST state code (e.g. "27")

**`parties`** (customer) — add:
- `gst_state_code text` — auto-derived from GSTIN first 2 digits, editable
- `gstin_status text` — 'active' | 'cancelled' | 'suspended' | 'unverified' (default 'unverified')
- `gstin_verified_at timestamptz`

**`quote_items`** — add:
- `hsn_code text` (default smart-filled in app, not DB)
- `line_cgst_paise bigint not null default 0`
- `line_sgst_paise bigint not null default 0`
- `line_igst_paise bigint not null default 0`
- (keep existing `line_gst_paise` as the total of the three for backward compat, OR drop later — keep for now)

**`quotes`** — add:
- `place_of_supply text` (state code)
- `supply_type text check (supply_type in ('intra','inter'))`
- `cgst_paise bigint default 0`, `sgst_paise bigint default 0`, `igst_paise bigint default 0`
- `round_off_paise bigint default 0`
- `reverse_charge boolean not null default false`

**New table `invoice_items`** (mirrors quote_items; invoices currently have no line table, but Rule 46 requires per-line HSN + tax on the tax invoice):
- `id, company_id, invoice_id, slab_id, description, sqft, rate_paise, hsn_code, line_subtotal_paise, line_cgst_paise, line_sgst_paise, line_igst_paise, line_total_paise, created_at`
- RLS: company-scoped `for all using/with check (company_id = current_company_id())`, force RLS — mirror existing tables.

**`invoices`** — add same as quotes: `place_of_supply`, `supply_type`, `cgst_paise`, `sgst_paise`, `igst_paise`, `round_off_paise`, `reverse_charge`.

All `add column if not exists`; new table with RLS enabled + forced + company policy, matching existing migration style.

### 2. Tax logic — `src/lib/gst.ts`

- `validateGstin(gstin): { valid: boolean; reason?: string }` — regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` **plus** the official mod-36 check-digit algorithm.
- `parseStateFromGstin(gstin): string | null` — first 2 chars.
- `supplyType(sellerStateCode, placeOfSupplyCode): 'intra' | 'inter'`.
- `splitLineTax(taxablePaise, gstRate, supplyType)` → `{ cgst, sgst, igst }` in paise. Intra: cgst = sgst = round(taxable*rate/2/100); inter: igst = round(taxable*rate/100).
- `computeRoundOff(totalPaise)` → nearest rupee; returns `round_off_paise` (signed) and `rounded_total_paise`.
- `amountInWords(paise)` → Indian system ("Rupees Two Lakh Thirty-Four Thousand … Only").
- HSN smart defaults (quick-picks in UI): `6802` worked granite/marble slabs & tiles @ 18% (default); `2516` raw granite blocks @ 5%; `2515` marble blocks @ 5%; SAC `9988` fabrication/job-work @ 18%.
- **FY numbering:** invoice serials must be consecutive & unique per financial year (Apr–Mar). Adjust `generate_display_number` / `display_number_sequences` usage so the `year` for invoices = FY start year (e.g. 2026-04 → 2027-03 = FY 2026). Quote/order numbering can stay as-is.

### 3. GSTIN verification — `src/lib/gst-verify.ts`

- `interface GstVerifyProvider { verify(gstin): Promise<GstinRecord> }`
- `GstinRecord = { legalName, tradeName, status, address, city, stateCode, taxpayerType, registeredOn }`
- Default export: a `NoopProvider` (when no creds) → returns format-validation only. Real provider wired later via env (`GST_VERIFY_PROVIDER`, `GST_VERIFY_API_KEY`).
- Server action `verifyGstin(gstin)` in `src/actions/gst.ts` → returns record or graceful error. Never blocks save.

### 4. UI

- **Company settings:** GST state code (dropdown of 37 codes), legal name, PAN. GSTIN field with live format check.
- **Customer (party) form:** GSTIN field → live format/checksum validation → "Verify" button → on success auto-fills legal name, address, city, state code; shows status badge. **Cancelled/Suspended → red badge but save/bill still allowed (warn, not block).**
- **QuoteBuilder:** per-line HSN field (pre-filled 6802, quick-pick chips); live CGST/SGST/IGST breakup that flips intra↔inter based on customer's state vs company state; round-off line; grand total.
- **Tax Invoice document** (web view + print/PDF, new component, e.g. `src/components/money/TaxInvoiceDoc.tsx`):
  - Title "TAX INVOICE"; supplier legal name, address, GSTIN, state name+code; recipient name, address, GSTIN, state name+code; place of supply; invoice no + date; reverse-charge: No.
  - Line table: #, description, HSN, qty/sqft, rate, taxable value, CGST rate+amt / SGST rate+amt **or** IGST rate+amt.
  - HSN summary block (per HSN: taxable, CGST, SGST, IGST).
  - Totals: taxable, total tax, round-off, grand total; amount in words; signature block ("For <Company>", authorised signatory).

### 5. Testing — `src/lib/gst.test.ts` (vitest)

- `validateGstin`: valid GSTIN passes; bad checksum fails; wrong length/charset fails.
- `splitLineTax`: intra splits equally; inter all to IGST; multi-rate lines.
- `computeRoundOff`: .49 down, .50 up, exact rupee = 0, negative round-off.
- `amountInWords`: lakhs, crores, paise, zero.
- `supplyType`: same state = intra; different = inter.

---

## Out of scope for Phase A
- e-invoice IRN/QR, e-way bill, GSTR-1 (Phases B–D).
- Composition scheme, reverse-charge purchase entries, TDS/TCS.
- Multi-GSTIN per company (single GSTIN assumed for now).

## Open items
- GSP provider choice (blocks B/C/D).
- Confirm whether quotes should also carry place-of-supply or infer from customer at invoice time (current design: store on both; quote infers from customer, invoice locks it).
