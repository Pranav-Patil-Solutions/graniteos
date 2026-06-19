import { test, expect, type Page } from "@playwright/test";

// Responsive verification for the dashboard layout fix.
// Asserts: no horizontal overflow; sidebar shows only on desktop (lg+);
// bottom nav shows only on mobile/tablet. Screenshots each size.
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

test("dashboard responsive layout", async ({ page }, info) => {
  test.setTimeout(120_000);
  const proj = info.project.name;
  await loginAsOwner(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); // let it render/hydrate

  const vw = page.viewportSize()?.width ?? 0;
  const isDesktop = vw >= 1024; // app's lg breakpoint

  const overflow = await page.evaluate(
    () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  );
  const bottomNavVisible = await page.locator("nav.fixed.bottom-0").first().isVisible().catch(() => false);
  // Desktop rail is detected via the shell offset: AppShell applies lg:pl-60 (240px)
  // only when the persistent sidebar shows. Also measure how much of the main area
  // the dashboard content fills.
  const { fill, mainLeft } = await page.evaluate(() => {
    const main = document.querySelector("main");
    const inner = main?.firstElementChild as HTMLElement | null;
    const mb = main?.getBoundingClientRect();
    return {
      fill: main && inner && mb ? Math.round((inner.getBoundingClientRect().width / mb.width) * 100) : null,
      mainLeft: mb ? Math.round(mb.left) : -1,
    };
  });
  const sidebarVisible = mainLeft >= 200;

  await page.screenshot({ path: `audit/responsive/${proj}.png`, fullPage: true });

  console.log(
    `[resp] ${proj.padEnd(8)} vw=${vw} overflow=${overflow}px mainLeft=${mainLeft}px sidebar=${sidebarVisible} bottomNav=${bottomNavVisible} contentFill=${fill}%`
  );

  expect.soft(overflow, `${proj}: no horizontal overflow`).toBeLessThanOrEqual(2);
  if (isDesktop) {
    expect.soft(sidebarVisible, `${proj}: sidebar visible on desktop`).toBeTruthy();
    expect.soft(bottomNavVisible, `${proj}: bottom nav hidden on desktop`).toBeFalsy();
    expect.soft(fill ?? 0, `${proj}: content fills most of main area`).toBeGreaterThanOrEqual(85);
  } else {
    expect.soft(sidebarVisible, `${proj}: sidebar hidden on mobile/tablet`).toBeFalsy();
    expect.soft(bottomNavVisible, `${proj}: bottom nav visible on mobile/tablet`).toBeTruthy();
  }
});
