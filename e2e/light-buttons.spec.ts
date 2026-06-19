import { test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";
const STAGE = process.env.LIGHT_STAGE ?? "after";

async function loginAsOwner(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.locator("input[type=email]").first();
  await email.waitFor({ state: "visible", timeout: 20_000 });
  await email.fill(EMAIL);
  await page.locator("input[type=password]").first().fill(PASSWORD);
  const submit = page.locator("form button[type=submit]").first();
  if (await submit.count()) await submit.click();
  else await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

test("light-mode button review", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "Desktop only");
  test.setTimeout(120_000);
  // force light theme before any app script runs
  await page.addInitScript(() => {
    try { localStorage.setItem("gos-theme", "light"); } catch {}
  });
  await loginAsOwner(page);
  for (const [route, name] of [["/inventory", "inventory"], ["/quotes", "quotes"], ["/orders", "orders"], ["/money", "money"]] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `audit/light/${STAGE}-${name}.png`, fullPage: true });
  }
  // a draft quote detail — exercises the outline "Mark as sent" button
  await page.goto("/quotes", { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/quotes/"]:not([href="/quotes/new"])').first().click();
  await page.waitForURL(/\/quotes\/[0-9a-f-]+$/, { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `audit/light/${STAGE}-quote-detail.png`, fullPage: true });
});
