// Seeds a sample quote (+ confirmed order) into the first company.
// Run AFTER migration 0008: node scripts/seed-quotes.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function dn(cid, entity) {
  const { data } = await sb.rpc("generate_display_number", { p_company_id: cid, p_entity_type: entity });
  return data ?? null;
}

async function main() {
  const { data: companies } = await sb.from("companies").select("id,name").order("created_at").limit(1);
  const cid = companies[0].id;
  const { data: customer } = await sb
    .from("parties").select("id,name").eq("company_id", cid).eq("kind", "customer").limit(1).single();
  const { data: slabs } = await sb
    .from("slabs").select("id, sqft, rate_paise, blocks(material)")
    .eq("company_id", cid).eq("status", "in_stock").gt("rate_paise", 0).limit(3);
  if (!customer || !slabs?.length) throw new Error("Need a customer + priced slabs (seed stock + parties first).");

  // clear prior sample quotes for this customer
  await sb.from("quotes").delete().eq("company_id", cid).eq("customer_id", customer.id);

  const items = slabs.map((s) => {
    const sqft = Number(s.sqft);
    const rate = Number(s.rate_paise);
    const sub = Math.round(sqft * rate);
    const gst = Math.round(sub * 0.18);
    return {
      company_id: cid, slab_id: s.id,
      description: `Polished ${s.blocks?.material ?? "stone"} slab`,
      sqft, rate_paise: rate, gst_rate: 18,
      line_subtotal_paise: sub, line_gst_paise: gst, line_total_paise: sub + gst,
    };
  });
  const subtotal = items.reduce((n, i) => n + i.line_subtotal_paise, 0);
  const gst = items.reduce((n, i) => n + i.line_gst_paise, 0);

  const quoteNo = await dn(cid, "quote");
  const { data: q } = await sb.from("quotes").insert({
    company_id: cid, customer_id: customer.id, quote_no: quoteNo, status: "sent",
    notes: "50% advance, balance before dispatch.",
    subtotal_paise: subtotal, gst_paise: gst, total_paise: subtotal + gst,
  }).select("id").single();
  await sb.from("quote_items").insert(items.map((i) => ({ ...i, quote_id: q.id })));

  // confirm it as an order
  const orderNo = await dn(cid, "order");
  await sb.from("orders").insert({
    company_id: cid, quote_id: q.id, customer_id: customer.id,
    order_no: orderNo, status: "confirmed", total_paise: subtotal + gst,
  });
  await sb.from("quotes").update({ status: "accepted" }).eq("id", q.id);

  console.log(`Quote ${quoteNo} (${items.length} items) for ${customer.name} → ₹${Math.round((subtotal+gst)/100).toLocaleString("en-IN")}, confirmed as order ${orderNo}.`);
}

main().catch((e) => { console.error("Failed:", e.message || e); process.exit(1); });
