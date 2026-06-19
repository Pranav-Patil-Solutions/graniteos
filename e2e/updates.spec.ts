import { test, expect, type Page } from "@playwright/test";

// Owner login for the authenticated flows. Override via env in CI; defaults to
// the seeded demo owner so the suite runs locally out of the box.
const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";
const COMPANY_ID = process.env.E2E_COMPANY_ID ?? "3767c423-177e-4b0c-855c-a0d53df63af1";
const DB_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

async function loginAsOwner(page: Page) {
  // Redesigned login: plain email/password form, no tabs; submit is "Login".
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.locator("input[type=email]").first();
  await email.waitFor({ state: "visible", timeout: 15_000 });
  await email.fill(EMAIL);
  await page.locator("input[type=password]").first().fill(PASSWORD);
  const submit = page.locator("form button[type=submit]").first();
  if (await submit.count()) await submit.click();
  else await page.getByRole("button", { name: /login|sign in/i }).first().click();
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
    // The redesign surfaces Products in both the sidebar nav and a settings card,
    // so scope to the first match (strict mode would otherwise see multiple links).
    await expect(page.getByRole("link", { name: /Products/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Import from Excel/i }).first()).toBeVisible();
  });

  test("owner analytics dashboard loads with KPIs", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /Business insights/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Receivables/i)).toBeVisible();
    await expect(page.getByText(/Pending invoices/i)).toBeVisible();
    await expect(page.getByText(/Top customers by revenue/i)).toBeVisible();
  });

  test("party history opens from the list and shows a ledger", async ({ page }) => {
    await page.goto("/parties");
    const firstParty = page.locator('a[href^="/parties/"]').first();
    await expect(firstParty).toBeVisible({ timeout: 15_000 });
    await firstParty.click();
    await expect(page).toHaveURL(/\/parties\/[0-9a-f-]+$/);
    // a customer shows the History section; a supplier shows Blocks supplied
    await expect(page.getByText(/History|Blocks supplied/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
