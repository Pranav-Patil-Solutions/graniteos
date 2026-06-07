// Seeds realistic granite/marble blocks + slabs into the first company.
// Run: node scripts/seed-stock.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const inchPerCm = 0.393701;
const rupees = (r) => Math.round(r * 100);

// material, color, origin, supplier, block dims (cm), tonnes, cost ₹, rate ₹/sqft,
// finish, grade, slab count, slab size (cm L×H), godown, yield tuned via slab count.
const BLOCKS = [
  { label: "BL-101 Black Galaxy", material: "Black Galaxy", color: "Black w/ gold flecks", origin: "Ongole, AP", supplier: "Sri Balaji Granites", L: 300, W: 185, H: 175, t: 26.2, cost: 410000, rate: 235, finish: "Polished", grade: "Premium", n: 7, sl: 310, sh: 195, godown: "Godown A" },
  { label: "BL-102 Absolute Black", material: "Absolute Black", color: "Jet black", origin: "Chamarajanagar, KA", supplier: "Deccan Stone Co.", L: 290, W: 180, H: 170, t: 24.0, cost: 520000, rate: 320, finish: "Polished", grade: "Premium", n: 6, sl: 295, sh: 190, godown: "Godown A" },
  { label: "BL-103 Tan Brown", material: "Tan Brown", color: "Brown-maroon", origin: "Karimnagar, TS", supplier: "Patel Stone", L: 280, W: 175, H: 165, t: 21.4, cost: 230000, rate: 125, finish: "Polished", grade: "Standard", n: 6, sl: 300, sh: 182, godown: "Godown B" },
  { label: "BL-104 Steel Grey", material: "Steel Grey", color: "Grey", origin: "Kuppam, AP", supplier: "Patel Stone", L: 270, W: 170, H: 160, t: 19.8, cost: 165000, rate: 95, finish: "Polished", grade: "Commercial", n: 5, sl: 280, sh: 178, godown: "Godown B" },
  { label: "BL-105 Makrana White", material: "Makrana White Marble", color: "White", origin: "Makrana, RJ", supplier: "Marwar Marbles", L: 260, W: 165, H: 150, t: 17.4, cost: 240000, rate: 145, finish: "Polished", grade: "Premium", n: 7, sl: 300, sh: 190, godown: "Godown C" },
  { label: "BL-106 Rajnagar Green", material: "Rajnagar Green Marble", color: "Green", origin: "Udaipur, RJ", supplier: "Marwar Marbles", L: 250, W: 160, H: 150, t: 16.2, cost: 150000, rate: 90, finish: "Honed", grade: "Standard", n: 5, sl: 270, sh: 172, godown: "Godown C" },
];

function slabsFor(b) {
  const out = [];
  for (let i = 0; i < b.n; i++) {
    // small deterministic variation per slab
    const dL = (i % 3) * 4 - 4; // -4,0,4
    const dH = (i % 2) * 3;
    const lengthIn = +((b.sl + dL) * inchPerCm).toFixed(1);
    const widthIn = +((b.sh + dH) * inchPerCm).toFixed(1);
    const grossSqft = (lengthIn * widthIn) / 144;
    const thickness = b.material.includes("Marble") ? 18 : i % 2 === 0 ? 20 : 18;
    // status: mostly in stock, a couple reserved/sold
    const status = i === 1 ? "reserved" : i === 3 ? "sold" : "in_stock";
    out.push({
      block_id: b.id,
      company_id: b.company_id,
      bundle_no: b.label.split(" ")[0], // e.g. BL-101
      slab_no: i + 1,
      length_in: lengthIn,
      width_in: widthIn,
      net_sqft: +(grossSqft * 0.94).toFixed(2),
      thickness_mm: thickness,
      finish: b.finish,
      grade: b.grade,
      godown: b.godown,
      rate_paise: rupees(b.rate + (i % 3) * 5),
      status,
    });
  }
  return out;
}

async function main() {
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (cErr) throw cErr;
  if (!companies?.length) throw new Error("No company found — finish company setup first.");
  const company = companies[0];
  console.log(`Seeding into company: ${company.name} (${company.id})`);

  // clean previous seed (only our labels), then re-insert
  const labels = BLOCKS.map((b) => b.label);
  await supabase.from("blocks").delete().eq("company_id", company.id).in("label", labels);

  let blockCount = 0;
  let slabCount = 0;
  for (const b of BLOCKS) {
    const { data: ins, error: bErr } = await supabase
      .from("blocks")
      .insert({
        company_id: company.id,
        label: b.label,
        material: b.material,
        color: b.color,
        length_cm: b.L,
        width_cm: b.W,
        height_cm: b.H,
        weight_tonnes: b.t,
        origin: b.origin,
        supplier: b.supplier,
        cost_paise: rupees(b.cost),
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    blockCount++;
    const slabs = slabsFor({ ...b, id: ins.id, company_id: company.id });
    const { error: sErr } = await supabase.from("slabs").insert(slabs);
    if (sErr) throw sErr;
    slabCount += slabs.length;
    const cbm = (b.L * b.W * b.H) / 1_000_000;
    const totalSqft = slabs.reduce((n, s) => n + (s.length_in * s.width_in) / 144, 0);
    console.log(
      `  ${b.label}: ${slabs.length} slabs, ${cbm.toFixed(2)} CBM, recovery ${(totalSqft / cbm).toFixed(0)} sq-ft/CBM`,
    );
  }

  console.log(`\nDone: ${blockCount} blocks, ${slabCount} slabs inserted.`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message || e);
  process.exit(1);
});
