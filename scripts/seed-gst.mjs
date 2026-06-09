// Run AFTER migration 0012 is applied. Service-role (bypasses RLS).
//   node scripts/seed-gst.mjs
// 1) Fills the company's GST identity (legal name, GSTIN, state, PAN…)
// 2) Gives a customer a real (checksum-valid) GSTIN + state
// 3) Creates one fully-compliant demo Tax Invoice with line items + tax split
// 4) Provisions a clean CLIENT login mapped to the same company
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---- client login to hand over ----
const CLIENT_EMAIL = "demo@graniteos.in";
const CLIENT_PASSWORD = "Granite2026";
const CLIENT_NAME = "GraniteOS Demo";
// account whose company holds the seeded data:
const OWNER_EMAIL = "pranavpatil.work@gmail.com";
// -----------------------------------

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

const round = Math.round;
function splitLineTax(taxable, rate, type) {
  if (!rate) return { cgst: 0, sgst: 0, igst: 0 };
  if (type === "intra") {
    const half = round((taxable * rate) / 200);
    return { cgst: half, sgst: half, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: round((taxable * rate) / 100) };
}

async function main() {
  // ── locate the company that holds the seeded data ──
  const { data: list } = await sb.auth.admin.listUsers();
  const owner = list.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) throw new Error(`No auth user ${OWNER_EMAIL}`);
  const { data: ownerRow } = await sb
    .from("users")
    .select("company_id")
    .eq("auth_user_id", owner.id)
    .maybeSingle();
  if (!ownerRow) throw new Error("Owner has no company row — run provision-and-seed.mjs first.");
  const companyId = ownerRow.company_id;
  console.log("company:", companyId);

  // ── 1) seller GST identity ──
  const { error: cErr } = await sb
    .from("companies")
    .update({
      legal_name: "Patil Stone Industries Pvt Ltd",
      gst_number: "27ABCDE1234F1Z0",
      gst_state_code: "27",
      pan: "ABCDE1234F",
      address: "Survey 88, Wagholi Stone Park, Pune",
      city: "Pune",
      phone: "+91 98220 11223",
      quote_terms_text: "50% advance, balance before dispatch. Subject to Pune jurisdiction.",
    })
    .eq("id", companyId);
  if (cErr) throw cErr;
  console.log("✓ company GST identity set");

  // ── 2) customer with a valid GSTIN ──
  const buyerName = "Krishna Builders Pvt Ltd";
  let { data: buyer } = await sb
    .from("parties")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", buyerName)
    .maybeSingle();
  const buyerFields = {
    company_id: companyId,
    kind: "customer",
    name: buyerName,
    legal_name: buyerName,
    party_type: "Builder",
    phone: "+91 98230 44556",
    city: "Pune",
    address: "Plot 14, MIDC Bhosari, Pune — 411026",
    gstin: "27AAGCK1234M1ZF",
    gst_state_code: "27",
  };
  if (buyer) {
    await sb.from("parties").update(buyerFields).eq("id", buyer.id);
  } else {
    const { data: ins, error } = await sb.from("parties").insert(buyerFields).select("id").single();
    if (error) throw error;
    buyer = ins;
  }
  console.log("✓ customer:", buyer.id);

  // ── 3) one compliant demo invoice (intra-state Maharashtra) ──
  const type = "intra";
  const raw = [
    { d: "Black Galaxy Granite Slab (polished)", hsn: "6802", sqft: 122.5, rate: 18500, rate_pct: 18 },
    { d: "Italian Marble Slab (polished)", hsn: "6802", sqft: 80, rate: 32000, rate_pct: 18 },
    { d: "Edge polishing & fabrication", hsn: "9988", sqft: 0, rate: 800000, rate_pct: 18 },
  ];
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  const items = raw.map((r) => {
    const sub = r.sqft ? round(r.sqft * r.rate) : r.rate; // lump-sum line uses rate as amount
    const tax = splitLineTax(sub, r.rate_pct, type);
    subtotal += sub; cgst += tax.cgst; sgst += tax.sgst; igst += tax.igst;
    return {
      company_id: companyId,
      slab_id: null,
      description: r.d,
      hsn_code: r.hsn,
      sqft: r.sqft,
      rate_paise: r.sqft ? r.rate : sub,
      gst_rate: r.rate_pct,
      line_subtotal_paise: sub,
      line_cgst_paise: tax.cgst,
      line_sgst_paise: tax.sgst,
      line_igst_paise: tax.igst,
      line_total_paise: sub + tax.cgst + tax.sgst + tax.igst,
    };
  });
  const taxTotal = cgst + sgst + igst;
  const rounded = round((subtotal + taxTotal) / 100) * 100;
  const roundOff = rounded - (subtotal + taxTotal);

  // fresh demo invoice each run (clean the previous demo)
  await sb.from("invoices").delete().eq("company_id", companyId).eq("invoice_no", "INV/2026-27/0007");
  const { data: inv, error: iErr } = await sb
    .from("invoices")
    .insert({
      company_id: companyId,
      customer_id: buyer.id,
      invoice_no: "INV/2026-27/0007",
      subtotal_paise: subtotal,
      gst_paise: taxTotal,
      total_paise: rounded,
      place_of_supply: "27",
      supply_type: type,
      cgst_paise: cgst,
      sgst_paise: sgst,
      igst_paise: igst,
      round_off_paise: roundOff,
      status: "unpaid",
    })
    .select("id")
    .single();
  if (iErr) throw iErr;
  const { error: itErr } = await sb
    .from("invoice_items")
    .insert(items.map((it) => ({ ...it, invoice_id: inv.id })));
  if (itErr) throw itErr;
  console.log(`✓ demo Tax Invoice INV/2026-27/0007 → ${inv.id} (₹${(rounded / 100).toLocaleString("en-IN")})`);

  // ── 4) client login ──
  let client = list.users.find((u) => u.email === CLIENT_EMAIL);
  if (!client) {
    const { data, error } = await sb.auth.admin.createUser({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    client = data.user;
  } else {
    await sb.auth.admin.updateUserById(client.id, { password: CLIENT_PASSWORD, email_confirm: true });
  }
  const { data: existing } = await sb
    .from("users")
    .select("id")
    .eq("auth_user_id", client.id)
    .maybeSingle();
  if (!existing) {
    const { error } = await sb.from("users").insert({
      company_id: companyId,
      auth_user_id: client.id,
      name: CLIENT_NAME,
      role: "owner",
      status: "active",
    });
    if (error) throw error;
  } else {
    await sb.from("users").update({ company_id: companyId, status: "active" }).eq("id", existing.id);
  }

  console.log(`\n✓ CLIENT LOGIN → Password tab → ${CLIENT_EMAIL} / ${CLIENT_PASSWORD}`);
  console.log(`  Tax Invoice → /invoices/${inv.id}/tax-invoice`);
  console.log(`\nAdd this email to BETA_ALLOWED_LOGINS so the gate lets them in.`);
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
