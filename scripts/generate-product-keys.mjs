// Generate product keys for GraniteOS and insert them into Supabase.
// Run: node scripts/generate-product-keys.mjs [count] [plan] [note]
// Keys are also appended to D:\vyaparwerk\graniteos-product-keys.txt (kept
// OUTSIDE the repo so they never ship in a deploy upload).
import { readFileSync, appendFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COUNT = Number(process.argv[2] || 10);
const PLAN = process.argv[3] || "standard";
const NOTE = process.argv[4] || "";
const KEYS_FILE = new URL("../../graniteos-product-keys.txt", import.meta.url);

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

// no 0/O/1/I/L — keys get read out over WhatsApp calls
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const makeKey = () => `GRNT-${group()}-${group()}-${group()}`;

const keys = [];
while (keys.length < COUNT) {
  const batch = Array.from({ length: COUNT - keys.length }, () => ({
    key: makeKey(),
    plan: PLAN,
    note: NOTE || null,
  }));
  const { error } = await sb.from("product_keys").insert(batch);
  if (error) {
    if (error.code === "23505") continue; // collision (astronomically rare) — regenerate
    console.error("INSERT FAILED:", error.message);
    console.error("Did you apply migration 0016_product_keys.sql first?");
    process.exit(1);
  }
  keys.push(...batch.map((b) => b.key));
}

const stamp = new Date().toISOString();
appendFileSync(KEYS_FILE, `\n# ${stamp} · plan=${PLAN}${NOTE ? " · " + NOTE : ""}\n${keys.join("\n")}\n`);
console.log(`Generated ${keys.length} ${PLAN} keys (saved to graniteos-product-keys.txt):\n`);
console.log(keys.join("\n"));
