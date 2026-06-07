# GraniteOS — Quotes ENHANCEMENTS (captured 2026-06-07, NOT built yet)

> Pranav's requirements for the **existing** Quotes feature (`/quotes`, `/quotes/new`,
> `/quotes/[id]`, migration 0008; live at https://graniteos.vercel.app). **Do NOT build yet** —
> captured for the next quotes work session.

## 1. Masked material (customer-facing vs internal) — NEW
Today each quote line item is tied directly to a slab (the real material is visible). Change so each
line has TWO material fields:
- **`public_label`** — what the CUSTOMER sees on the quote. **Default = "Random polish granite"**
  (generic). Editable per line.
- **`actual_material` / slab** — the REAL slab being delivered, selected internally by the owner.
  **Hidden from the customer** on the quote view / PDF / share / WhatsApp. Still links to
  stock/inventory for dispatch & costing.

Effect: customer sees only "Random polish granite"; internally GraniteOS knows the true slab.
Likely needs a migration adding `public_label` (default text) to the quote line items table, and the
customer-facing quote render must use `public_label` only.

## 2. Quote hash / reference — NEW
- Quotes already have a `QT-` display number (`generate_display_number` RPC).
- ADD a **unique hash** alongside it, e.g. `QT-0042 · #A3F9C1`, printed on the quote.
- Purpose: tracking + verification (match a shared/printed quote back to the record; could back a
  public verify link like the existing `/s/[id]` slab passports).

## 3. Proper quote format (professional layout) — IMPROVE
Customer-facing quote / PDF should be a clean professional document:
- **Header:** company name, logo, address, **GSTIN**, phone (from Settings).
- **Customer block:** name, contact, GSTIN if any.
- **Meta:** quote number + hash, date, **validity** (e.g. 15 days).
- **Line items:** `public_label` (masked), area/sqft, rate, amount. Actual slab hidden.
- **Totals:** subtotal, **multi-rate GST breakdown**, grand total in **₹ (paise-accurate)**.
- **Footer:** terms, payment terms (UPI link already supported), authorised signature.
- Mobile-first to build; **shareable/printable** PDF + WhatsApp (WhatsApp→UPI already exists).

## Open questions (resolve before building)
- Is `public_label` default the fixed string "Random polish granite", or a per-company Setting?
- Hash format/length, and should it power a public verify link?
- Which roles may see/select the real `actual_material` — owner only, or sales_manager too?
