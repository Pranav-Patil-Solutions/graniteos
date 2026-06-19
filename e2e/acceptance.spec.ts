import { test, expect, type Page } from "@playwright/test";

// Real end-to-end acceptance + mobile UI audit.
// Runs on every project in playwright.config.ts (Desktop / iPhone / Android / Tablet).
// Seeded demo owner; override via env in CI.
const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";
const COMPANY_ID = process.env.E2E_COMPANY_ID ?? "3767c423-177e-4b0c-855c-a0d53df63af1";

async function loginAsOwner(page: Page) {
  // The redesigned login is a plain email/password form (no tabs). Fields are
  // always visible; the submit control is the form's only submit button
  // (labelled "Login" in sign-in mode).
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.locator("input[type=email]").first();
  await email.waitFor({ state: "visible", timeout: 15_000 });
  await email.fill(EMAIL);
  await page.locator("input[type=password]").first().fill(PASSWORD);
  const submit = page.locator("form button[type=submit]").first();
  if (await submit.count()) await submit.click();
  else await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
}

// Navigate to a screen as a logged-in owner and judge it honestly:
//  - did NOT bounce back to /login (auth + middleware ok)
//  - no error page / crash overlay
//  - server status < 500
// Also records horizontal overflow (mobile UI-audit signal) and screenshots it.
async function checkScreen(page: Page, path: string, name: string, proj: string) {
  let status = 0;
  try {
    const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    status = resp?.status() ?? 0;
  } catch (e) {
    console.log(`[${proj}] ${name.padEnd(18)} FAIL  navigation threw: ${(e as Error).message}`);
    await page.screenshot({ path: `audit/acceptance/${proj}/${name}.png`, fullPage: true }).catch(() => {});
    expect.soft(false, `${name}: navigation threw`).toBeTruthy();
    return;
  }
  await page.waitForTimeout(900); // let the client render

  const url = page.url();
  const bouncedToLogin = /\/login(\?|$)/.test(url);
  const body = (await page.locator("body").innerText().catch(() => "")) || "";
  const errored = /Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found|client-side exception/i.test(body);
  const overflow = await page
    .evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .catch(() => 0);

  const ok = !bouncedToLogin && !errored && status < 500;
  await page.screenshot({ path: `audit/acceptance/${proj}/${name}.png`, fullPage: true }).catch(() => {});

  const flags = [
    bouncedToLogin ? "BOUNCED→LOGIN" : "",
    errored ? "ERROR-ON-PAGE" : "",
    overflow > 5 ? `H-OVERFLOW ${overflow}px` : "",
  ].filter(Boolean).join(" ");
  console.log(`[${proj}] ${name.padEnd(18)} ${ok ? "PASS" : "FAIL"}  status=${status} ovf=${overflow}px ${flags}`);

  expect.soft(ok, `${name} should load for owner (status=${status}, url=${url}, errored=${errored})`).toBeTruthy();
}

test("public — showcase renders (3D + hydration)", async ({ page }, info) => {
  const proj = info.project.name;
  await page.goto("/showcase", { waitUntil: "domcontentloaded" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 25_000 });
  await page.screenshot({ path: `audit/acceptance/${proj}/00-showcase.png`, fullPage: true });
});

test("public — login page has email + password fields", async ({ page }, info) => {
  const proj = info.project.name;
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("input[type=email]").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("input[type=password]").first()).toBeVisible();
  await page.screenshot({ path: `audit/acceptance/${proj}/01-login.png`, fullPage: true });
});

test("public — catalogue loads", async ({ page }, info) => {
  const proj = info.project.name;
  const resp = await page.goto(`/catalog/${COMPANY_ID}`, { waitUntil: "domcontentloaded" });
  expect.soft((resp?.status() ?? 0) < 500, "catalogue should not 5xx").toBeTruthy();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `audit/acceptance/${proj}/03-catalog.png`, fullPage: true });
});

test("AUTH — owner logs in through the real UI and reaches the dashboard", async ({ page }, info) => {
  const proj = info.project.name;
  await loginAsOwner(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.screenshot({ path: `audit/acceptance/${proj}/02-dashboard.png`, fullPage: true });
  console.log(`[${proj}] LOGIN              PASS  reached ${page.url()}`);
});

test("AUTH — walk every core screen", async ({ page }, info) => {
  test.setTimeout(240_000);
  const proj = info.project.name;
  await loginAsOwner(page);

  const screens: [string, string][] = [
    ["/dashboard", "10-dashboard"],
    ["/parties", "11-parties"],
    ["/inventory", "12-inventory"],
    ["/quotes", "13-quotes"],
    ["/quotes/new", "14-quote-new"],
    ["/orders", "15-orders"],
    ["/invoices", "16-invoices"],
    ["/money", "17-money"],
    ["/products", "18-products"],
    ["/analytics", "19-analytics"],
    ["/fabrication", "20-fabrication"],
    ["/factory", "21-factory"],
    ["/daybook", "22-daybook"],
    ["/measure", "23-measure"],
    ["/settings", "24-settings"],
    ["/team", "25-team"],
    ["/ai-studio", "26-ai-studio"],
    ["/marketing", "27-marketing"],
    ["/logs", "28-logs"],
  ];
  for (const [path, name] of screens) {
    await checkScreen(page, path, name, proj);
  }
});
