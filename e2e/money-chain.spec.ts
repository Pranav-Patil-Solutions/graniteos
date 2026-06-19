import { test, expect, type Page } from "@playwright/test";

// Full money chain, driven through the real browser:
//   create Quote → add line → save → Confirm→Order → Create invoice → Record payment → PAID
// Stateful + mutating, so it runs on Desktop only. Leaves one TEST-prefixed chain
// behind for inspection (wipe on request).
const EMAIL = process.env.E2E_OWNER_EMAIL ?? "demo@graniteos.in";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Granite2026";

// Known line so totals are predictable: 100 × ₹200 = ₹20,000 + 18% GST ₹3,600 = ₹23,600
const QTY = "100";
const RATE = "200";
const EXPECT_SUBTOTAL = "20,000";
const EXPECT_GST = "3,600";
const EXPECT_TOTAL = "23,600";
const LINE_DESC = "TEST E2E money-chain slab";

async function loginAsOwner(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.locator("input[type=email]").first();
  await email.waitFor({ state: "visible", timeout: 15_000 });
  await email.fill(EMAIL);
  await page.locator("input[type=password]").first().fill(PASSWORD);
  const submit = page.locator("form button[type=submit]").first();
  if (await submit.count()) await submit.click();
  else await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
}

test("MONEY CHAIN — quote → order → invoice → payment → PAID", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop", "stateful money chain runs on Desktop only");
  test.setTimeout(180_000);
  const shot = (n: string) => page.screenshot({ path: `audit/money-chain/${n}.png`, fullPage: true });

  await loginAsOwner(page);

  // ── STEP 1 — create a quote ───────────────────────────────────────────────
  await page.goto("/quotes/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible({ timeout: 15_000 });

  const custSelect = page.locator("label").filter({ hasText: "Customer" }).locator("select");
  await custSelect.selectOption({ index: 1 });
  const customerName = await custSelect.evaluate(
    (el: HTMLSelectElement) => el.options[el.selectedIndex].text
  );
  console.log(`[chain] customer = ${customerName}`);

  // The builder already renders one blank line item — fill it directly
  // (clicking "Add line" would leave a second empty line → "Description required").
  await page.locator('input[placeholder="Polished Black Galaxy slab"]').first().fill(LINE_DESC);
  await page.locator("label").filter({ hasText: /Qty/ }).locator('input[type="number"]').first().fill(QTY);
  await page.locator("label").filter({ hasText: /Rate/ }).locator("input").first().fill(RATE);
  await page.locator("label").filter({ hasText: /GST %/ }).locator("select").first().selectOption("18");
  await page.waitForTimeout(400); // let totals recompute
  await shot("1-quote-build");

  await page.getByRole("button", { name: "Save quote" }).click();
  await page.waitForURL(/\/quotes\/[0-9a-f-]+$/, { timeout: 20_000 });
  const quoteId = page.url().split("/").pop()!;
  console.log(`[chain] quote saved = ${quoteId}`);
  await shot("2-quote-saved");

  const quoteBody = await page.locator("body").innerText();
  expect(quoteBody, "quote subtotal").toContain(EXPECT_SUBTOTAL);
  expect(quoteBody, "quote GST").toContain(EXPECT_GST);
  expect(quoteBody, "quote total with GST").toContain(EXPECT_TOTAL);
  console.log(`[chain] STEP 1 quote total ₹${EXPECT_TOTAL}  PASS`);

  // ── STEP 2 — confirm quote → order ────────────────────────────────────────
  await page.getByRole("button", { name: "Confirm → Order" }).click();
  await page.waitForURL(/\/orders(\?|$)/, { timeout: 20_000 });
  await page.waitForTimeout(600);
  await shot("3-orders-list");
  // newest order is first; it must carry our total
  const ordersBody = await page.locator("body").innerText();
  expect(ordersBody, "order shows total").toContain(EXPECT_TOTAL);
  console.log(`[chain] STEP 2 order created (total ₹${EXPECT_TOTAL})  PASS`);

  // ── STEP 3 — create invoice from the order ────────────────────────────────
  await page.getByRole("button", { name: "Create invoice" }).first().click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]+$/, { timeout: 20_000 });
  const invoiceId = page.url().split("/").pop()!;
  console.log(`[chain] invoice created = ${invoiceId}`);
  await page.waitForTimeout(600);
  await shot("4-invoice");

  const invBody = await page.locator("body").innerText();
  expect(invBody, "invoice total carried through").toContain(EXPECT_TOTAL);
  // GST breakdown present (CGST/SGST intra-state or IGST inter-state)
  expect(/CGST|SGST|IGST/i.test(invBody), "invoice shows GST split").toBeTruthy();
  console.log(`[chain] STEP 3 invoice total ₹${EXPECT_TOTAL} + GST split  PASS`);

  // ── STEP 4 — record full payment (UPI) ────────────────────────────────────
  await page.getByRole("button", { name: "Record payment" }).click();
  const amount = page.locator('input[name="amountRupees"]');
  await expect(amount).toBeVisible({ timeout: 10_000 });
  const prefill = await amount.inputValue();
  console.log(`[chain] payment amount prefilled = ₹${prefill}`);
  expect(prefill.replace(/\D/g, ""), "payment prefilled to full outstanding").toBe("23600");
  await page.locator('select[name="mode"]').selectOption("upi");
  await page.locator('input[name="paidOn"]').fill(new Date().toISOString().slice(0, 10));
  await page.locator('input[name="reference"]').fill("TEST-UPI-REF-001");
  await shot("5-payment-form");
  await page.getByRole("button", { name: "Save payment" }).click();

  // ── STEP 5 — invoice flips to PAID ────────────────────────────────────────
  await expect(page.getByText("Fully settled")).toBeVisible({ timeout: 20_000 });
  const paidBody = await page.locator("body").innerText();
  expect(/paid/i.test(paidBody), "status badge shows paid").toBeTruthy();
  await shot("6-invoice-paid");
  console.log(`[chain] STEP 4+5 payment recorded, invoice PAID  PASS`);

  // ── STEP 6 — payment reflected on Money ───────────────────────────────────
  await page.goto("/money", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200); // animated numbers settle
  await shot("7-money");
  console.log(`[chain] STEP 6 money page loaded (visual check)  PASS`);

  console.log(
    `[chain] DONE  customer="${customerName}" quote=${quoteId} invoice=${invoiceId} total=₹${EXPECT_TOTAL}`
  );
});
