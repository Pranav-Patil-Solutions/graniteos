// Read-only probe of the live DB for the delivery-pack migrations 0017-0021.
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

async function probeCol(table, col, label) {
  const { error } = await sb.from(table).select(col).limit(1);
  console.log(`${label}: ${error ? "MISSING — " + error.message : "APPLIED"}`);
}
async function probeTable(table, label) {
  const { error } = await sb.from(table).select("*").limit(1);
  console.log(`${label}: ${error ? "MISSING — " + error.message : "APPLIED"}`);
}

await probeTable("daybook_tasks", "0017 daybook_tasks table   ");
await probeCol("blocks", "photo_path", "0019 blocks.photo_path     ");
await probeCol("product_keys", "max_users", "0020 product_keys.max_users");
await probeTable("access_control", "0021 access_control table  ");
console.log(`\nProject ref: ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}`);
