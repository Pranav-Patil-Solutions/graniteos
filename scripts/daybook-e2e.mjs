// One-shot E2E: add a daybook task, mark it done, verify both render.
// Run with the dev server up:  node scripts/daybook-e2e.mjs
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3210";
const TASK = "Call Sharma about the Statuario order";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
  defaultViewport: { width: 1366, height: 900 },
});
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim().toLowerCase() === "password")?.click(),
  );
  await page.waitForSelector("input[type=password]");
  await page.type("input[type=email]", "pranavpatil.work@gmail.com");
  await page.type("input[type=password]", "Granite@123");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
    page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Sign in"))?.click()),
  ]);
  await new Promise((r) => setTimeout(r, 2000));

  await page.goto(`${BASE}/daybook`, { waitUntil: "networkidle2" });
  await page.type('input[placeholder^="Add a task"]', TASK);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add")?.click());
  await new Promise((r) => setTimeout(r, 2500));

  let body = await page.evaluate(() => document.body.innerText);
  console.log("task added & visible:", body.includes(TASK));

  await page.evaluate(() => document.querySelector('button[aria-label="Mark done"]')?.click());
  await new Promise((r) => setTimeout(r, 2500));
  body = await page.evaluate(() => document.body.innerText);
  console.log("completed → in 'Done today':", body.includes("Done today") && body.includes(TASK));

  await page.screenshot({ path: "audit/ui-smoke/11-daybook-task-flow.png" });
  console.log("screenshot: audit/ui-smoke/11-daybook-task-flow.png");
} catch (e) {
  console.error("E2E FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
