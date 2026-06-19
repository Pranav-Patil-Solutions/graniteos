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

async function ovf(page: Page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
}

test("PROCUREMENT MOBILE — review new screens", async ({ page }, info) => {
  test.skip(info.project.name !== "iPhone", "mobile review");
  test.setTimeout(120_000);
  const proj = info.project.name;
  const shot = (n: string) => page.screenshot({ path: `audit/polish/${proj}-${n}.png`, fullPage: true });
  await loginAsOwner(page);

  for (const [route, name] of [["/purchase-orders", "po-list"], ["/purchase-orders/new", "po-new"], ["/measure", "measure"]] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    console.log(`[polish] ${name.padEnd(12)} overflow=${await ovf(page)}px`);
    await shot(name);
  }

  // PO detail (first PO)
  await page.goto("/purchase-orders", { waitUntil: "domcontentloaded" });
  const firstPO = page.locator('a[href^="/purchase-orders/"]:not([href$="/new"])').first();
  if (await firstPO.count()) {
    await firstPO.click();
    await page.waitForURL(/\/purchase-orders\/[0-9a-f-]+$/, { timeout: 15_000 });
    await page.waitForTimeout(500);
    console.log(`[polish] po-detail     overflow=${await ovf(page)}px`);
    await shot("po-detail");
  }

  // vendor-payment populated
  await page.goto("/vendor-payment", { waitUntil: "domcontentloaded" });
  await page.locator("label").filter({ hasText: "Supplier" }).locator("select").selectOption({ label: "Sri Balaji Granites" });
  await page.waitForTimeout(1200);
  console.log(`[polish] vendor-pay     overflow=${await ovf(page)}px`);
  await shot("vendor-payment");
});
