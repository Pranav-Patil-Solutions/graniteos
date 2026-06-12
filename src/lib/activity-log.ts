// Activity log — flattens records from every business table into one
// reverse-chronological, fully-timestamped feed. Pure + tested; the page
// (app/(app)/logs/page.tsx) fetches the rows (RLS scopes them to the company)
// and hands them here.

import { formatINR } from "@/lib/money";

export type LogKind = "party" | "invoice" | "payment" | "order" | "quote" | "slab";

export type LogRow = {
  at: string;
  kind: LogKind;
  label: string;
  desc: string;
};

type PartyRow = { id: string; kind: string; name: string; created_at: string };
type InvoiceRow = { invoice_no: string | null; customer_id: string | null; total_paise: number; created_at: string };
type PaymentRow = { customer_id: string | null; amount_paise: number; mode: string; created_at: string };
type OrderRow = { order_no: string | null; status: string; created_at: string };
type QuoteRow = { quote_no: string | null; customer_id: string | null; total_paise: number; created_at: string };
type SlabRow = { sqft: number; created_at: string };

export type ActivitySources = {
  parties?: PartyRow[];
  invoices?: InvoiceRow[];
  payments?: PaymentRow[];
  orders?: OrderRow[];
  quotes?: QuoteRow[];
  slabs?: SlabRow[];
};

/** One reverse-chronological feed across every source. `partyName` resolves a
 *  customer/supplier id to a display name (the page passes a lookup map). */
export function buildActivityLog(
  src: ActivitySources,
  partyName: (id: string | null) => string,
): LogRow[] {
  const rows: LogRow[] = [];

  for (const p of src.parties ?? []) {
    const who = p.kind === "supplier" ? "Supplier" : "Customer";
    rows.push({ at: p.created_at, kind: "party", label: who, desc: `${who} added — ${p.name}` });
  }
  for (const i of src.invoices ?? []) {
    const no = i.invoice_no ? ` ${i.invoice_no}` : "";
    rows.push({
      at: i.created_at, kind: "invoice", label: "Invoice",
      desc: `Invoice${no} — ${formatINR(i.total_paise)} · ${partyName(i.customer_id)}`,
    });
  }
  for (const p of src.payments ?? []) {
    rows.push({
      at: p.created_at, kind: "payment", label: "Payment",
      desc: `Payment ${formatINR(p.amount_paise)} (${p.mode}) — ${partyName(p.customer_id)}`,
    });
  }
  for (const o of src.orders ?? []) {
    const no = o.order_no ? ` ${o.order_no}` : "";
    rows.push({
      at: o.created_at, kind: "order", label: "Order",
      desc: `Order${no} — ${o.status.replace(/_/g, " ")}`,
    });
  }
  for (const q of src.quotes ?? []) {
    const no = q.quote_no ? ` ${q.quote_no}` : "";
    rows.push({
      at: q.created_at, kind: "quote", label: "Quote",
      desc: `Quote${no} — ${formatINR(q.total_paise)} · ${partyName(q.customer_id)}`,
    });
  }
  for (const s of src.slabs ?? []) {
    rows.push({ at: s.created_at, kind: "slab", label: "Slab", desc: `Slab added — ${s.sqft} sq.ft` });
  }

  return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
