// One-time: generate the Ed25519 signing keypair for GraniteOS licensing, save
// the keys (private stays with YOU, never ship it), and mint a long-lived DEV
// license so local/dev keeps running. Run once:  node scripts/license-keygen.mjs
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const DIR = new URL("../license-keys/", import.meta.url);
mkdirSync(DIR, { recursive: true });

const privPath = new URL("private.pem", DIR);
const pubPath = new URL("public.pem", DIR);

if (existsSync(privPath)) {
  console.error("Refusing to overwrite existing license-keys/private.pem. Delete it first if you really mean to.");
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });
writeFileSync(privPath, privPem);
writeFileSync(pubPath, pubPem);

// Mint a 10-year DEV license so the app runs locally.
const b64u = (b) => Buffer.from(b).toString("base64url");
const payload = {
  company: "GraniteOS DEV",
  plan: "dev",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3650 * 24 * 60 * 60,
  domain: null,
};
const body = b64u(JSON.stringify(payload));
const sig = b64u(sign(null, Buffer.from(body), privateKey));
const token = `${body}.${sig}`;

console.log("=== PUBLIC KEY (embed this in src/lib/license.ts) ===");
console.log(pubPem.trim());
console.log("=== DEV LICENSE TOKEN (put in .env.local as GRANITEOS_LICENSE) ===");
console.log(token);
console.log("=== keys written to license-keys/ (gitignored) ===");
