import { test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";

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

test("dashboard audit (mobile)", async ({ page }, info) => {
  test.skip(info.project.name !== "iPhone", "mobile dashboard");
  test.setTimeout(90_000);
  // pre-mark the coach-marks tour as seen so the dashboard renders un-dimmed
  await page.addInitScript(() => {
    try {
      localStorage.setItem("gos_onboarding_v1", JSON.stringify({ dismissed: false, collapsed: false, tour_seen: true }));
    } catch {}
  });
  await loginAsOwner(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "audit/ui/dashboard-mobile.png", fullPage: true });

  // Voice Notes empty state (localStorage-backed → empty in a fresh session)
  await page.goto("/notes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "audit/ui/voice-notes-empty.png", fullPage: true });

  // button-dense page — confirm the 48px touch-target floor looks right
  await page.goto("/quotes", { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/quotes/"]:not([href="/quotes/new"])').first().click();
  await page.waitForURL(/\/quotes\/[0-9a-f-]+$/, { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "audit/ui/quote-detail-buttons.png", fullPage: true });
});
