// Probe the live DB (service role) to see which deliverable migrations are
// applied. Read-only. Run: node scripts/check-migrations.mjs
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

// 0015: parties.notify_new_stock column
{
  const { error } = await sb.from("parties").select("notify_new_stock").limit(1);
  console.log(`0015 stock_alert_optin (parties.notify_new_stock): ${error ? "MISSING — " + error.message : "APPLIED"}`);
}

// 0016: product_keys table
{
  const { error } = await sb.from("product_keys").select("key").limit(1);
  console.log(`0016 product_keys table:                           ${error ? "MISSING — " + error.message : "APPLIED"}`);
}

// 0016: setup_company 7-arg signature. Calling with service role (no auth.uid())
// must hit 'not_authenticated' IF the new function exists; a schema-cache
// "function not found" means the old 6-arg version is still live.
{
  const { error } = await sb.rpc("setup_company", {
    p_company_name: "probe", p_city: "probe", p_owner_name: "probe",
    p_phone: null, p_address: null, p_gst_number: null, p_product_key: "PROBE",
  });
  const msg = error?.message ?? "no error (unexpected)";
  const applied = msg.includes("not_authenticated");
  console.log(`0016 setup_company(7-arg):                         ${applied ? "APPLIED" : "MISSING — " + msg}`);
}

console.log(`\nProject ref: ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}`);
