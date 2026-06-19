// Stateless "this session has passed MFA" marker.
//
// Email/phone OTP verification doesn't raise the Supabase session to AAL2 (only the
// authenticator/TOTP factor does), so we mint our own HMAC-signed cookie to record
// that the second factor was cleared. It is bound to the Supabase *session id*, so a
// fresh login (new session) always requires MFA again, and it cannot be forged
// without the server secret.

import crypto from "node:crypto";

export const MFA_COOKIE = "gos_mfa";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  const s = process.env.MFA_COOKIE_SECRET;
  if (s) return s;
  // Never fall back to the service-role key (a leak there must not also forge MFA
  // cookies) and never ship a hardcoded secret. Require an explicit secret in prod.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MFA_COOKIE_SECRET is not set — refusing to sign/verify MFA cookies with an insecure fallback.",
    );
  }
  return "graniteos-dev-only-mfa-secret-not-for-production";
}

function hmac(body: string): string {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

function timingEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Create a signed token marking `sessionId` as MFA-passed until now + TTL. */
export function signMfaToken(sessionId: string, now: number = Date.now()): string {
  const body = `${sessionId}.${now + TTL_MS}`;
  return `${Buffer.from(body).toString("base64url")}.${hmac(body)}`;
}

/** True only if `token` is a valid, unexpired signature for exactly `sessionId`. */
export function verifyMfaToken(
  token: string | undefined | null,
  sessionId: string,
  now: number = Date.now(),
): boolean {
  if (!token || !sessionId) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return false;
  }
  if (!timingEqual(hmac(body), sig)) return false;

  const sep = body.lastIndexOf(".");
  const sid = body.slice(0, sep);
  const exp = Number(body.slice(sep + 1));
  if (!sid || !Number.isFinite(exp)) return false;
  if (sid !== sessionId) return false;
  return now <= exp;
}

export const MFA_COOKIE_MAX_AGE = Math.floor(TTL_MS / 1000);
