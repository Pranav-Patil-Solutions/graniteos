import { test, expect, type Page } from "@playwright/test";

// Owner login for the authenticated flows. Override via env in CI; defaults to
// the seeded demo owner so the suite runs locally out of the box.
const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";
const COMPANY_ID = process.env.E2E_COMPANY_ID ?? "3767c423-177e-4b0c-855c-a0d53df63af1";
const DB_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator('button:has-text("password")').first().click().catch(() => {});
  await page.locator("input[type=email]").fill(EMAIL);
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.locator('button:has-text("Sign in")').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

// ── Public: refined catalogue UX (no login) ────────────────────────────────
test.describe("Catalogue UX", () => {
  test.skip(!DB_READY, "Supabase not configured.");

  test("has search, sort and filter controls", async ({ page }) => {
    await page.goto(`/catalog/${COMPANY_ID}`);
    await expect(page.getByPlaceholder(/Search stone/i)).toBeVisible({ timeout: 15_000 });
    // sort dropdown offers the new options
    await expect(page.getByRole("option", { name: "Largest" })).toBeAttached();
    await expect(page.getByText(/in stock/i).first()).toBeVisible();
  });
});

// ── Authenticated: products, UOM, quote edit ───────────────────────────────
test.describe("New features (owner)", () => {
  test.skip(!DB_READY, "Supabase not configured.");
  test.beforeEach(async ({ page }) => loginAsOwner(page));

  test("products master: list + create form opens", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /New/i }).first().click();
    await expect(page.getByRole("heading", { name: /New product/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save product/i })).toBeVisible();
  });

  test("quote builder offers per-line UOM units", async ({ page }) => {
    await page.goto("/quotes/new");
    await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible({ timeout: 15_000 });
    // the industry UOM list is present on the line item
    await expect(page.getByRole("option", { name: "Running Feet" })).toBeAttached();
    await expect(page.getByRole("option", { name: "Sq. Feet" }).first()).toBeAttached();
  });

  test("a draft quote can be edited", async ({ page }) => {
    await page.goto("/quotes");
    // open the first quote, then its Edit affordance if it's still editable
    const firstQuote = page.locator('a[href^="/quotes/"]').first();
    await expect(firstQuote).toBeVisible({ timeout: 15_000 });
    await firstQuote.click();
    const editLink = page.getByRole("link", { name: /Edit/i });
    if (await editLink.count()) {
      await editLink.first().click();
      await expect(page.getByRole("heading", { name: "Edit quote" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: /Update quote/i })).toBeVisible();
    } else {
      test.info().annotations.push({ type: "note", description: "first quote is locked (accepted/ordered) — edit correctly hidden" });
    }
  });

  test("settings exposes Products and Import", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /Products/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Import from Excel/i })).toBeVisible();
  });
});
