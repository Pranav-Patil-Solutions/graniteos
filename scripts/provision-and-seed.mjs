// One-shot: set a password on the chosen account, create the company + owner
// user row, and seed realistic stock. Run: node scripts/provision-and-seed.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---- edit these if you want different values ----
const EMAIL = "pranavpatil.work@gmail.com";
const PASSWORD = "Granite@123";
const COMPANY = "Patil Stone Co.";
const CITY = "Berlin";
const OWNER = "Pranav Patil";
// -------------------------------------------------

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

const inchPerCm = 0.393701;
const rupees = (r) => Math.round(r * 100);

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
    const lengthIn = +((b.sl + ((i % 3) * 4 - 4)) * inchPerCm).toFixed(1);
    const widthIn = +((b.sh + (i % 2) * 3) * inchPerCm).toFixed(1);
    const gross = (lengthIn * widthIn) / 144;
    out.push({
      block_id: b.id,
      company_id: b.company_id,
      bundle_no: b.label.split(" ")[0],
      slab_no: i + 1,
      length_in: lengthIn,
      width_in: widthIn,
      net_sqft: +(gross * 0.94).toFixed(2),
      thickness_mm: b.material.includes("Marble") ? 18 : i % 2 === 0 ? 20 : 18,
      finish: b.finish,
      grade: b.grade,
      godown: b.godown,
      rate_paise: rupees(b.rate + (i % 3) * 5),
      status: i === 1 ? "reserved" : i === 3 ? "sold" : "in_stock",
    });
  }
  return out;
}

async function main() {
  // 1. find the auth user
  const { data: list } = await sb.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === EMAIL);
  if (!user) throw new Error(`No auth user with email ${EMAIL}`);
  console.log("auth user:", user.id);

  // 2. set a known password + confirm email
  await sb.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
  console.log(`password set: ${PASSWORD}`);

  // 3. company + owner user row (idempotent)
  let { data: existingUser } = await sb
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let companyId;
  if (existingUser) {
    companyId = existingUser.company_id;
    console.log("user row already exists, company:", companyId);
  } else {
    const { data: comp, error: cErr } = await sb
      .from("companies")
      .insert({ name: COMPANY, city: CITY })
      .select("id")
      .single();
    if (cErr) throw cErr;
    companyId = comp.id;
    const { error: uErr } = await sb.from("users").insert({
      company_id: companyId,
      auth_user_id: user.id,
      name: OWNER,
      role: "owner",
      status: "active",
    });
    if (uErr) throw uErr;
    console.log(`company "${COMPANY}" + owner "${OWNER}" created (${companyId})`);
  }

  // 4. seed stock (clean prior seed first)
  const labels = BLOCKS.map((b) => b.label);
  await sb.from("blocks").delete().eq("company_id", companyId).in("label", labels);

  let slabCount = 0;
  for (const b of BLOCKS) {
    const { data: ins, error: bErr } = await sb
      .from("blocks")
      .insert({
        company_id: companyId,
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
    const slabs = slabsFor({ ...b, id: ins.id, company_id: companyId });
    const { error: sErr } = await sb.from("slabs").insert(slabs);
    if (sErr) throw sErr;
    slabCount += slabs.length;
  }

  console.log(`\nDone: ${BLOCKS.length} blocks, ${slabCount} slabs.`);
  console.log(`\nLOGIN → Password tab → ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
