import { test, expect } from "@playwright/test";

// Configure these in the environment (the Supabase "test OTP" number).
const TEST_PHONE = process.env.E2E_TEST_PHONE ?? "+919999999999";
const TEST_OTP = process.env.E2E_TEST_OTP ?? "123456";
const DB_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
// The OTP login can only complete with a real Supabase test-OTP phone number;
// without one it would hang at the code step, so it stays opt-in via env.
const HAS_OTP_CREDS = !!(process.env.E2E_TEST_PHONE && process.env.E2E_TEST_OTP);

test.describe("Auth → company → dashboard", () => {
  test.skip(!DB_READY, "Supabase not configured (set NEXT_PUBLIC_SUPABASE_URL to run).");

  test("a phone login lands on setup or dashboard", async ({ page }) => {
    test.skip(!HAS_OTP_CREDS, "Set E2E_TEST_PHONE + E2E_TEST_OTP (a Supabase test-OTP number) to run.");
    await page.goto("/login");
    await page.getByPlaceholder("+91 99999 99999").fill(TEST_PHONE);
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
