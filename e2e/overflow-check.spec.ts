import { test, expect, type Page } from "@playwright/test";

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

const ROUTES = [
  "/dashboard", "/inventory", "/quotes", "/quotes/new", "/orders", "/money", "/parties",
  "/fabrication", "/factory", "/daybook", "/notes", "/batch-payment", "/vendor-payment",
  "/measure", "/purchase-orders", "/purchase-orders/new", "/invoices", "/products", "/team", "/analytics",
];
const WIDTHS = [375, 390, 414]; // iPhone SE, iPhone 14, iPhone Plus

test("no horizontal overflow at mobile widths", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "drives its own viewport sizes");
  test.setTimeout(300_000);
  await loginAsOwner(page);

  const fails: string[] = [];
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 820 });
    for (const r of ROUTES) {
      await page.goto(r, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(450);
      const ovf = await page.evaluate(
        () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      );
      if (ovf > 2) {
        fails.push(`${w}px ${r} = ${ovf}px`);
        console.log(`[ovf] ${w}px ${r.padEnd(20)} FAIL ${ovf}px`);
      }
    }
    console.log(`[ovf] width ${w}px: ${fails.filter((f) => f.startsWith(`${w}px`)).length} overflow(s)`);
  }
  console.log(`[ovf] TOTAL OVERFLOWS: ${fails.length}${fails.length ? " → " + fails.join("; ") : ""}`);
  expect(fails, fails.join("; ")).toHaveLength(0);
});
