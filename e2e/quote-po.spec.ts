import { test, expect, type Page } from "@playwright/test";

// Step 5 smoke: raise a PO from a quote and confirm the link round-trips.
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

test("QUOTE→PO — raise PO from quote, link round-trips", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "stateful — Desktop only");
  test.setTimeout(180_000);
  const shot = (n: string) => page.screenshot({ path: `audit/quote-po/${n}.png`, fullPage: true });
  await loginAsOwner(page);

  // open the first quote
  await page.goto("/quotes", { waitUntil: "domcontentloaded" });
  const firstQuote = page.locator('a[href^="/quotes/"]:not([href="/quotes/new"])').first();
  await expect(firstQuote).toBeVisible({ timeout: 15_000 });
  await firstQuote.click();
  await page.waitForURL(/\/quotes\/[0-9a-f-]+$/, { timeout: 15_000 });
  const quoteUrl = page.url();
  console.log(`[q-po] quote = ${quoteUrl.split("/").pop()}`);
  await shot("1-quote-before");

  // raise PO from this quote
  const raise = page.getByRole("link", { name: /Raise PO/i });
  await expect(raise, "quote shows Raise-PO affordance").toBeVisible({ timeout: 10_000 });
  await raise.click();
  await page.waitForURL(/\/purchase-orders\/new\?quote=/, { timeout: 15_000 });

  // builder is pre-filled from the quote
  await expect(page.getByText(/Pre-filled from quote/i)).toBeVisible({ timeout: 15_000 });
  const firstDesc = page.locator('input[placeholder="Black Galaxy raw blocks"]').first();
  const descVal = await firstDesc.inputValue();
  expect(descVal.trim().length, "line pre-filled from quote").toBeGreaterThan(0);
  console.log(`[q-po] STEP 1 builder pre-filled (line="${descVal}")  PASS`);
  await shot("2-po-prefilled");

  // pick a supplier and save
  await page.locator("label").filter({ hasText: "Supplier" }).locator("select").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save purchase order" }).click();
  await page.waitForURL(/\/purchase-orders\/[0-9a-f-]+$/, { timeout: 20_000 });
  console.log(`[q-po] STEP 2 PO saved = ${page.url().split("/").pop()}  PASS`);
  await shot("3-po-detail");
  // PO detail shows it was raised from the quote
  expect((await page.locator("body").innerText()), "PO references the quote").toMatch(/Raised from quote/i);

  // back on the quote: the link now shows
  await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Linked purchase order")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /View PO/i })).toBeVisible();
  console.log("[q-po] STEP 3 quote now shows Linked PO + View PO  PASS");
  await shot("4-quote-linked");
});
