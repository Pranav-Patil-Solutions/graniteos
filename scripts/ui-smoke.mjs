// UI smoke test: drives the real app in headless Chrome — logs in with the
// demo password account, screenshots key screens in dark AND light themes.
// Run with the dev server up:  node scripts/ui-smoke.mjs [baseUrl]
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3210";
const EMAIL = "pranavpatil.work@gmail.com";
const PASSWORD = "Granite@123";
const OUT = new URL("../audit/ui-smoke/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1366,900"],
  defaultViewport: { width: 1366, height: 900 },
});
const page = await browser.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });

try {
  // ── login (password tab) ──
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

  // ── dark theme screens ──
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await shot("01-dashboard-dark");
  await page.goto(`${BASE}/daybook`, { waitUntil: "networkidle2" });
  await shot("02-daybook-dark");
  await page.goto(`${BASE}/search?q=galaxy`, { waitUntil: "networkidle2" });
  await shot("03-search-dark");
  await page.goto(`${BASE}/ai-studio`, { waitUntil: "networkidle2" });
  await shot("04-aistudio-dark");

  // ── flip to light ──
  await page.evaluate(() => {
    localStorage.setItem("gos-theme", "light");
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await shot("05-dashboard-light");
  await page.goto(`${BASE}/daybook`, { waitUntil: "networkidle2" });
  await shot("06-daybook-light");
  await page.goto(`${BASE}/parties`, { waitUntil: "networkidle2" });
  await shot("07-parties-light");
  await page.goto(`${BASE}/ai-studio`, { waitUntil: "networkidle2" });
  await shot("08-aistudio-light");

  // ── mobile layout switch (light) ──
  await page.evaluate(() => {
    localStorage.setItem("gos-layout", "mobile");
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));
  await shot("09-dashboard-light-mobileview");

  // inventory block page (3D removed) — first block link if present
  await page.evaluate(() => localStorage.setItem("gos-layout", "auto"));
  await page.goto(`${BASE}/inventory`, { waitUntil: "networkidle2" });
  const blockHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/inventory/"]')].find((x) => x.getAttribute("href").length > 12);
    return a?.getAttribute("href") ?? null;
  });
  if (blockHref) {
    await page.goto(`${BASE}${blockHref}`, { waitUntil: "networkidle2" });
    await shot("10-block-light-no3d");
  }

  console.log("OK — screenshots in audit/ui-smoke/");
} catch (e) {
  console.error("SMOKE FAIL:", e.message);
  await shot("99-failure");
  process.exitCode = 1;
} finally {
  await browser.close();
}
