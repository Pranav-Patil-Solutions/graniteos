// Reset (remove) all 2FA / MFA factors for one user — the lock-out safety valve.
//
// Use when a customer enabled two-factor sign-in and then lost their authenticator
// app / phone. This deletes their TOTP factors so they can sign in with just their
// password again (and re-enroll a new authenticator).
//
// Usage:
//   node scripts/mfa-reset.mjs --email customer@example.com
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (admin only — never ship to clients).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function parseFlags(argv) {
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
      flags[key] = value;
      i += value ? 2 : 1;
    } else i++;
  }
  return flags;
}

const EMAIL = parseFlags(process.argv.slice(2))["email"];
if (!EMAIL) {
  console.error("Usage: node scripts/mfa-reset.mjs --email <email>");
  process.exit(1);
}

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
  const { data: list } = await sb.auth.admin.listUsers();
  const user = list?.users?.find((u) => u.email === EMAIL);
  if (!user) {
    console.error(`No user found with email ${EMAIL}`);
    process.exit(1);
  }

  const { data: factorData, error: fErr } = await sb.auth.admin.mfa.listFactors({
    userId: user.id,
  });
  if (fErr) throw fErr;

  const factors = factorData?.factors ?? [];
  if (factors.length === 0) {
    console.log(`${EMAIL} has no 2FA factors — nothing to reset.`);
    return;
  }

  for (const f of factors) {
    const { error } = await sb.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    if (error) throw error;
    console.log(`Removed factor ${f.id} (${f.factor_type}, ${f.status})`);
  }
  console.log(`\n✓ 2FA reset for ${EMAIL}. They can now sign in with just their password.`);
}

main().catch((e) => {
  console.error("\nFailed:", e.message || e);
  process.exit(1);
});
