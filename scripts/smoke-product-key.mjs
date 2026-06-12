// End-to-end smoke test of the product-key activation flow, against the LIVE
// database — the exact RPC path the deployed app uses. Creates throwaway auth
// users + a dedicated test key, exercises every branch, then deletes everything
// it created. Run: node scripts/smoke-product-key.mjs
import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const stamp = Date.now();
const PASSWORD = "Smoke!" + stamp;
const EMAIL_A = `smoke-a-${stamp}@graniteos-test.invalid`;
const EMAIL_B = `smoke-b-${stamp}@graniteos-test.invalid`;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const TEST_KEY = `GRNT-${group()}-${group()}-${group()}`;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

// Fresh anon-key client per user, same as the browser session.
async function signIn(email) {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

const setupArgs = (name, key) => ({
  p_company_name: name, p_city: "Smoketown", p_owner_name: "Smoke Tester",
  p_phone: null, p_address: null, p_gst_number: null, p_product_key: key,
});

const created = { authIds: [], companyId: null };

async function cleanup() {
  // key FIRST (its company_id FK has no cascade and would block the company
  // delete) → users rows → company → auth users
  const errs = [];
  const e1 = await admin.from("product_keys").delete().eq("key", TEST_KEY);
  if (e1.error) errs.push("key: " + e1.error.message);
  if (created.companyId) {
    const e2 = await admin.from("users").delete().eq("company_id", created.companyId);
    if (e2.error) errs.push("users: " + e2.error.message);
    const e3 = await admin.from("companies").delete().eq("id", created.companyId);
    if (e3.error) errs.push("company: " + e3.error.message);
  }
  for (const id of created.authIds) {
    const e4 = await admin.auth.admin.deleteUser(id);
    if (e4.error) errs.push("auth: " + e4.error.message);
  }
  if (errs.length) console.error("cleanup errors:", errs.join(" | "));
}

try {
  // arrange: dedicated test key + two throwaway auth users
  const { error: kErr } = await admin.from("product_keys").insert({ key: TEST_KEY, plan: "standard", note: "SMOKE TEST — auto-deleted" });
  if (kErr) throw new Error("test key insert: " + kErr.message);

  for (const email of [EMAIL_A, EMAIL_B]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    created.authIds.push(data.user.id);
  }

  const userA = await signIn(EMAIL_A);

  // 1. missing key
  let r = await userA.rpc("setup_company", setupArgs("Smoke Co", ""));
  check("missing key rejected", r.error?.message.includes("product_key_required") ?? false, r.error?.message);

  // 2. invalid key
  r = await userA.rpc("setup_company", setupArgs("Smoke Co", "GRNT-AAAA-BBBB-CCCC"));
  check("invalid key rejected", r.error?.message.includes("invalid_product_key") ?? false, r.error?.message);

  // 3. valid key — sent lowercase with messy spacing to prove normalization
  const messy = TEST_KEY.toLowerCase().replaceAll("-", " - ");
  r = await userA.rpc("setup_company", setupArgs("Smoke Co", messy));
  const userRow = r.data;
  check("company created with valid (messy-format) key", !r.error && userRow?.role === "owner", r.error?.message);
  created.companyId = userRow?.company_id ?? null;

  // 4. same account can't set up twice
  r = await userA.rpc("setup_company", setupArgs("Smoke Co 2", TEST_KEY));
  check("second setup on same account rejected", r.error?.message.includes("already_setup") ?? false, r.error?.message);

  // 5. key burned — user B can't reuse it
  const userB = await signIn(EMAIL_B);
  r = await userB.rpc("setup_company", setupArgs("Freeloader Co", TEST_KEY));
  check("used key rejected for another account", r.error?.message.includes("product_key_used") ?? false, r.error?.message);

  // 6. key row audit trail
  const { data: keyRow } = await admin.from("product_keys").select("status, company_id, used_at").eq("key", TEST_KEY).single();
  check("key marked used + linked to the company", keyRow?.status === "used" && keyRow?.company_id === created.companyId && !!keyRow?.used_at);

  // 7. RLS: anon/user role cannot read the key table
  const { data: leak } = await userB.from("product_keys").select("key");
  check("product_keys not readable by app users (RLS)", !leak || leak.length === 0);
} catch (e) {
  console.error("ABORT:", e.message || e);
  failures++;
} finally {
  await cleanup();
  // verify cleanup actually removed everything
  const { data: k } = await admin.from("product_keys").select("key").eq("key", TEST_KEY);
  const { data: c } = created.companyId
    ? await admin.from("companies").select("id").eq("id", created.companyId)
    : { data: [] };
  check("cleanup: test key + company removed", (k?.length ?? 0) === 0 && (c?.length ?? 0) === 0);
}

console.log(failures === 0 ? "\nSMOKE TEST: ALL PASS" : `\nSMOKE TEST: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
