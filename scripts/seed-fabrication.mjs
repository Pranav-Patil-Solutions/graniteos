// Seeds production jobs across stages. Run AFTER 0010: node scripts/seed-fabrication.mjs
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

const JOBS = [
  { title: "Verma kitchen — 6 slabs polish + edge", material: "Black Galaxy", qty: 390, machine: "Polishing Line", stage: "polishing" },
  { title: "Khan villa — Makrana flooring", material: "Makrana White Marble", qty: 520, machine: "Gangsaw", stage: "cutting" },
  { title: "Galaxy dealer — Steel Grey lot", material: "Steel Grey", qty: 260, machine: "Edge Polisher", stage: "qc" },
  { title: "Reddy office — Tan Brown counters", material: "Tan Brown", qty: 145, machine: "CNC", stage: "ready", qc: "passed" },
  { title: "Walk-in — Absolute Black vanity", material: "Absolute Black", qty: 60, machine: "Manual", stage: "queued" },
];

async function main() {
  const { data: companies } = await sb.from("companies").select("id").order("created_at").limit(1);
  const cid = companies[0].id;

  const titles = JOBS.map((j) => j.title);
  await sb.from("production_jobs").delete().eq("company_id", cid).in("title", titles);

  for (const j of JOBS) {
    const { data: no } = await sb.rpc("generate_display_number", {
      p_company_id: cid,
      p_entity_type: "production",
    });
    await sb.from("production_jobs").insert({
      company_id: cid,
      job_no: no,
      title: j.title,
      material: j.material,
      qty_sqft: j.qty,
      machine: j.machine,
      stage: j.stage,
      qc_status: j.qc ?? "pending",
    });
  }
  console.log(`Done: ${JOBS.length} production jobs across stages.`);
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
