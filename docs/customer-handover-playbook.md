# GraniteOS Customer Handover Playbook

Repeatable process for taking a stone business from "interested" to "live on GraniteOS."
Grounded in what the product actually ships today (2026-06-12): self-serve setup wizard,
Excel bulk import, 4 roles, GST tax invoices, fabrication board, WhatsApp-native flows.

## Stage 0 — One-time prep (before the FIRST paying customer)
- [ ] Fill legal placeholders in /terms and /privacy: registered entity, place of business, Grievance Officer name. Lawyer sign-off.
- [ ] Decide the price. One number. (No payment gateway yet → collect via UPI/bank transfer against a proper GST invoice from YOUR entity.)
- [ ] WhatsApp Business number set up as the support channel.
- [ ] Add customer's phone(s) to BETA_ALLOWED_LOGINS until production SMS provider is wired.

## Stage 1 — Demo (30 min)
Show the wedge, not features:
1. Recovery-Rate Radar — "which blocks are eating your margin"
2. Udhaar Radar — "who owes you money + one-tap WhatsApp reminder"
3. Slab Passport — 3D slab link they can WhatsApp to a buyer
Close: "Send me your customer/stock Excel files — you'll be live by <date>."

## Stage 2 — Handover day (~2 hours)
**Get their data files BEFORE the meeting — this is the #1 delay.**
1. Customer signs up via the setup wizard (company, GSTIN, city) → their own isolated tenant.
2. Excel bulk import: customers, suppliers, products, blocks, slabs.
3. Add team members with roles: owner / finance / operations / fabrication_supervisor.
4. **Acceptance test together:** one real quote → order → tax invoice with THEIR GSTIN.
   Verify HSN codes + CGST/SGST/IGST split with their accountant's expectation.
   This one check builds more trust than any feature tour.

## Stage 3 — Training (90 min, by role)
| Role | Teach |
|---|---|
| Owner | Analytics dashboard, Udhaar Radar, stock value |
| Finance | Invoices, payment recording (cash/UPI/bank/cheque), receivables |
| Operations | Stock (blocks→slabs), quotes, catalog share |
| Fabrication supervisor | Mobile job board (queued→cutting→polishing→QC→dispatched) on THEIR phone |

## Stage 4 — Go-live checklist
- [ ] First real invoice issued and checked by their accountant
- [ ] WhatsApp reminder sent to one real udhaar customer
- [ ] Support channel confirmed (they know whom to WhatsApp)
- [ ] Their owner can open analytics on their own phone

## Stage 5 — First 30 days
- Weekly WhatsApp check-in (5 min).
- Watch usage: are they creating invoices weekly? Usage = retention.
- Fix friction within 48h while goodwill is high.
- At day 30: ask the happy customer for a testimonial + 2 referrals.

## Known limits to be honest about with customers (as of 2026-06-12)
- No e-invoicing (IRN/QR) yet — fine below ₹5Cr turnover threshold.
- No credit/debit notes, no procurement (PO/GRN), no Tally export yet.
- Payments into the app are recorded manually (no gateway reconciliation).
