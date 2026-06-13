// Provision a new customer account in GraniteOS.
//
// Creates a Supabase auth user with email + password (email already confirmed),
// then prints the credentials and a reminder to add the email to BETA_ALLOWED_LOGINS.
//
// Usage:
//   node scripts/provision-customer.mjs \
//     --email customer@example.com \
//     --password "Stone@2025" \
//     --name "Ramesh Stone Mart" \
//     --phone "+91 99999 00000"
//
// The customer then goes to https://graniteos.vercel.app, logs in with the
// printed credentials, and redeems their product key on first login.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Parse --flag arguments ─────────────────────────────────────────────────
function parseFlags(argv) {
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
      flags[key] = value;
      i += value ? 2 : 1;
    } else {
      i++;
    }
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));

const EMAIL = flags["email"];
const PASSWORD = flags["password"];
const NAME = flags["name"];
const PHONE = flags["phone"] || null;

if (!EMAIL || !PASSWORD || !NAME) {
  console.error("Usage: node scripts/provision-customer.mjs --email <e> --password <p> --name <n> [--phone <p>]");
  process.exit(1);
}

// Basic validation
if (PASSWORD.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

// ── Load env ───────────────────────────────────────────────────────────────
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

async function main() {
  console.log(`\nProvisioning customer: ${NAME} <${EMAIL}>`);

  // Check if user already exists
  const { data: existing } = await sb.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === EMAIL);

  let userId;
  if (existingUser) {
    // Update password + confirm email on existing user
    const { data: updated, error: upErr } = await sb.auth.admin.updateUserById(existingUser.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (upErr) throw upErr;
    userId = existingUser.id;
    console.log(`Auth user already existed — password updated. (${userId})`);
  } else {
    // Create a fresh auth user with email + password, email pre-confirmed.
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: NAME,
        phone: PHONE,
      },
    });
    if (createErr) throw createErr;
    userId = created.user.id;
    console.log(`Auth user created. (${userId})`);
  }

  // Print credentials summary
  console.log(`
┌─────────────────────────────────────────────────────────┐
│  Customer credentials — send these securely             │
├─────────────────────────────────────────────────────────┤
│  Name    : ${NAME.padEnd(43)}│
│  Email   : ${EMAIL.padEnd(43)}│
│  Password: ${PASSWORD.padEnd(43)}│
│  Phone   : ${(PHONE ?? "—").padEnd(43)}│
│  App URL : https://graniteos.vercel.app                 │
└─────────────────────────────────────────────────────────┘

NEXT STEPS (manual, required before the customer can log in):
  1. Open src/lib/beta-allowlist.ts (or the Vercel env BETA_ALLOWED_LOGINS)
     and add:  ${EMAIL}
  2. Send the customer their product key + the credentials above.
  3. The customer visits ${env.NEXT_PUBLIC_APP_URL || "https://graniteos.vercel.app"},
     logs in with email + password, then redeems their key on the Setup screen.
`);
}

main().catch((e) => {
  console.error("\nFailed:", e.message || e);
  process.exit(1);
});
