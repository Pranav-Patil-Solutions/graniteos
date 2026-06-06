import { test, expect } from "@playwright/test";

// Configure these in the environment to run the full flow against a real project.
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "owner@example.com";
const TEST_OTP = process.env.E2E_TEST_OTP ?? "123456";
const DB_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("Auth → company → dashboard", () => {
  test.skip(!DB_READY, "Supabase not configured (set NEXT_PUBLIC_SUPABASE_URL to run).");

  test("an email login lands on setup or dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@email.com").fill(TEST_EMAIL);
    await page.getByRole("button", { name: /Send code/i }).click();

    await page.getByPlaceholder("••••••").fill(TEST_OTP);
    await page.getByRole("button", { name: /Verify & continue/i }).click();

    // New user → /setup ; returning user → /dashboard
    await expect(page).toHaveURL(/\/(setup|dashboard)/, { timeout: 15_000 });
  });

  test("a non-owner cannot open the owner-only team page", async ({ page }) => {
    // Without a session middleware bounces to /login; with a non-owner it bounces to /dashboard.
    await page.goto("/team");
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15_000 });
  });
});
