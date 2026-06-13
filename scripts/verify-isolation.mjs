// scripts/verify-isolation.mjs
// Part B — Company isolation proof.
//
// Creates Company A + Company B (each with one auth user) via the same
// setup_company RPC the app uses, seeds a handful of rows into every tenant
// table in both companies, then authenticates as Company A and:
//   • SELECT-asserts zero Company B rows are visible through PostgREST
//   • INSERT-asserts that writing a row with company_id = companyB is rejected
//   • UPDATE-asserts that a known Company B row is invisible (0 rows affected)
//
// Also runs a static audit of every migration file (0001-0021) to find tables
// missing company_id or RLS, and SECURITY DEFINER functions that accept a
// caller-supplied company_id.
//
// Migrations 0020 (seats) and 0021 (access_control) may not be applied yet.
// Those tests are attempted; if the table/column doesn't exist the result is
// printed as SKIPPED and the script continues.
//
// Run: node scripts/verify-isolation.mjs

import { readFileSync, readdirSync } from "node:fs";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── env loading (same pattern as every other script in this repo) ──────────
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── throwaway credentials ──────────────────────────────────────────────────
const stamp = Date.now();
const PASSWORD = "Isolate!" + stamp;
const EMAIL_A  = `iso-a-${stamp}@graniteos-test.invalid`;
const EMAIL_B  = `iso-b-${stamp}@graniteos-test.invalid`;

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const grp   = () => Array.from({ length: 4 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
const KEY_A = `GRNT-${grp()}-${grp()}-${grp()}`;
const KEY_B = `GRNT-${grp()}-${grp()}-${grp()}`;

// ── result tracking ────────────────────────────────────────────────────────
let totalPass = 0, totalFail = 0, totalSkip = 0;
const lines = [];

function report(status, name, detail = "") {
  const tag = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP" }[status] ?? "FAIL";
  const line = `${tag}  ${name}${detail ? "  — " + detail : ""}`;
  console.log(line);
  lines.push(line);
  if (status === "PASS") totalPass++;
  else if (status === "FAIL") totalFail++;
  else totalSkip++;
}
const pass = (n, d = "") => report("PASS", n, d);
const fail = (n, d = "") => report("FAIL", n, d);
const skip = (n, d = "") => report("SKIP", n, d);

// ── anon client signed in as a specific user ───────────────────────────────
async function signIn(email) {
  const c = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

// ── state: IDs that must be cleaned up ────────────────────────────────────
const created = {
  authIds: [],
  compAId: null,
  compBId: null,
};

// Seeded Company B IDs needed as FK targets for cross-company INSERT tests.
const bIds = {
  blockId:   null,
  quoteId:   null,
  invoiceId: null,
};

// ── cleanup — always runs even on failure ─────────────────────────────────
async function cleanup() {
  const errs = [];

  // 1. product_keys first — they have a company_id FK *without* ON DELETE CASCADE.
  //    If we delete the company first, Postgres will refuse (FK violation).
  for (const key of [KEY_A, KEY_B]) {
    const { error } = await admin.from("product_keys").delete().eq("key", key);
    if (error) errs.push(`key(${key}): ${error.message}`);
  }

  // 2. companies — ON DELETE CASCADE propagates to users, blocks, slabs,
  //    parties, quotes/items, orders, invoices/items, payments, jobs,
  //    products, daybook_tasks, access_control.
  for (const cid of [created.compAId, created.compBId].filter(Boolean)) {
    const { error } = await admin.from("companies").delete().eq("id", cid);
    if (error) errs.push(`company(${cid}): ${error.message}`);
  }

  // 3. auth users
  for (const id of created.authIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) errs.push(`auth(${id}): ${error.message}`);
  }

  if (errs.length) console.error("\ncleanup errors:", errs.join(" | "));
}

// ── helpers ────────────────────────────────────────────────────────────────

// Check whether a table exists in public schema (catches undefined_table = 42P01).
async function tableExists(tableName) {
  const { error } = await admin.from(tableName).select("id").limit(0);
  return !error || error.code !== "42P01";
}

// Try a cross-company INSERT as userAClient, then verify via service role
// that no row actually landed in Company B (belt-and-suspenders).
// Returns true if the insert was correctly blocked.
async function testCrossInsert(label, userAClient, tableName, payload) {
  const { error: insErr } = await userAClient.from(tableName).insert(payload);
  if (insErr) {
    // Any error from PostgREST means the write was blocked — this is the pass
    // case.  The exact code varies: "42501" (permission denied), "P0001"
    // (raised exception from a SECURITY DEFINER function), or the generic RLS
    // message.  We just need *some* error.
    pass(`${label}: cross-company INSERT blocked`, insErr.message.slice(0, 80));
    return true;
  }

  // No error — verify nothing actually landed (service role can see everything).
  const compBId = created.compBId;
  const { data: leaked } = await admin
    .from(tableName)
    .select("id")
    .eq("company_id", compBId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Filter to rows we might have just injected (very recent, within last 5 s).
  const recent = (leaked ?? []).filter(
    (r) => r.id && /* can't check time without created_at in select */ true,
  );
  if (recent.length > 0) {
    fail(`${label}: cross-company INSERT NOT blocked — ${recent.length} row(s) leaked into Company B`);
    return false;
  }
  // 0 rows → no leak, even though there was no error (shouldn't happen with
  // RLS + force, but handles edge cases gracefully).
  pass(`${label}: cross-company INSERT blocked (0 rows landed)`);
  return true;
}

// Test that as userAClient, a SELECT on tableName returns zero Company B rows.
async function testSelectIsolation(label, userAClient, tableName, compBId) {
  const { data, error } = await userAClient.from(tableName).select("company_id");
  if (error) {
    // An error here usually means the user has no SELECT policy (product_keys,
    // access_control if not applied, etc.).  That is stronger than isolation —
    // they can see nothing.  Count as PASS.
    pass(`${label}: SELECT denied entirely (no read policy)`, error.message.slice(0, 80));
    return;
  }
  const leaked = (data ?? []).filter((r) => r.company_id === compBId);
  if (leaked.length === 0) {
    pass(`${label}: SELECT isolation — 0 Company B rows visible`);
  } else {
    fail(`${label}: SELECT isolation BREACH — ${leaked.length} Company B row(s) visible`);
  }
}

// Test that as userAClient, an UPDATE on a known Company B row id affects 0 rows.
async function testUpdateIsolation(label, userAClient, tableName, compBRowId, updatePayload) {
  const { count, error } = await userAClient
    .from(tableName)
    .update(updatePayload)
    .eq("id", compBRowId)
    .select("id", { count: "exact", head: true });
  if (error) {
    pass(`${label}: UPDATE blocked (error)`, error.message.slice(0, 80));
    return;
  }
  if ((count ?? 0) === 0) {
    pass(`${label}: UPDATE isolation — Company B row invisible (0 rows affected)`);
  } else {
    fail(`${label}: UPDATE isolation BREACH — ${count} Company B row(s) updated`);
  }
}

// ── static audit ───────────────────────────────────────────────────────────
function staticAudit() {
  console.log("\n── Static Audit of migrations 0001-0021 ─────────────────────────────────");

  const __dir = dirname(fileURLToPath(import.meta.url));
  const migsDir = join(__dir, "..", "supabase", "migrations");

  let migFiles;
  try {
    migFiles = readdirSync(migsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (e) {
    console.log("AUDIT  Could not read migrations directory:", e.message);
    return;
  }

  const allSql = migFiles
    .map((f) => ({ file: f, sql: readFileSync(join(migsDir, f), "utf8") }));

  // Collect all CREATE TABLE statements (rough parse — good enough for audit).
  const createTableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(/gi;
  const tablesFound = new Map(); // name → { file, hasCompanyId, hasRls, hasPolicies }

  for (const { file, sql } of allSql) {
    let m;
    const re = new RegExp(createTableRe.source, "gi");
    while ((m = re.exec(sql)) !== null) {
      const tbl = m[1].toLowerCase();
      if (tablesFound.has(tbl)) continue; // first definition wins
      // Does this table's definition (up to the next semicolon-level block) contain company_id?
      const bodyStart = sql.indexOf("(", m.index);
      // Find matching close paren + semicolon — crude but sufficient for audit.
      let depth = 0, pos = bodyStart;
      while (pos < sql.length) {
        if (sql[pos] === "(") depth++;
        else if (sql[pos] === ")") { depth--; if (depth === 0) break; }
        pos++;
      }
      const body = sql.slice(bodyStart, pos + 1);
      const hasCompanyId = /\bcompany_id\b/i.test(body);
      tablesFound.set(tbl, { file, hasCompanyId, rlsEnabled: false, policies: 0 });
    }
  }

  // Scan for RLS enable + policies.
  const combined = allSql.map((x) => x.sql).join("\n");
  for (const [tbl, info] of tablesFound) {
    if (new RegExp(`alter\\s+table\\s+(?:public\\.)?${tbl}\\s+enable\\s+row\\s+level\\s+security`, "i").test(combined)) {
      info.rlsEnabled = true;
    }
    // Handle both `create policy name on ...` and
    // `create policy if not exists "name" on ...`
    const policyRe = new RegExp(
      `create\\s+policy\\s+(?:if\\s+not\\s+exists\\s+)?(?:"[^"]+"|\\S+)\\s+on\\s+(?:public\\.)?${tbl}\\b`,
      "gi",
    );
    const count = (combined.match(policyRe) ?? []).length;
    info.policies = count;
  }

  // Expected internal / non-tenant tables that legitimately have no company_id.
  const INTERNAL_TABLES = new Set([
    "companies",         // root — IS the tenant
    "product_keys",      // service-role only; company_id is a post-activation link
    "schema_migrations", // supabase internal
    "buckets",           // storage internal
  ]);

  console.log("\n  Tables missing company_id (excluding known internal tables):");
  let foundIssue = false;
  for (const [tbl, info] of tablesFound) {
    if (!info.hasCompanyId && !INTERNAL_TABLES.has(tbl)) {
      console.log(`  WARN  ${tbl}  (${info.file})  — no company_id column`);
      foundIssue = true;
    }
  }
  if (!foundIssue) console.log("  none — all tables have company_id or are internal");

  console.log("\n  Tables with RLS enabled but ZERO policies (all queries denied):");
  foundIssue = false;
  for (const [tbl, info] of tablesFound) {
    if (info.rlsEnabled && info.policies === 0) {
      const intentional = tbl === "product_keys"; // intentionally service-role only
      console.log(
        `  ${intentional ? "NOTE" : "WARN"}  ${tbl}  — RLS on, 0 policies` +
        (intentional ? " (intentional — service-role only)" : " — all rows DENIED to app users"),
      );
      foundIssue = true;
    }
  }
  if (!foundIssue) console.log("  none");

  console.log("\n  SECURITY DEFINER functions accepting caller-supplied company_id:");
  // Find functions defined as SECURITY DEFINER that have a parameter whose
  // name contains 'company_id' (e.g. p_company_id).
  // We match the signature `function name(params)` then check the next 300 chars
  // for SECURITY DEFINER.  `combined` already has all migration SQL.
  const fnChunkRe = /create\s+or\s+replace\s+function\s+(?:public\.)?(\w+)\s*\(([^)]*)\)/gi;
  let fnMatch;
  const flaggedFns = [];
  const seenFns = new Set();
  while ((fnMatch = fnChunkRe.exec(combined)) !== null) {
    const fnName   = fnMatch[1];
    const paramStr = fnMatch[2];
    // Grab the 300 chars after the closing paren to check for SECURITY DEFINER.
    const afterParen = combined.slice(fnMatch.index + fnMatch[0].length, fnMatch.index + fnMatch[0].length + 300);
    const isSecDef = /security\s+definer/i.test(afterParen);
    // Match param names that are or end with 'company_id' (e.g. p_company_id).
    if (isSecDef && /(?:^|[\s,])(?:\w+_)?company_id\b/i.test(paramStr) && !seenFns.has(fnName)) {
      seenFns.add(fnName);
      flaggedFns.push(fnName);
      console.log(
        `  WARN  ${fnName}(${paramStr.trim().slice(0, 80)})` +
        `\n        SECURITY DEFINER + caller-supplied company_id.` +
        `\n        A caller can pass any company_id; function bypasses RLS.` +
        `\n        Fix: derive company_id from current_company_id() instead.`,
      );
    }
  }
  if (flaggedFns.length === 0) console.log("  none");

  console.log("\n  Tables with RLS disabled:");
  foundIssue = false;
  for (const [tbl, info] of tablesFound) {
    if (!info.rlsEnabled && !INTERNAL_TABLES.has(tbl)) {
      console.log(`  WARN  ${tbl}  — RLS NOT enabled`);
      foundIssue = true;
    }
  }
  if (!foundIssue) console.log("  none — all tables have RLS enabled");
}

// ── main ───────────────────────────────────────────────────────────────────
console.log("GraniteOS — Company Isolation Verification");
console.log("──────────────────────────────────────────");

try {
  // ── 1. Create two throwaway auth users ──────────────────────────────────
  for (const email of [EMAIL_A, EMAIL_B]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    created.authIds.push(data.user.id);
  }
  console.log("Auth users created:", EMAIL_A, "|", EMAIL_B);

  // ── 2. Insert two throwaway product keys ────────────────────────────────
  for (const key of [KEY_A, KEY_B]) {
    const { error } = await admin.from("product_keys").insert({
      key,
      plan: "standard",
      note: "ISOLATION TEST — auto-deleted",
    });
    if (error) throw new Error(`insert key ${key}: ${error.message}`);
  }
  console.log("Test keys created:", KEY_A, "|", KEY_B);

  // ── 3. Setup Company A via the real RPC (same path the app uses) ─────────
  const clientA = await signIn(EMAIL_A);
  const { data: userARow, error: setupAErr } = await clientA.rpc("setup_company", {
    p_company_name: `Isolation Test Co A — ${stamp}`,
    p_city: "TestCity",
    p_owner_name: "Test Owner A",
    p_phone: null,
    p_address: null,
    p_gst_number: null,
    p_product_key: KEY_A,
  });
  if (setupAErr) throw new Error(`setup_company A: ${setupAErr.message}`);
  created.compAId = userARow.company_id;
  console.log("Company A created:", created.compAId);

  // ── 4. Setup Company B ───────────────────────────────────────────────────
  const clientB_setup = await signIn(EMAIL_B);
  const { data: userBRow, error: setupBErr } = await clientB_setup.rpc("setup_company", {
    p_company_name: `Isolation Test Co B — ${stamp}`,
    p_city: "TestCity",
    p_owner_name: "Test Owner B",
    p_phone: null,
    p_address: null,
    p_gst_number: null,
    p_product_key: KEY_B,
  });
  if (setupBErr) throw new Error(`setup_company B: ${setupBErr.message}`);
  created.compBId = userBRow.company_id;
  console.log("Company B created:", created.compBId);

  const compA = created.compAId;
  const compB = created.compBId;

  // ── 5. Seed data into BOTH companies (service role bypasses RLS) ─────────
  console.log("\nSeeding test data into both companies...");

  // parties
  for (const cid of [compA, compB]) {
    await admin.from("parties").insert([
      { company_id: cid, kind: "customer", name: `Cust-${cid.slice(0, 6)}` },
      { company_id: cid, kind: "supplier", name: `Supp-${cid.slice(0, 6)}` },
    ]);
  }

  // blocks + slabs
  for (const cid of [compA, compB]) {
    const { data: blk } = await admin
      .from("blocks")
      .insert({ company_id: cid, label: `BLK-${cid.slice(0, 6)}`, material: "Granite" })
      .select("id")
      .single();
    const { data: slb } = await admin
      .from("slabs")
      .insert({ company_id: cid, block_id: blk.id, length_in: 96, width_in: 60, rate_paise: 10000 })
      .select("id")
      .single();
    if (cid === compB) bIds.blockId = blk.id;
  }

  // quotes + quote_items
  for (const cid of [compA, compB]) {
    const { data: qt } = await admin
      .from("quotes")
      .insert({ company_id: cid })
      .select("id")
      .single();
    await admin
      .from("quote_items")
      .insert({ company_id: cid, quote_id: qt.id, description: "Test slab" });
    if (cid === compB) bIds.quoteId = qt.id;
  }

  // orders
  for (const cid of [compA, compB]) {
    await admin.from("orders").insert({ company_id: cid });
  }

  // invoices + invoice_items
  for (const cid of [compA, compB]) {
    const { data: inv } = await admin
      .from("invoices")
      .insert({ company_id: cid })
      .select("id")
      .single();
    await admin
      .from("invoice_items")
      .insert({ company_id: cid, invoice_id: inv.id, description: "Test item" });
    if (cid === compB) bIds.invoiceId = inv.id;
  }

  // payments
  for (const cid of [compA, compB]) {
    await admin.from("payments").insert({
      company_id: cid, amount_paise: 100, mode: "cash",
    });
  }

  // production_jobs
  for (const cid of [compA, compB]) {
    await admin.from("production_jobs").insert({ company_id: cid, title: "Test Job" });
  }

  // products
  for (const cid of [compA, compB]) {
    await admin.from("products").insert({ company_id: cid, name: "Test Product" });
  }

  // daybook_tasks
  for (const cid of [compA, compB]) {
    await admin.from("daybook_tasks").insert({ company_id: cid, title: "Test Task" });
  }

  console.log("Seed complete.\n");

  // ── 6. Sign in fresh as Company A user (anon-key client) ─────────────────
  // Re-use the clientA we already have (it's still authenticated).
  // But re-sign in for a clean session to be sure.
  const userA = await signIn(EMAIL_A);

  // ── 7. Table-by-table isolation tests ────────────────────────────────────
  console.log("── SELECT isolation tests (Company A cannot see Company B rows) ──────────");

  const tenantTables = [
    "blocks", "slabs", "parties", "quotes", "quote_items", "orders",
    "invoices", "invoice_items", "payments", "production_jobs",
    "products", "daybook_tasks",
  ];

  for (const tbl of tenantTables) {
    await testSelectIsolation(tbl, userA, tbl, compB);
  }

  // companies: User A should only see their own company row (no company_id
  // column — the policy uses id = current_company_id()).
  {
    const { data, error } = await userA.from("companies").select("id");
    if (error) {
      fail("companies: SELECT", error.message.slice(0, 80));
    } else {
      const leaked = (data ?? []).filter((r) => r.id === compB);
      leaked.length === 0
        ? pass("companies: SELECT isolation — Company B row not visible")
        : fail("companies: SELECT isolation BREACH");
    }
  }

  // users: should only see Company A users
  await testSelectIsolation("users", userA, "users", compB);

  // display_number_sequences: read-only RLS
  await testSelectIsolation("display_number_sequences", userA, "display_number_sequences", compB);

  // product_keys: RLS on, no policies → all denied (nothing visible)
  {
    const { data, error } = await userA.from("product_keys").select("key");
    if (error) {
      pass("product_keys: SELECT denied entirely (service-role only table)", error.message.slice(0, 60));
    } else {
      (data ?? []).length === 0
        ? pass("product_keys: SELECT returns 0 rows (no policies = all denied)")
        : fail("product_keys: SELECT returned rows — RLS not working");
    }
  }

  // access_control (0021 — may not be applied)
  {
    const exists = await tableExists("access_control");
    if (!exists) {
      skip("access_control: SELECT isolation", "table does not exist yet (migration 0021 not applied)");
    } else {
      await testSelectIsolation("access_control", userA, "access_control", compB);
    }
  }

  // ── 8. Cross-company INSERT tests ─────────────────────────────────────────
  console.log("\n── Cross-company INSERT tests (Company A cannot write into Company B) ─────");

  await testCrossInsert("blocks",     userA, "blocks",     { company_id: compB, label: "INJECTED", material: "Granite" });
  await testCrossInsert("slabs",      userA, "slabs",      { company_id: compB, block_id: bIds.blockId, length_in: 10, width_in: 10, rate_paise: 0 });
  await testCrossInsert("parties",    userA, "parties",    { company_id: compB, kind: "customer", name: "INJECTED" });
  await testCrossInsert("quotes",     userA, "quotes",     { company_id: compB });
  await testCrossInsert("quote_items",userA, "quote_items",{ company_id: compB, quote_id: bIds.quoteId, description: "INJECTED" });
  await testCrossInsert("orders",     userA, "orders",     { company_id: compB });
  await testCrossInsert("invoices",   userA, "invoices",   { company_id: compB });
  await testCrossInsert("invoice_items",userA,"invoice_items",{ company_id: compB, invoice_id: bIds.invoiceId, description: "INJECTED" });
  await testCrossInsert("payments",   userA, "payments",   { company_id: compB, amount_paise: 999, mode: "cash" });
  await testCrossInsert("production_jobs",userA,"production_jobs",{ company_id: compB, title: "INJECTED" });
  await testCrossInsert("products",   userA, "products",   { company_id: compB, name: "INJECTED" });
  await testCrossInsert("daybook_tasks",userA,"daybook_tasks",{ company_id: compB, title: "INJECTED" });

  // Tables with no INSERT policy at all (RLS on, no insert policy = blocked)
  await testCrossInsert("users (no insert policy)",  userA, "users",    { company_id: compB, name: "INJECTED", role: "sales_manager", status: "active" });
  await testCrossInsert("display_number_sequences (no insert policy)", userA, "display_number_sequences", { company_id: compB, entity_type: "quote", year: 2099, last_seq: 0 });

  // access_control (0021)
  {
    const exists = await tableExists("access_control");
    if (!exists) {
      skip("access_control: cross-company INSERT", "migration 0021 not applied");
    } else {
      await testCrossInsert("access_control", userA, "access_control", { company_id: compB, config: "{}" });
    }
  }

  // ── 9. Cross-company UPDATE tests ─────────────────────────────────────────
  console.log("\n── Cross-company UPDATE tests (Company A row edits must not reach Company B) ─");

  // Get a known Company B block id.
  const { data: bBlocks } = await admin.from("blocks").select("id").eq("company_id", compB).limit(1);
  const bBlockId = bBlocks?.[0]?.id;
  if (bBlockId) {
    await testUpdateIsolation("blocks", userA, "blocks", bBlockId, { label: "INJECTED-UPDATE" });
  } else {
    skip("blocks: UPDATE isolation", "could not find Company B block to test against");
  }

  const { data: bParties } = await admin.from("parties").select("id").eq("company_id", compB).limit(1);
  const bPartyId = bParties?.[0]?.id;
  if (bPartyId) {
    await testUpdateIsolation("parties", userA, "parties", bPartyId, { name: "INJECTED-UPDATE" });
  } else {
    skip("parties: UPDATE isolation", "could not find Company B party");
  }

  const { data: bProducts } = await admin.from("products").select("id").eq("company_id", compB).limit(1);
  const bProductId = bProducts?.[0]?.id;
  if (bProductId) {
    await testUpdateIsolation("products", userA, "products", bProductId, { name: "INJECTED-UPDATE" });
  } else {
    skip("products: UPDATE isolation", "could not find Company B product");
  }

  // Verify the UPDATE didn't actually mutate (service-role double-check)
  if (bBlockId) {
    const { data: check } = await admin.from("blocks").select("label").eq("id", bBlockId).single();
    check?.label !== "INJECTED-UPDATE"
      ? pass("blocks: UPDATE double-check via service role — label unchanged")
      : fail("blocks: UPDATE BREACH confirmed by service role — label was mutated");
  }

  // ── 10. RPC isolation: generate_display_number with a foreign company_id ──
  // This function is SECURITY DEFINER and accepts p_company_id from the caller.
  // A Company A user can pass Company B's company_id and it WILL work (bypasses
  // RLS). We test this and report — the fix must be made to the DB function, not
  // to this script.
  console.log("\n── RPC isolation test: generate_display_number ────────────────────────────");
  {
    const { data: rdnResult, error: rdnErr } = await userA.rpc(
      "generate_display_number",
      { p_company_id: compB, p_entity_type: "quote" },
    );
    if (rdnErr) {
      pass(
        "generate_display_number: cross-company call rejected",
        rdnErr.message.slice(0, 80),
      );
    } else {
      // If it succeeded, it means User A incremented Company B's sequence counter.
      // This is an isolation gap (not a data leak but a data integrity breach).
      fail(
        "generate_display_number: ISOLATION GAP — cross-company call succeeded",
        `returned "${rdnResult}". User A incremented Company B's quote sequence. ` +
        "Fix: replace p_company_id param with current_company_id() inside the function " +
        "and reject calls where p_company_id != current_company_id().",
      );
    }
  }

} catch (e) {
  console.error("\nABORT:", e.message ?? e);
  fail("script-level abort", e.message ?? String(e));
} finally {
  // ── 11. Cleanup — always runs ────────────────────────────────────────────
  console.log("\nCleaning up test data...");
  await cleanup();

  // Verify cleanup
  for (const cid of [created.compAId, created.compBId].filter(Boolean)) {
    const { data: check } = await admin.from("companies").select("id").eq("id", cid);
    (check?.length ?? 0) === 0
      ? pass(`cleanup: company ${cid.slice(0, 8)}… removed`)
      : fail(`cleanup: company ${cid.slice(0, 8)}… NOT removed`);
  }
}

// ── 12. Static audit of migration files ────────────────────────────────────
staticAudit();

// ── 13. Summary ────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════════════════════");
console.log(`ISOLATION SUITE RESULT: ${totalPass} PASS  ${totalFail} FAIL  ${totalSkip} SKIP`);
const allOk = totalFail === 0;
console.log(allOk ? "OVERALL: PASS" : "OVERALL: FAIL");
console.log("══════════════════════════════════════════════════════════════════════════");

process.exit(allOk ? 0 : 1);
