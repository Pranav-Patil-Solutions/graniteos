// Button → database audit. A driven browser presses every data-adding button
// with real data; after each press the row is verified in the live DB via the
// service role. All test data is tagged "E2E" and deleted at the end.
// Run with the dev server up:  node scripts/buttons-e2e.mjs [baseUrl]
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] || "http://localhost:3210";
const EMAIL = "pranavpatil.work@gmail.com";
const PASSWORD = "Granite@123";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const results = [];
const pass = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// tiny valid 1x1 PNG for the photo-upload test
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
mkdirSync(new URL("../audit/", import.meta.url), { recursive: true });
const PNG_PATH = new URL("../audit/e2e-photo.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
writeFileSync(PNG_PATH, PNG);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
  defaultViewport: { width: 1366, height: 1100 },
});
const page = await browser.newPage();

const clickByText = (text, tag = "button") =>
  page.evaluate(
    (t, tg) => {
      const el = [...document.querySelectorAll(tg)].find((b) => b.textContent.trim().includes(t));
      if (el) el.click();
      return !!el;
    },
    text, tag,
  );
const submitForm = () => page.evaluate(() => { document.querySelector("form button[type=submit]")?.click(); });
const fill = async (sel, val) => { await page.click(sel, { clickCount: 3 }).catch(() => {}); await page.type(sel, String(val)); };

// ids created during the run (for cleanup)
const made = { partyIds: [], blockId: null, jobId: null, inviteUserId: null, invoiceIds: [], taskTitle: "E2E daybook task" };
let companyId = null;

async function cleanup() {
  try {
    if (made.invoiceIds.length) {
      await db.from("payments").delete().in("invoice_id", made.invoiceIds);
      await db.from("invoices").delete().in("id", made.invoiceIds);
    }
    if (made.blockId) {
      await db.from("slabs").delete().eq("block_id", made.blockId);
      await db.from("blocks").delete().eq("id", made.blockId);
      if (companyId) await db.storage.from("stone-photos").remove([`${companyId}/block-${made.blockId}.png`]);
    }
    if (made.jobId) await db.from("production_jobs").delete().eq("id", made.jobId);
    if (made.inviteUserId) await db.from("users").delete().eq("id", made.inviteUserId);
    if (made.partyIds.length) await db.from("parties").delete().in("id", made.partyIds);
    await db.from("daybook_tasks").delete().eq("title", made.taskTitle);
  } catch (e) {
    console.error("cleanup issue:", e.message);
  }
}

