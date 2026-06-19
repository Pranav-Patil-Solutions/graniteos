import { test, expect, type Page } from "@playwright/test";

// Procurement UI smoke: create PO → record vendor bill → pay vendor (FIFO).
// Desktop only (stateful, mutating). Leaves TEST rows; cleaned up afterwards.
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

test("PROCUREMENT — PO → vendor bill → vendor payment", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "stateful — Desktop only");
  test.setTimeout(180_000);
  const shot = (n: string) => page.screenshot({ path: `audit/procurement/${n}.png`, fullPage: true });
  await loginAsOwner(page);

  // PO list reachable
  await page.goto("/purchase-orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Purchase Orders" })).toBeVisible({ timeout: 15_000 });
  await shot("1-po-list");

  // create PO: 50 × ₹200 + 18% GST = ₹11,800
  await page.goto("/purchase-orders/new", { waitUntil: "domcontentloaded" });
  await page.locator("label").filter({ hasText: "Supplier" }).locator("select").selectOption({ index: 1 });
  const sup = await page.locator("label").filter({ hasText: "Supplier" }).locator("select")
    .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex].text);
  await page.locator('input[placeholder="Black Galaxy raw blocks"]').first().fill("TEST procurement UI block");
  await page.locator("label").filter({ hasText: /Qty/ }).locator('input[type="number"]').first().fill("50");
  await page.locator("label").filter({ hasText: /Rate/ }).locator("input").first().fill("200");
  await page.locator("label").filter({ hasText: /GST %/ }).locator("select").first().selectOption("18");
  await page.waitForTimeout(300);
  await shot("2-po-build");
  await page.getByRole("button", { name: "Save purchase order" }).click();
  await page.waitForURL(/\/purchase-orders\/[0-9a-f-]+$/, { timeout: 20_000 });
  console.log(`[proc] supplier=${sup}  PO=${page.url().split("/").pop()}`);

  const poBody = await page.locator("body").innerText();
  expect(poBody, "PO total carries GST").toContain("11,800");
  console.log("[proc] STEP 1 PO created, total ₹11,800  PASS");
  await shot("3-po-detail");

  // record vendor bill: ₹10,000 + 18% = ₹11,800
  await page.getByRole("button", { name: "Record vendor bill" }).click();
  await page.locator('input[name="subtotalRupees"]').fill("10000");
  await page.locator('select[name="gstRate"]').selectOption("18");
  await page.locator('input[name="vendorBillNo"]').fill("TEST-VB-001");
  await page.getByRole("button", { name: "Save bill" }).click();
  await expect(page.getByText(/BILL-/).first()).toBeVisible({ timeout: 15_000 });
  console.log("[proc] STEP 2 vendor bill recorded  PASS");
  await shot("4-bill-recorded");

  // pay the vendor
  await page.goto("/vendor-payment", { waitUntil: "domcontentloaded" });
  await page.locator("label").filter({ hasText: "Supplier" }).locator("select").selectOption({ label: sup });
  await expect(page.getByText(/BILL-/).first()).toBeVisible({ timeout: 15_000 });
  await shot("5-vendor-open-bills");
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page.getByRole("button", { name: "Pay Selected" }).click();
  await expect(page.getByText(/Paid ₹/).first()).toBeVisible({ timeout: 20_000 });
  console.log("[proc] STEP 3 vendor paid (FIFO)  PASS");
  await shot("6-vendor-paid");
});
