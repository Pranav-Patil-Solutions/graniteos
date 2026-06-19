import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load .env.local into the test runner's env (Next loads it for the app, but
// the Playwright process needs it too — the DB-gated specs read it to decide
// whether to run). No dotenv dependency required.
try {
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) {
      const k = line.slice(0, i).trim();
      if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim();
    }
  }
} catch {
  /* no .env.local — gated specs will skip */
}

// Desktop + phone + tablet matrix. iPhone/iPad use WebKit, Pixel/Desktop use
// Chromium (Playwright device descriptors pick the engine). Install both with:
//   npx playwright install chromium webkit
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 120_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "Desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iPhone", use: { ...devices["iPhone 13"] } },
    { name: "Android", use: { ...devices["Pixel 5"] } },
    { name: "Tablet", use: { ...devices["iPad Mini"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/showcase",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
