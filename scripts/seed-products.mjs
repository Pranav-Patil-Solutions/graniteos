// Seed a few sample products for the owner's company. Service-role (bypasses RLS).
//   node scripts/seed-products.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "pranavpatil.work@gmail.com";

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
const rupees = (r) => Math.round(r * 100);

const PRODUCTS = [
  { name: "Polished Black Galaxy slab", material: "Black Galaxy", finish: "Polished", uom: "SQF", default_rate_paise: rupees(235), gst_rate: 18, hsn_code: "6802" },
  { name: "Absolute Black slab", material: "Absolute Black", finish: "Polished", uom: "SQF", default_rate_paise: rupees(320), gst_rate: 18, hsn_code: "6802" },
  { name: "Makrana White Marble slab", material: "Makrana White", finish: "Polished", uom: "SQF", default_rate_paise: rupees(145), gst_rate: 18, hsn_code: "6802" },
  { name: "Granite edge polishing", material: null, finish: null, uom: "RFT", default_rate_paise: rupees(60), gst_rate: 18, hsn_code: "9988" },
  { name: "Kitchen platform (cut-to-size)", material: null, finish: null, uom: "NOS", default_rate_paise: rupees(8500), gst_rate: 18, hsn_code: "9988" },
];

async function main() {
  const { data: list } = await sb.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === OWNER_EMAIL);
  if (!user) throw new Error(`No auth user ${OWNER_EMAIL}`);
  const { data: row } = await sb
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!row) throw new Error("No company for owner");
  const companyId = row.company_id;

  // clean prior seed by name, then insert
  const names = PRODUCTS.map((p) => p.name);
  await sb.from("products").delete().eq("company_id", companyId).in("name", names);
  const { error } = await sb
    .from("products")
    .insert(PRODUCTS.map((p) => ({ ...p, company_id: companyId })));
  if (error) throw error;

  console.log(`Seeded ${PRODUCTS.length} products for company ${companyId}`);
}
main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
