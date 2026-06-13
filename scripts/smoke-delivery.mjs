// Focused smoke: log in with the demo account and assert the delivery-pack
// pages do NOT 500 against the live DB while migrations 0020/0021 are unapplied
// (this is exactly the production state right now). Run with dev server up:
//   node scripts/smoke-delivery.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3210";
const EMAIL = "pranavpatil.work@gmail.com";
const PASSWORD = "Granite@123";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const ROUTES = [
  "/dashboard",
  "/import",
  "/team",
  "/settings",
  "/settings/access-control",
  "/quotes",
  "/orders",
  "/parties",
  "/products",
  "/inventory",
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1366,900"],
  defaultViewport: { width: 1366, height: 900 },
});
const page = await browser.newPage();
let failures = 0;

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().toLowerCase() === "password");
    btn?.click();
  });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Sign in"));
      btn?.click();
    }),
  ]);
  await new Promise((r) => setTimeout(r, 2500));
  console.log("after login url:", page.url());
  if (page.url().includes("/login")) {
    console.error("SMOKE FAIL: login did not succeed");
    process.exitCode = 1;
  }

  for (const route of ROUTES) {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 }).catch((e) => ({ status: () => "ERR:" + e.message }));
    const status = resp.status();
    // Next.js renders a 500 page with this text on a server error.
    const errText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? "");
    const hasErrorBoundary = /Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found/i.test(errText);
    const bad = status === 500 || (typeof status === "string") || hasErrorBoundary;
    if (bad) failures++;
    console.log(`${bad ? "FAIL" : "OK  "} ${String(status).padEnd(4)} ${route}${hasErrorBoundary ? "  [error text: " + errText.replace(/\n/g, " ").slice(0, 80) + "]" : ""}`);
  }

  console.log(failures === 0 ? "\nSMOKE PASS — no 500s with migrations unapplied" : `\nSMOKE FAIL — ${failures} route(s) errored`);
  if (failures > 0) process.exitCode = 1;
} catch (e) {
  console.error("SMOKE FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
