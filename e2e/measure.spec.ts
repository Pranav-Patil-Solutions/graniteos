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

test("MEASURE — filter + CSV export + print affordance", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "Desktop only");
  test.setTimeout(120_000);
  const shot = (n: string) => page.screenshot({ path: `audit/measure/${n}.png`, fullPage: true });
  await loginAsOwner(page);

  await page.goto("/measure", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Measurement Sheet" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Print \/ Save PDF/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "CSV" })).toBeVisible();
  await shot("1-measure");

  const allRows = await page.locator("tbody tr").count();
  console.log(`[measure] all slabs = ${allRows} rows`);
  expect(allRows, "has slabs to measure").toBeGreaterThan(0);

  // filter by the first material → row count should not exceed the full set
  await page.locator('select[aria-label="Filter by material"]').selectOption({ index: 1 });
  await page.waitForTimeout(300);
  const filteredRows = await page.locator("tbody tr").count();
  console.log(`[measure] filtered = ${filteredRows} rows`);
  expect(filteredRows, "filter narrows (or equals)").toBeLessThanOrEqual(allRows);
  expect(filteredRows, "filtered set non-empty").toBeGreaterThan(0);
  console.log("[measure] STEP 1 material filter  PASS");
  await shot("2-filtered");

  // CSV export downloads a file
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    page.getByRole("button", { name: "CSV" }).click(),
  ]);
  expect(download.suggestedFilename(), "CSV filename").toMatch(/measurement-sheet.*\.csv/);
  console.log(`[measure] STEP 2 CSV export = ${download.suggestedFilename()}  PASS`);

  // print container present (print/Save-PDF works via window.print)
  await expect(page.locator(".measure-print")).toBeAttached();
  console.log("[measure] STEP 3 print sheet present  PASS");
});
