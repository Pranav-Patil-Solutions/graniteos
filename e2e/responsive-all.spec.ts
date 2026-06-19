import { test, type Page } from "@playwright/test";

// Multi-route responsive verification after widening every page on desktop.
// One login per project, then walk core routes measuring overflow + how much
// of the main area the content fills + sidebar/bottom-nav, with a screenshot each.
const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";

const ROUTES = [
  "/dashboard", "/inventory", "/orders", "/quotes", "/quotes/new", "/money",
  "/invoices", "/parties", "/products", "/settings", "/analytics", "/ai-studio",
  "/growth", "/measure", "/batch-payment", "/team", "/fabrication", "/factory",
  "/daybook", "/logs", "/marketing", "/stock-alert",
];

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

test("every page is responsive", async ({ page }, info) => {
  test.setTimeout(300_000);
  const proj = info.project.name;
  const vw = page.viewportSize()?.width ?? 0;
  const isDesktop = vw >= 1024;
  await loginAsOwner(page);

  for (const route of ROUTES) {
    let overflow = -1, fill: number | null = null, mainLeft = -1, bottomNav = false, status = 0;
    try {
      const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const root = document.documentElement;
        const main = document.querySelector("main");
        const inner = main?.firstElementChild as HTMLElement | null;
        const mb = main?.getBoundingClientRect();
        return {
          overflow: Math.max(0, root.scrollWidth - root.clientWidth),
          fill: main && inner && mb ? Math.round((inner.getBoundingClientRect().width / mb.width) * 100) : null,
          mainLeft: mb ? Math.round(mb.left) : -1,
        };
      });
      overflow = m.overflow; fill = m.fill; mainLeft = m.mainLeft;
      bottomNav = await page.locator("nav.fixed.bottom-0").first().isVisible().catch(() => false);
      await page.screenshot({ path: `audit/responsive-all/${proj}/${route.replace(/\//g, "_") || "_root"}.png`, fullPage: true });
    } catch (e) {
      console.log(`[resp-all] ${proj.padEnd(8)} ${route.padEnd(16)} ERROR ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    const ok = overflow <= 2 && (!isDesktop || (fill ?? 0) >= 80) && status < 500;
    console.log(
      `[resp-all] ${proj.padEnd(8)} ${route.padEnd(16)} ${ok ? "PASS" : "FAIL"} status=${status} overflow=${overflow}px fill=${fill}% mainLeft=${mainLeft}px bottomNav=${bottomNav}`
    );
  }
});
