# Slab Bazaar — Idle-Slab Exchange (cross-tenant)

**Date:** 2026-06-08
**Status:** Design — awaiting review
**Slice:** Standalone feature slice (depends on inventory + Idle-Burn Radar)

## Problem

Fabricators sit on idle, slow-moving slabs (dead capital). The Idle-Burn Radar
already *detects* this. There is nowhere to *act* on it. Meanwhile a yard two
districts over may want exactly that material. GraniteOS can connect surplus to
demand across yards — a network-effect moat no single-tenant tool has.

## Goal

A cross-tenant listing board where a yard lists an idle slab, other yards browse
and enquire, the deal closes over WhatsApp, and the seller marks it sold. A
classifieds board, **not** a payment marketplace.

## Non-goals (YAGNI / explicit out-of-scope)

- **No in-app payments, ever.** The moment money flows through the app, GraniteOS
  becomes an RBI "payment aggregator" + assumes marketplace GST/TCS duties.
  Buyer and seller transact directly over WhatsApp. (Standing compliance rule.)
- No shipping/logistics, escrow, or dispute resolution.
- No seller ratings in v1 (trust = GST-verified badge only; ratings are a later slice).
- No map/geo search in v1 (city text filter only).

## The core security decision

A marketplace requires cross-company visibility, which contradicts the current
isolation model (`company_id = current_company_id()` on every table).

**Resolution: do NOT relax `slabs` RLS.** Create a separate `listings` table that
holds only deliberately-public, denormalized fields copied from a slab at list
time. `slabs` stays fully tenant-isolated. A listing leak can only ever expose
the fields we chose to publish — never the underlying inventory, cost, or
customer data.

### Fields published in a listing (the entire public surface)
photo URL, material, length/width/sqft, thickness, asking rate (₹/sqft), **city
only** (never the exact godown/address), days-idle, seller display name, seller
GST-verified flag, a WhatsApp contact number.

### Fields NEVER published
block/cost (`cost_paise`), exact `godown`, customer/party data, internal status
history, anything from `slabs` directly.

## Data model

```sql
-- 0013_slab_bazaar.sql

create table public.listings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  slab_id         uuid not null references public.slabs(id) on delete cascade,
  -- denormalized public snapshot (NOT a live join to slabs):
  material        text not null,
  length_in       numeric(7,2) not null,
  width_in        numeric(7,2) not null,
  sqft            numeric(10,2) not null,
  thickness_mm    numeric(6,1),
  rate_paise      bigint not null check (rate_paise >= 0),  -- asking ₹/sqft
  photo_url       text,
  city            text not null,
  seller_name     text not null,
  seller_phone    text not null,          -- revealed on enquiry / WhatsApp deeplink
  seller_gst_verified boolean not null default false,
  status          text not null default 'active'
                    check (status in ('active','reserved','sold','withdrawn')),
  listed_at       timestamptz not null default now(),
  unique (slab_id)                         -- one live listing per slab
);

create table public.listing_enquiries (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  buyer_company_id uuid not null references public.companies(id) on delete cascade,
  seller_company_id uuid not null references public.companies(id) on delete cascade,
  message          text check (char_length(message) <= 500),
  created_at       timestamptz not null default now()
);

create index idx_listings_status   on public.listings(status);
create index idx_listings_material on public.listings(material);
create index idx_listings_company  on public.listings(company_id);
create index idx_enq_seller on public.listing_enquiries(seller_company_id);
create index idx_enq_buyer  on public.listing_enquiries(buyer_company_id);
```

## RLS (mirrors the foundation pattern: SELECT policies + RPC-only writes)

