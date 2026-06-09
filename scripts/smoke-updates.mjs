import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("audit/updates", { recursive: true });

const base = "http://localhost:3000";
const CO = "3767c423-177e-4b0c-855c-a0d53df63af1";
const DRAFT_QUOTE = "b9e04743-ae70-47bc-835a-c42ac8c0158a";
const ACCEPTED_QUOTE = "ce4baa87-8638-4129-849d-393220bfbd24";
const INVOICE = "9b5706fa-70e0-49e7-a54f-248be11ad819";
const ORDER = "083d5605-2916-463d-9a9c-ecefd95df546";

const results = [];
const errs = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
pg.on("pageerror", (e) => errs.push(e.message));
pg.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 120)); });

async function shot(name, url, opts = {}) {
  const before = errs.length;
  let status = "ok";
  try {
    const resp = await pg.goto(base + url, { waitUntil: "networkidle", timeout: 30000 });
    const code = resp?.status() ?? 0;
    await pg.waitForTimeout(opts.wait ?? 1200);
    if (code >= 400) status = `HTTP ${code}`;
    if (errs.length > before) status = "runtime-error";
    await pg.screenshot({ path: `audit/updates/${name}.png`, fullPage: opts.full ?? true });
  } catch (e) {
    status = "FAILED: " + (e.message || e).slice(0, 60);
    try { await pg.screenshot({ path: `audit/updates/${name}.png` }); } catch {}
  }
  results.push({ name, url, status, finalUrl: pg.url().replace(base, "") });
  console.log(name.padEnd(26), status.padEnd(16), pg.url().replace(base, ""));
}

// public catalogue (refined UX) — no login
await shot("catalog-refined", `/catalog/${CO}`, { wait: 2500 });

// login as owner
await pg.goto(base + "/login", { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(1500);
await pg.locator('button:has-text("password")').first().click().catch(() => {});
await pg.waitForTimeout(500);
await pg.locator("input[type=email]").fill("demo@graniteos.in");
await pg.locator("input[type=password]").fill("Granite2026");
await pg.locator('button:has-text("Sign in")').first().click();
await pg.waitForTimeout(4000);
console.log("logged in ->", pg.url().replace(base, ""));

await shot("settings", "/settings", { wait: 1200 });
await shot("products", "/products", { wait: 1200 });
await shot("quote-new", "/quotes/new", { wait: 1500 });
await shot("quote-detail-draft", `/quotes/${DRAFT_QUOTE}`, { wait: 1200 });
await shot("quote-edit", `/quotes/${DRAFT_QUOTE}/edit`, { wait: 1500 });
await shot("quote-accepted-noedit", `/quotes/${ACCEPTED_QUOTE}`, { wait: 1200 });
await shot("invoice-detail", `/invoices/${INVOICE}`, { wait: 1200 });
await shot("invoice-edit", `/invoices/${INVOICE}/edit`, { wait: 1500 });
await shot("order-detail", `/orders/${ORDER}`, { wait: 1200 });

console.log("\n==== SUMMARY ====");
results.forEach((r) => console.log(r.status.padEnd(16), r.name.padEnd(24), "->", r.finalUrl));
console.log("\ntotal page/console errors:", errs.length);
[...new Set(errs)].slice(0, 10).forEach((e) => console.log("  ERR:", e.slice(0, 120)));
await b.close();
