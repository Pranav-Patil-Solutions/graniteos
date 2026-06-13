// Generate product keys for GraniteOS and insert them into Supabase.
//
// Usage (positional, backward-compat):
//   node scripts/generate-product-keys.mjs [count] [plan] [note]
//
// Usage (named flags, preferred):
//   node scripts/generate-product-keys.mjs --count 3 --plan standard --max-users 5 --issued-to "Ramesh Stone Mart"
//
// Keys are also appended to D:\vyaparwerk\graniteos-product-keys.txt (kept
// OUTSIDE the repo so they never ship in a deploy upload).

import { readFileSync, appendFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ── Parse arguments ────────────────────────────────────────────────────────
// Support both the old positional style and new --flag style.
function parseArgs(argv) {
  const named = {};
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
      named[key] = value;
      i += value ? 2 : 1;
    } else {
      positional.push(argv[i]);
      i++;
    }
  }
  return { named, positional };
}

const rawArgs = process.argv.slice(2);
const { named, positional } = parseArgs(rawArgs);

const COUNT = Number(named["count"] || positional[0] || 10);
const PLAN = named["plan"] || positional[1] || "standard";
const NOTE = named["note"] || positional[2] || "";
const MAX_USERS = named["max-users"] ? Number(named["max-users"]) : 3;
const ISSUED_TO = named["issued-to"] || null;

if (isNaN(COUNT) || COUNT < 1) {
  console.error("count must be a positive integer");
  process.exit(1);
}
if (isNaN(MAX_USERS) || MAX_USERS < 1) {
  console.error("--max-users must be a positive integer");
  process.exit(1);
}

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

console.log(`Generating ${COUNT} × ${PLAN} keys (max_users=${MAX_USERS}${ISSUED_TO ? `, issued_to="${ISSUED_TO}"` : ""})…`);

const keys = [];
while (keys.length < COUNT) {
  const batch = Array.from({ length: COUNT - keys.length }, () => ({
    key: makeKey(),
    plan: PLAN,
    note: NOTE || null,
    max_users: MAX_USERS,
    issued_to: ISSUED_TO,
    issued_at: ISSUED_TO ? new Date().toISOString() : null,
  }));
  const { error } = await sb.from("product_keys").insert(batch);
  if (error) {
    if (error.code === "23505") continue; // collision (astronomically rare) — regenerate
    // Graceful degradation: if max_users/issued_to columns don't exist yet, retry
    // without the new columns (migration 0020 not applied).
    if (error.code === "42703" || error.message.includes("column")) {
      console.warn("Warning: migration 0020 not applied — inserting without max_users/issued_to columns.");
      const batchLegacy = Array.from({ length: COUNT - keys.length }, () => ({
        key: makeKey(),
        plan: PLAN,
        note: NOTE || null,
      }));
      const { error: legErr } = await sb.from("product_keys").insert(batchLegacy);
      if (legErr) {
        console.error("INSERT FAILED:", legErr.message);
        process.exit(1);
      }
      keys.push(...batchLegacy.map((b) => b.key));
      continue;
    }
    console.error("INSERT FAILED:", error.message);
    console.error("Did you apply migration 0016_product_keys.sql first?");
    process.exit(1);
  }
  keys.push(...batch.map((b) => b.key));
}

const stamp = new Date().toISOString();
const metaLine = [
  `plan=${PLAN}`,
  `max_users=${MAX_USERS}`,
  NOTE ? `note=${NOTE}` : null,
  ISSUED_TO ? `issued_to="${ISSUED_TO}"` : null,
]
  .filter(Boolean)
  .join(" · ");
appendFileSync(KEYS_FILE, `\n# ${stamp} · ${metaLine}\n${keys.join("\n")}\n`);

console.log(`\nGenerated ${keys.length} key(s) (saved to graniteos-product-keys.txt):\n`);
console.log(keys.join("\n"));
if (ISSUED_TO) {
  console.log(`\nReminder: add the customer's email to BETA_ALLOWED_LOGINS before sending the key.`);
}