```sql
alter table public.listings enable row level security;
alter table public.listings force row level security;
alter table public.listing_enquiries enable row level security;
alter table public.listing_enquiries force row level security;

-- listings: ANY authenticated company can read ACTIVE listings (deliberate, scoped break).
-- Owner can additionally see their own non-active listings.
create policy listings_select_active on public.listings for select
  using (status = 'active' or company_id = public.current_company_id());

-- No insert/update/delete policies — all writes go through SECURITY DEFINER RPCs.

-- enquiries: visible only to the two parties involved.
create policy enquiries_select on public.listing_enquiries for select
  using (seller_company_id = public.current_company_id()
         or buyer_company_id = public.current_company_id());
```

### RPCs (SECURITY DEFINER, validate `current_company_id()` ownership)
- `list_slab(slab_id, rate_paise, city)` — owner-only; snapshots public fields from
  the slab into `listings`. Slab stays `in_stock`; the listing carries its own
  status (see open question 1). Rejects if slab not owned or already listed.
- `withdraw_listing(listing_id)` — owner-only; `status='withdrawn'`.
- `mark_listing_sold(listing_id)` — owner-only; `status='sold'`; optionally set slab `status='sold'`.
- `enquire_listing(listing_id, message)` — buyer; inserts enquiry, returns seller WhatsApp deeplink. Rejects self-enquiry (buyer == seller company).

### Auto-deactivation
When a slab becomes `sold`/`reserved` in inventory, its active listing must flip to
`reserved`/`sold`. Implement via a trigger on `slabs` update, or inside the existing
`setSlabStatus` action. Keeps the board from showing stale slabs.

## UI

New nav item **"Bazaar"** in `AppShell`. Route group `(app)/bazaar/`.

- **Browse tab** (`/bazaar`): grid of active listing cards. Filters: material,
  max ₹/sqft, city, min/max sqft. Card = photo, material, "18 sqft · 18mm",
  "₹95/sqft", city, "idle 47d", seller name + ✓GST badge, **[Enquire on WhatsApp]**.
- **My Listings tab** (`/bazaar/mine`): your listings with status + enquiry count;
  withdraw / mark-sold actions.
- **List action**: surfaced on the Idle-Burn Radar (dashboard) and on each idle
  slab in `/inventory` — "List on Bazaar" → small modal (asking rate, city) → `list_slab`.

### Reuse
`SlabPhoto`, `ShareWhatsApp` (enquiry deeplink), `gst-verify` (seller badge),
existing card/glass styling, `money.ts` paise formatting.

## Data flow

Idle slab detected (Radar) → owner taps **List on Bazaar** → `list_slab` RPC
snapshots public fields → appears in every yard's **Browse** → buyer taps
**Enquire** → `enquire_listing` records enquiry + opens WhatsApp to seller →
they close offline → seller **marks sold** → listing + slab update.

## Error handling
- List a slab you don't own / already listed → RPC raises, UI toasts.
- Enquire on your own listing → blocked.
- Enquire on a now-inactive listing → "This slab is no longer available."
- Missing seller phone → block listing with "Add a contact number in Settings first."

## Privacy & compliance
- Public surface strictly limited to the listed fields above; **city, not address**.
- Seller phone revealed only at enquiry time (acceptable: it is the contact channel).
- Listing-board only; no money through GraniteOS. Add a one-line ToS note that
  GraniteOS only connects buyers and sellers and is not party to any transaction.

## Testing
- **RLS tests** (pgTAP, `supabase/tests/`): company B *can* read company A's active
  listing; company B *cannot* read A's `withdrawn`/`sold` listing; B cannot read an
  enquiry it is not party to; B cannot write A's listing directly (no policy).
- **RPC tests**: list/withdraw/sold ownership enforcement; self-enquiry blocked;
  duplicate-listing blocked.
- **Unit**: snapshot mapping (slab → public fields, cost/godown excluded).
- **E2E (Playwright)**: two-company flow — A lists, B browses + enquires, A marks sold,
  listing leaves B's browse.

## Open questions for review
1. On listing, keep slab `in_stock` (recommended) or auto-move to `reserved`?
2. Reveal seller phone on the card, or only after an enquiry is logged (recommended)?
3. Snapshot fields at list time (recommended, leak-proof) or live-join when allowed?
