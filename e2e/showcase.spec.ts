import { test, expect } from "@playwright/test";

test.describe("Showcase (design system)", () => {
  test("renders the premium dashboard with 3D slab and buttons", async ({ page }) => {
    await page.goto("/showcase");

    // 3D slab canvas mounts
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });

    // the wedge feature and key buttons are present (exact: the text appears twice)
    await expect(page.getByText("Recovery Radar", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /New GST Bill/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send on WhatsApp/i })).toBeVisible();

    // animated cash counter reaches its target (this also proves the page hydrated)
    await expect(page.getByText("₹2,40,000")).toBeVisible({ timeout: 8_000 });
  });

  test("the morph button disables itself while it processes", async ({ page }) => {
    await page.goto("/showcase");

    // Wait for hydration: the counter only animates once client JS is interactive.
    await expect(page.getByText("₹2,40,000")).toBeVisible({ timeout: 8_000 });

    // Locate by a stable test hook — the button's own text changes to a spinner/✓
    // mid-morph, so a text-based locator would stop matching.
    const pay = page.getByTestId("morph-pay").locator("button");
    await expect(pay).toHaveText(/Record Payment/i);
    await pay.click();
    // morph → disabled while it spins, then shows ✓ (reliable "the click worked" signal)
    await expect(pay).toBeDisabled({ timeout: 4_000 });
  });
});
