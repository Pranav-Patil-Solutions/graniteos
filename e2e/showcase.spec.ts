import { test, expect } from "@playwright/test";

// The cash counter animates (1.4s) only after the page hydrates, and /showcase
// compiles on first hit in dev — so give it the same generous budget as the
// 3D canvas rather than a tight 8s, which flaked under parallel/cold runs.
const HYDRATE = 15_000;

test.describe("Showcase (design system)", () => {
  test("renders the premium dashboard with 3D slab and buttons", async ({ page }) => {
    await page.goto("/showcase");

    // 3D slab canvas mounts
    await expect(page.locator("canvas")).toBeVisible({ timeout: HYDRATE });

    // the wedge feature and key buttons are present (exact: the text appears twice)
    await expect(page.getByText("Recovery Radar", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /New GST Bill/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send on WhatsApp/i })).toBeVisible();

    // animated cash counter reaches its target (this also proves the page hydrated)
    await expect(page.getByText("₹2,40,000")).toBeVisible({ timeout: HYDRATE });
  });

  test("the morph button disables itself while it processes", async ({ page }) => {
    await page.goto("/showcase");

    // Hydration gate: the morph button is server-rendered, but only becomes
    // interactive (and the counter only animates) once client JS is live.
    const pay = page.getByTestId("morph-pay").locator("button");
    await expect(pay).toHaveText(/Record Payment/i);
    await expect(page.getByText("₹2,40,000")).toBeVisible({ timeout: HYDRATE });

    await pay.click();
    // morph → disabled while it spins, then shows ✓ (reliable "the click worked" signal)
    await expect(pay).toBeDisabled({ timeout: 4_000 });
  });
});