try {
  // ── login ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
  // wait for hydration: the channel tabs only respond once React is up
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some((b) => b.textContent.trim().toLowerCase() === "password"),
    { timeout: 30000 },
  );
  for (let i = 0; i < 10; i++) {
    await clickByText("password");
    const ready = await page.$("input[type=password]");
    if (ready) break;
    await sleep(700);
  }
  await page.waitForSelector("input[type=password]");
  await page.type("input[type=email]", EMAIL);
  await page.type("input[type=password]", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
    clickByText("Sign in"),
  ]);
  await sleep(2000);
  const { data: meRow } = await db.from("users").select("company_id").eq("name", "Pranav Patil").limit(1).single();
  companyId = meRow?.company_id ?? null;

  // ── 1. Add customer (parties) ──
  await page.goto(`${BASE}/parties`, { waitUntil: "networkidle2" });
  await clickByText("Add customer");
  await page.waitForSelector('input[name="name"]');
  await fill('input[name="name"]', "E2E Test Customer");
  await fill('input[name="city"]', "Testpur");
  await fill('input[name="phone"]', "+91 98765 00001");
  await fill('input[name="email"]', "e2e@test.invalid");
  await fill('input[placeholder="Proprietor or registered name"]', "E2E Owner");
  await fill('input[name="address"]', "12 Test Street");
  await fill('textarea[name="notes"]', "created by button audit");
  await submitForm();
  await sleep(2500);
  {
    const { data: p } = await db.from("parties").select("id, kind, phone, email, legal_name, address, notes").eq("name", "E2E Test Customer").single();
    if (p) made.partyIds.push(p.id);
    pass("Add customer → parties row (all new fields)", !!p && p.kind === "customer" && p.email === "e2e@test.invalid" && p.legal_name === "E2E Owner" && p.address === "12 Test Street" && !!p.notes);
  }

  // ── 2. Add supplier ──
  await clickByText("Suppliers");
  await sleep(600);
  await clickByText("Add supplier");
  await page.waitForSelector('input[name="name"]');
  await fill('input[name="name"]', "E2E Test Supplier");
  await fill('input[name="city"]', "Testpur");
  await submitForm();
  await sleep(2500);
  {
    const { data: p } = await db.from("parties").select("id, kind").eq("name", "E2E Test Supplier").single();
    if (p) made.partyIds.push(p.id);
    pass("Add supplier → parties row (kind=supplier)", !!p && p.kind === "supplier");
  }

  // ── 3. Add block + photo ──
  await page.goto(`${BASE}/inventory`, { waitUntil: "networkidle2" });
  await clickByText("Add a stone block");
  await page.waitForSelector('input[name="label"]');
  await fill('input[name="label"]', "E2E-BLK Test Block");
  await fill('input[name="material"]', "E2E Black Galaxy");
  await fill('input[name="lengthCm"]', "280");
  await fill('input[name="widthCm"]', "180");
  await fill('input[name="heightCm"]', "160");
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(PNG_PATH);
  await sleep(400);
  await submitForm();
  await sleep(4000);
  {
    const { data: b } = await db.from("blocks").select("id, material, photo_path").eq("label", "E2E-BLK Test Block").single();
    made.blockId = b?.id ?? null;
    pass("Add block → blocks row", !!b && b.material === "E2E Black Galaxy");
    let photoOk = !!b?.photo_path;
    if (photoOk) {
      const resp = await fetch(b.photo_path);
      photoOk = resp.ok;
    }
    pass("Block photo upload → storage + photo_path serves", photoOk, b?.photo_path ? "" : "photo_path empty");
  }

  // ── 4. Add slab on the block page ──
  if (made.blockId) {
    await page.goto(`${BASE}/inventory/${made.blockId}`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[name="lengthIn"]');
    await fill('input[name="lengthIn"]', "120");
    await fill('input[name="widthIn"]', "75");
    await fill('input[name="rateRupees"]', "250");
    await submitForm();
    await sleep(2500);
    const { data: s } = await db.from("slabs").select("id, sqft, rate_paise").eq("block_id", made.blockId).limit(1);
    pass("Add slab → slabs row (sqft auto-computed)", !!s?.length && Number(s[0].sqft) === 62.5 && Number(s[0].rate_paise) === 25000, s?.length ? `sqft=${s[0].sqft}` : "no row");
  } else {
    pass("Add slab → slabs row", false, "skipped — block create failed");
  }

  // ── 5. New production job + advance stage ──
  await page.goto(`${BASE}/fabrication`, { waitUntil: "networkidle2" });
  await clickByText("New production job");
  await page.waitForSelector('input[name="title"]');
  await fill('input[name="title"]', "E2E polish job");
  await fill('input[name="qtySqft"]', "100");
  await submitForm();
  await sleep(2500);
  {
    const { data: j } = await db.from("production_jobs").select("id, stage").eq("title", "E2E polish job").single();
    made.jobId = j?.id ?? null;
    pass("New production job → production_jobs row (queued)", !!j && j.stage === "queued");
  }
  if (made.jobId) {
    await clickByText("Advance to");
    await sleep(2500);
    const { data: j2 } = await db.from("production_jobs").select("stage").eq("id", made.jobId).single();
    pass("Advance button → stage moves to cutting", j2?.stage === "cutting", `stage=${j2?.stage}`);
  }

  // ── 6. Invite team member (REAL pgcrypto test) ──
  await page.goto(`${BASE}/team`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[name="name"]');
  await fill('input[name="name"]', "E2E Invitee");
  await fill('input[name="phone"]', "+91 98765 00002");
  await page.select('select[name="role"]', "sales_manager").catch(() => {});
  await clickByText("Send invite");
  await sleep(3000);
  {
    const { data: u } = await db.from("users").select("id, status, invite_token").eq("name", "E2E Invitee").single();
    made.inviteUserId = u?.id ?? null;
    pass("Send invite → users row + 48-char token (pgcrypto works)", !!u && u.status === "invited" && (u.invite_token ?? "").length === 48);
  }

  // ── 7. Record payment on an invoice ──
  const custId = made.partyIds[0];
  if (companyId && custId) {
    const { data: inv } = await db.from("invoices")
      .insert({ company_id: companyId, customer_id: custId, invoice_no: "E2E-INV-1", subtotal_paise: 1000000, total_paise: 1000000 })
      .select("id").single();
    if (inv) made.invoiceIds.push(inv.id);
    await page.goto(`${BASE}/invoices/${inv.id}`, { waitUntil: "networkidle2" });
    await clickByText("Record payment");
    await sleep(600);
    await submitForm(); // amount defaults to the full outstanding
    await sleep(3000);
    const { data: pay } = await db.from("payments").select("amount_paise").eq("invoice_id", inv.id);
    const { data: inv2 } = await db.from("invoices").select("status").eq("id", inv.id).single();
    pass("Record payment → payments row + invoice marked paid", !!pay?.length && Number(pay[0].amount_paise) === 1000000 && inv2?.status === "paid", `status=${inv2?.status}`);
  } else {
    pass("Record payment", false, "skipped — no test customer");
  }

  // ── 8. Batch payment ──
  if (companyId && custId) {
    const { data: inv } = await db.from("invoices")
      .insert({ company_id: companyId, customer_id: custId, invoice_no: "E2E-INV-2", subtotal_paise: 500000, total_paise: 500000 })
      .select("id").single();
    if (inv) made.invoiceIds.push(inv.id);
    await page.goto(`${BASE}/batch-payment`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      const sel = document.querySelector("select");
      const opt = [...sel.options].find((o) => o.textContent.includes("E2E Test Customer"));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await fill('input[placeholder="50000"]', "5000");
    await clickByText("Record batch payment");
    await sleep(3000);
    const { data: pay } = await db.from("payments").select("amount_paise").eq("invoice_id", inv.id);
    const { data: inv2 } = await db.from("invoices").select("status").eq("id", inv.id).single();
    pass("Batch payment → FIFO allocation + invoice paid", !!pay?.length && Number(pay[0].amount_paise) === 500000 && inv2?.status === "paid", `status=${inv2?.status}`);
  }

  // ── 9. Daybook add + complete (re-verify) ──
  await page.goto(`${BASE}/daybook`, { waitUntil: "networkidle2" });
  await page.type('input[placeholder^="Add a task"]', made.taskTitle);
  await clickByText("Add");
  await sleep(2500);
  {
    const { data: t } = await db.from("daybook_tasks").select("id, status").eq("title", made.taskTitle).single();
    pass("Daybook Add → daybook_tasks row (open)", !!t && t.status === "open");
  }
  await page.evaluate(() => document.querySelector('button[aria-label="Mark done"]')?.click());
  await sleep(2500);
  {
    const { data: t } = await db.from("daybook_tasks").select("status, completed_at").eq("title", made.taskTitle).single();
    pass("Daybook tick → status done + completed_at stamped", t?.status === "done" && !!t?.completed_at);
  }
} catch (e) {
  console.error("AUDIT ABORTED:", e.message);
  results.push({ name: "audit run", ok: false, detail: e.message });
} finally {
  await cleanup();
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nBUTTON AUDIT: ${results.length - failed}/${results.length} PASS${failed ? ` — ${failed} FAILURE(S)` : ""}`);
process.exit(failed ? 1 : 0);
