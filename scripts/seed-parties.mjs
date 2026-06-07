// Seeds sample customers + suppliers into the first company.
// Run AFTER migration 0007 is applied: node scripts/seed-parties.mjs
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
const P = (r) => Math.round(r * 100);

const PARTIES = [
  // customers (opening balance = udhaar they owe)
  { kind: "customer", name: "Verma Builders", party_type: "Builder", phone: "+91 98480 11223", city: "Hyderabad", gstin: "36ABCDV1234F1Z5", credit: 1000000, bal: 280000 },
  { kind: "customer", name: "Khan Interiors", party_type: "Interior Designer", phone: "+91 99590 44556", city: "Hyderabad", credit: 400000, bal: 190000 },
  { kind: "customer", name: "Sri Sai Constructions", party_type: "Contractor", phone: "+91 90008 77665", city: "Vijayawada", credit: 600000, bal: 0 },
  { kind: "customer", name: "Galaxy Stone Dealers", party_type: "Dealer", phone: "+91 80889 22110", city: "Bengaluru", credit: 1500000, bal: 140000 },
  { kind: "customer", name: "Reddy Architects", party_type: "Architect", phone: "+91 99123 55667", city: "Hyderabad", credit: 300000, bal: 0 },
  // suppliers (opening balance = payable we owe)
  { kind: "supplier", name: "Sri Balaji Granites", party_type: "Quarry", phone: "+91 94400 33221", city: "Ongole", gstin: "37BALAJ1234G1Z2", bal: 350000 },
  { kind: "supplier", name: "Deccan Stone Co.", party_type: "Block Supplier", phone: "+91 90300 11009", city: "Chamarajanagar", bal: 120000 },
  { kind: "supplier", name: "Marwar Marbles", party_type: "Processor", phone: "+91 94140 66778", city: "Makrana", bal: 0 },
  { kind: "supplier", name: "Patel Stone", party_type: "Block Supplier", phone: "+91 99250 88990", city: "Kishangarh", bal: 95000 },
  { kind: "supplier", name: "Anjaneya Transport", party_type: "Transporter", phone: "+91 90100 45670", city: "Hyderabad", bal: 45000 },
];

async function main() {
  const { data: companies } = await sb
    .from("companies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (!companies?.length) throw new Error("No company found.");
  const cid = companies[0].id;
  console.log("Seeding parties into:", companies[0].name);

  const names = PARTIES.map((p) => p.name);
  await sb.from("parties").delete().eq("company_id", cid).in("name", names);

  const rows = PARTIES.map((p) => ({
    company_id: cid,
    kind: p.kind,
    name: p.name,
    party_type: p.party_type,
    phone: p.phone ?? null,
    city: p.city ?? null,
    gstin: p.gstin ?? null,
    credit_limit_paise: p.credit ? P(p.credit) : 0,
    opening_balance_paise: p.bal ? P(p.bal) : 0,
  }));
  const { error } = await sb.from("parties").insert(rows);
  if (error) throw error;

  const cust = PARTIES.filter((p) => p.kind === "customer").length;
  const supp = PARTIES.length - cust;
  console.log(`Done: ${cust} customers, ${supp} suppliers.`);
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
