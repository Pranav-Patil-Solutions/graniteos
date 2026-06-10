// Mint a signed GraniteOS licence for a customer. Requires license-keys/private.pem
// (created by license-keygen.mjs — keep it secret, never commit/ship it).
//
// Usage:
//   node scripts/gen-license.mjs --company "Patil Granites" --days 365 --plan pro --domain patilgranites.in
//
// Output: prints the token and writes license.json. Give the customer the token
// (set as env GRANITEOS_LICENSE on their deployment). --domain is optional and
// locks the licence to that website host.
import { sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const company = arg("company");
if (!company) {
  console.error('Required: --company "Name". Optional: --days 365 --plan pro --domain example.com');
  process.exit(1);
}
const days = parseInt(arg("days", "365"), 10);
const plan = arg("plan", "standard");
const domain = arg("domain", null);

let privPem;
try {
  privPem = readFileSync(new URL("../license-keys/private.pem", import.meta.url), "utf8");
} catch {
  console.error("Missing license-keys/private.pem — run `node scripts/license-keygen.mjs` first.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const payload = { company, plan, iat: now, exp: now + days * 24 * 60 * 60, domain };
const b64u = (b) => Buffer.from(b).toString("base64url");
const body = b64u(JSON.stringify(payload));
const sig = b64u(sign(null, Buffer.from(body), privPem));
const token = `${body}.${sig}`;

const expiresOn = new Date(payload.exp * 1000).toISOString().slice(0, 10);
writeFileSync("license.json", JSON.stringify({ token, company, plan, domain, expires: expiresOn }, null, 2));

console.log(`Licence for "${company}" (${plan})${domain ? ` @ ${domain}` : ""}, valid ${days} days → expires ${expiresOn}`);
console.log("\nGRANITEOS_LICENSE=" + token);
console.log("\nWrote license.json. Set the token as env GRANITEOS_LICENSE on the customer's deployment.");
