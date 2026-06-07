// Seeds an invoice (from the seeded order) + a partial payment.
// Run AFTER migration 0009: node scripts/seed-money.mjs
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

async function main() {
  const { data: companies } = await sb.from("companies").select("id").order("created_at").limit(1);
  const cid = companies[0].id;

  const { data: order } = await sb
    .from("orders")
    .select("id, customer_id, total_paise, quote_id")
    .eq("company_id", cid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order) throw new Error("No order found — seed quotes first.");

  // clear prior invoice for this order
  await sb.from("invoices").delete().eq("order_id", order.id);

  let subtotal = 0,
    gst = 0;
  if (order.quote_id) {
    const { data: q } = await sb
      .from("quotes")
      .select("subtotal_paise, gst_paise")
      .eq("id", order.quote_id)
      .single();
    subtotal = Number(q.subtotal_paise);
    gst = Number(q.gst_paise);
  }

  const { data: no } = await sb.rpc("generate_display_number", {
    p_company_id: cid,
    p_entity_type: "invoice",
  });

  const { data: inv } = await sb
    .from("invoices")
    .insert({
      company_id: cid,
      customer_id: order.customer_id,
      order_id: order.id,
      invoice_no: no,
      subtotal_paise: subtotal,
      gst_paise: gst,
      total_paise: Number(order.total_paise),
      status: "partial",
    })
    .select("id")
    .single();

  // partial payment ~60%
  const pay = Math.round(Number(order.total_paise) * 0.6);
  await sb.from("payments").insert({
    company_id: cid,
    customer_id: order.customer_id,
    invoice_id: inv.id,
    amount_paise: pay,
    mode: "upi",
    reference: "UPI/seed",
  });

  console.log(
    `Invoice ${no} for ₹${Math.round(Number(order.total_paise) / 100).toLocaleString("en-IN")} created; ₹${Math.round(pay / 100).toLocaleString("en-IN")} paid (partial).`,
  );
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
