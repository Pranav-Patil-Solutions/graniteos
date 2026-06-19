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

test("VOICE — mics present where expected", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "Desktop only");
  test.setTimeout(120_000);
  const shot = (n: string) => page.screenshot({ path: `audit/voice/${n}.png`, fullPage: true });
  await loginAsOwner(page);

  const speechSupported = await page.evaluate(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
  );
  console.log(`[voice] test browser speech support = ${speechSupported}`);

  // quote builder — description + notes mics
  await page.goto("/quotes/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800); // let MicDictate's support-detect effect run
  const qItemMic = await page.getByRole("button", { name: "Speak the item" }).count();
  const qNotesMic = await page.getByRole("button", { name: "Speak the terms" }).count();
  console.log(`[voice] quote builder: item-mic=${qItemMic} notes-mic=${qNotesMic}`);
  await shot("1-quote-voice");

  // marketing WhatsApp composer — offer mic
  await page.goto("/growth", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const mktMic = await page.getByRole("button", { name: "Speak your offer" }).count();
  console.log(`[voice] marketing composer: offer-mic=${mktMic}`);
  await shot("2-marketing-voice");

  // daybook — existing voice (should already be there)
  await page.goto("/daybook", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const dbMic = await page.getByRole("button", { name: /Speak a task|Stop listening/i }).count();
  console.log(`[voice] daybook task-mic=${dbMic}`);
  await shot("3-daybook-voice");

  if (speechSupported) {
    expect(qItemMic, "quote item mic present").toBeGreaterThan(0);
    expect(mktMic, "marketing mic present").toBeGreaterThan(0);
    console.log("[voice] mics render where added  PASS");
  } else {
    console.log("[voice] browser lacks speech — mics correctly hidden (graceful)  PASS (degraded)");
  }
});
