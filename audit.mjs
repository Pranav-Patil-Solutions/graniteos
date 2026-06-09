import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("audit", { recursive: true });

const CO = "3767c423-177e-4b0c-855c-a0d53df63af1";
const TAXINV = "2eca13e4-27cf-462c-b385-dfadfd6487d3";
const base = "http://localhost:3000";
const results = [];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(e.message));

async function shot(name, url, opts = {}) {
  const before = errs.length;
  let status = "ok";
  try {
    const resp = await pg.goto(base + url, { waitUntil: "networkidle", timeout: 30000 });
    const code = resp?.status() ?? 0;
    await pg.waitForTimeout(opts.wait ?? 1500);
    if (code >= 400) status = `HTTP ${code}`;
    if (errs.length > before) status = "runtime-error";
    await pg.screenshot({ path: `audit/${name}.png`, fullPage: opts.full ?? true });
  } catch (e) {
    status = "FAILED: " + (e.message || e).slice(0, 60);
    try { await pg.screenshot({ path: `audit/${name}.png` }); } catch {}
  }
  results.push({ name, url, status });
  console.log(name.padEnd(22), status);
}

// ---------- PUBLIC (customer-facing, no login) ----------
await shot("01-login", "/login");
await shot("02-catalogue", `/catalog/${CO}`, { wait: 2500 });

// visualizer: Try a room
await pg.getByRole("button", { name: /See it in your space/i }).first().click().catch(() => {});
await pg.waitForTimeout(800);
await pg.locator("button", { hasText: "Black Galaxy" }).first().click().catch(() => {});
await pg.waitForTimeout(1200);
await pg.screenshot({ path: "audit/03-visualizer-room.png" });
results.push({ name: "03-visualizer-room", url: "(modal)", status: "ok" });
console.log("03-visualizer-room      ok (template room)");

// visualizer: AI tab -> upload -> generate -> capture real state
await pg.getByRole("button", { name: /Use my photo/i }).click().catch(() => {});
await pg.waitForTimeout(400);
await pg.setInputFiles('input[type=file]', "public/login-marble.png").catch(() => {});
await pg.waitForTimeout(800);
await pg.locator("button", { hasText: /Show .*Galaxy|Show .*Marble|Show /i }).first().click().catch(() => {});
await pg.waitForTimeout(6000); // wait for Gemini call to return (or error)
await pg.screenshot({ path: "audit/04-visualizer-ai.png" });
const aiErr = await pg.locator("text=/quota|billing|switched on|Couldn't/i").count();
results.push({ name: "04-visualizer-ai", url: "(modal)", status: aiErr ? "AI blocked (needs billing)" : "AI returned image" });
console.log("04-visualizer-ai        ", aiErr ? "AI blocked (needs billing)" : "AI returned image");

await shot("05-slab-passport", "/s/498423df-128f-4882-a815-c82d7bf7828c", { wait: 2500 });

// ---------- LOGIN as demo client ----------
await pg.goto(base + "/login", { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(1500);
await pg.locator('button:has-text("password")').first().click();
await pg.waitForTimeout(500);
await pg.locator('input[type=email]').fill("demo@graniteos.in");
await pg.locator('input[type=password]').fill("Granite2026");
await pg.locator('button:has-text("Sign in")').first().click();
await pg.waitForTimeout(4000);
console.log("logged in -> url:", pg.url());

// ---------- OWNER APP (logged in) ----------
await shot("06-dashboard", "/dashboard", { wait: 2000 });
await shot("07-inventory", "/inventory", { wait: 2000 });
// inventory detail (3D) — open first block
await pg.locator('a[href^="/inventory/"]').first().click().catch(() => {});
await pg.waitForTimeout(2500);
await pg.screenshot({ path: "audit/08-inventory-detail-3d.png", fullPage: true });
results.push({ name: "08-inventory-detail-3d", url: "(first block)", status: "ok" });
console.log("08-inventory-detail-3d  ok");
await shot("09-parties", "/parties", { wait: 1500 });
await shot("10-quotes", "/quotes", { wait: 1500 });
await shot("11-quote-new", "/quotes/new", { wait: 1500 });
await shot("12-invoices", "/invoices", { wait: 1500 });
await shot("13-invoice-detail", `/invoices/${TAXINV}`, { wait: 1500 });
await shot("14-tax-invoice", `/invoices/${TAXINV}/tax-invoice`, { wait: 1500 });
await shot("15-money", "/money", { wait: 1500 });
await shot("16-fabrication", "/fabrication", { wait: 1500 });
await shot("17-growth", "/growth", { wait: 1500 });
await shot("18-settings", "/settings", { wait: 1500 });
await shot("19-import", "/import", { wait: 1500 });

console.log("\n==== SUMMARY ====");
results.forEach((r) => console.log(r.status.padEnd(28), r.name, r.url));
console.log("\ntotal pageerrors:", errs.length);
errs.slice(0, 8).forEach((e) => console.log("  ERR:", e.slice(0, 100)));
await b.close();
