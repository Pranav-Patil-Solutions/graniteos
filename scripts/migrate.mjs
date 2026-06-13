// GraniteOS migration runner — applies supabase/migrations/*.sql directly
// against the Supabase Postgres connection (DATABASE_URL in .env.local), so we
// never hand-paste SQL into the dashboard again. Tracks applied migrations in a
// `schema_migrations` table; each migration runs in its own transaction.
//
// Commands:
//   node scripts/migrate.mjs status            list applied vs pending
//   node scripts/migrate.mjs baseline 0017     mark all files <= 0017 as applied
//                                              WITHOUT running them (adopt an
//                                              existing DB whose early migrations
//                                              were already applied by hand)
//   node scripts/migrate.mjs up                run every pending migration in order
//   node scripts/migrate.mjs up --dry-run      show what up would run, change nothing
//
// Connection: use the Supabase "Session pooler" or "Direct connection" string
// (NOT the transaction pooler on :6543). Format in .env.local:
//   DATABASE_URL=postgresql://postgres.<ref>:<PASSWORD>@<host>:5432/postgres
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

// ── env ──────────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* no .env.local — rely on real env */
  }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error(
    "✗ DATABASE_URL not set.\n" +
      "  Add it to .env.local. Get it from Supabase → Project Settings → Database →\n" +
      "  Connection string → 'Session pooler' (or 'Direct connection'). Example:\n" +
      "  DATABASE_URL=postgresql://postgres.zcmolxcdgefcaithosmy:YOUR_DB_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres",
  );
  process.exit(2);
}

// ── migration files ────────────────────────────────────────────────────────
function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001 < ... < 0013 < 0013b < 0014 ... (lexicographic works here)
}
function numericPrefix(file) {
  const m = file.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // belt-and-suspenders for poolers: don't keep prepared statements around
  statement_timeout: 120000,
});

async function ensureTable() {
  await client.query(`
    create table if not exists public.schema_migrations (
      version     text primary key,
      applied_at  timestamptz not null default now()
    );
  `);
}
async function appliedSet() {
  const { rows } = await client.query("select version from public.schema_migrations");
  return new Set(rows.map((r) => r.version));
}

async function cmdStatus() {
  await ensureTable();
  const applied = await appliedSet();
  const files = migrationFiles();
  let pending = 0;
  for (const f of files) {
    const ok = applied.has(f);
    if (!ok) pending++;
    console.log(`${ok ? "✓ applied" : "• PENDING"}  ${f}`);
  }
  console.log(`\n${files.length} migrations, ${pending} pending.`);
}

async function cmdBaseline(throughArg) {
  const through = numericPrefix(String(throughArg));
  if (Number.isNaN(through)) {
    console.error(`✗ baseline needs a numeric version, e.g. 'baseline 0017' (got '${throughArg}')`);
    process.exit(2);
  }
  await ensureTable();
  const applied = await appliedSet();
  const files = migrationFiles().filter((f) => numericPrefix(f) <= through && !applied.has(f));
  if (files.length === 0) {
    console.log(`Nothing to baseline at/under ${throughArg}.`);
    return;
  }
  for (const f of files) {
    await client.query(
      "insert into public.schema_migrations (version) values ($1) on conflict do nothing",
      [f],
    );
    console.log(`baselined (not executed): ${f}`);
  }
  console.log(`\nMarked ${files.length} migration(s) <= ${throughArg} as applied.`);
}

async function cmdUp(dryRun) {
  await ensureTable();
  const applied = await appliedSet();
  const pending = migrationFiles().filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log("Up to date — no pending migrations.");
    return;
  }
  console.log(`${pending.length} pending: ${pending.join(", ")}`);
  if (dryRun) {
    console.log("\n--dry-run: nothing executed.");
    return;
  }
  for (const f of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    process.stdout.write(`→ ${f} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (version) values ($1)", [f]);
      await client.query("commit");
      console.log("OK");
    } catch (e) {
      await client.query("rollback").catch(() => {});
      console.log("FAILED");
      console.error(`\n✗ ${f} failed and was rolled back:\n  ${e.message}\n`);
      console.error("Fix the migration and re-run `node scripts/migrate.mjs up`. Earlier migrations are already committed.");
      process.exit(1);
    }
  }
  console.log(`\n✓ Applied ${pending.length} migration(s).`);
}

const [cmd, arg] = process.argv.slice(2);
try {
  await client.connect();
  if (cmd === "status" || !cmd) await cmdStatus();
  else if (cmd === "baseline") await cmdBaseline(arg);
  else if (cmd === "up") await cmdUp(process.argv.includes("--dry-run"));
  else {
    console.error(`Unknown command '${cmd}'. Use: status | baseline <ver> | up [--dry-run]`);
    process.exitCode = 2;
  }
} catch (e) {
  console.error("✗ migrate error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
