"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { phoneSchema, emailSchema, otpSchema, passwordSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { needsMfaRedirect } from "@/lib/mfa/server";
import { isAllowedLogin, mayCreateUser } from "@/lib/beta-allowlist";
import { rateLimit } from "@/lib/ratelimit";
import { logSecurityEvent } from "@/lib/security-log";

const NOT_INVITED =
  "This is a private beta. Ask the GraniteOS team to add your email or number.";

export type Channel = "phone" | "email" | "password";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Best-effort caller IP from standard proxy headers (same pattern as visualize.ts). */
async function getIp(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return hdrs.get("x-real-ip") ?? null;
  } catch {
    return null;
  }
}

/**
 * Generic error for OTP send failures.
 * Never surfaces raw Supabase internals (error codes, table names, etc.) to the client.
 */
function authSendError(msg: string): string {
  if (/rate|too many|limit|seconds|quota/i.test(msg)) {
    return "Too many requests — please wait a moment and try again.";
  }
  return "We couldn't send the code. Please check your details and try again.";
}

/**
 * Generic error for OTP verify failures.
 * Maps known patterns to friendly copy; everything else is kept generic.
 */
function authVerifyError(msg: string): string {
  if (/expired|otp_expired/i.test(msg)) {
    return "That code has expired — tap Resend to get a new one.";
  }
  if (/invalid|incorrect|wrong|not found|mismatch|nonce|token/i.test(msg)) {
    return "That code didn't match — check it and try again.";
  }
  if (/rate|too many|limit/i.test(msg)) {
    return "Too many attempts — please wait and try again.";
  }
  return "Verification failed. Please try again.";
}

// ── Actions ────────────────────────────────────────────────────────────────────

export async function sendOtp(channel: Channel, value: string) {
  const ip = await getIp();
  const supabase = await createClient();

  if (channel === "email") {
    const e = emailSchema.safeParse(value);
    if (!e.success) return { error: e.error.issues[0].message };
    if (!isAllowedLogin(e.data)) return { error: NOT_INVITED };

    // Rate limit: max 5 OTP sends per email+IP per 10 minutes.
    // Best-effort (in-memory); Upstash/KV is the production upgrade.
    const rl = rateLimit(`otp-send:${e.data}:${ip ?? "unknown"}`, 5, 10 * 60_000);
    if (!rl.ok) {
      const waitSec = Math.ceil(rl.retryAfterMs / 1000);
      return { error: `Too many code requests. Please wait ${waitSec} seconds and try again.` };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: e.data,
      options: { shouldCreateUser: mayCreateUser() },
    });
    if (error) return { error: authSendError(error.message) };

    void logSecurityEvent({
      eventType: "otp_sent",
      detail: { channel: "email" },
      ip,
    });
    return { ok: true as const };
  }

  const p = phoneSchema.safeParse(value);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!isAllowedLogin(p.data)) return { error: NOT_INVITED };

  // Rate limit: max 5 OTP sends per phone+IP per 10 minutes.
  const rl = rateLimit(`otp-send:${p.data}:${ip ?? "unknown"}`, 5, 10 * 60_000);
  if (!rl.ok) {
    const waitSec = Math.ceil(rl.retryAfterMs / 1000);
    return { error: `Too many code requests. Please wait ${waitSec} seconds and try again.` };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: p.data,
    options: { shouldCreateUser: mayCreateUser() },
  });
  if (error) return { error: authSendError(error.message) };

  void logSecurityEvent({
    eventType: "otp_sent",
    detail: { channel: "phone" },
    ip,
  });
  return { ok: true as const };
}

export async function verifyOtp(channel: Channel, value: string, token: string) {
  const t = otpSchema.safeParse(token);
  if (!t.success) return { error: t.error.issues[0].message };

  const ip = await getIp();
  const supabase = await createClient();

  if (channel === "email") {
    const e = emailSchema.safeParse(value);
    if (!e.success) return { error: e.error.issues[0].message };

    // Rate limit: max 10 verify attempts per email+IP per 10 minutes.
    const rl = rateLimit(`otp-verify:${e.data}:${ip ?? "unknown"}`, 10, 10 * 60_000);
    if (!rl.ok) {
      const waitSec = Math.ceil(rl.retryAfterMs / 1000);
      return { error: `Too many attempts. Please wait ${waitSec} seconds and try again.` };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: e.data,
      token: t.data,
      type: "email",
    });
    if (error) {
      void logSecurityEvent({ eventType: "otp_verify_failed", detail: { channel: "email" }, ip });
      return { error: authVerifyError(error.message) };
    }
  } else {
    const p = phoneSchema.safeParse(value);
    if (!p.success) return { error: p.error.issues[0].message };

    // Rate limit: max 10 verify attempts per phone+IP per 10 minutes.
    const rl = rateLimit(`otp-verify:${p.data}:${ip ?? "unknown"}`, 10, 10 * 60_000);
    if (!rl.ok) {
      const waitSec = Math.ceil(rl.retryAfterMs / 1000);
      return { error: `Too many attempts. Please wait ${waitSec} seconds and try again.` };
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: p.data,
      token: t.data,
      type: "sms",
    });
    if (error) {
      void logSecurityEvent({ eventType: "otp_verify_failed", detail: { channel: "phone" }, ip });
      return { error: authVerifyError(error.message) };
    }
  }

  // If this user has 2FA enabled, the OTP login only clears the first factor.
  if (await needsMfaRedirect(supabase)) {
    return { ok: true as const, mfaRequired: true as const, next: "/mfa" };
  }

  const user = await getCurrentUser();
  void logSecurityEvent({
    actorUserId: user?.id ?? null,
    companyId: user?.company_id ?? null,
    eventType: "login_success",
    detail: { channel },
    ip,
  });
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signInPassword(email: string, password: string) {
  const e = emailSchema.safeParse(email);
  const p = passwordSchema.safeParse(password);
  if (!e.success) return { error: e.error.issues[0].message };
  if (!p.success) return { error: p.error.issues[0].message };
  // Same beta gate the OTP + signup paths enforce — a removed-from-allowlist
  // account must not be able to slip in through the password path.
  if (!isAllowedLogin(e.data)) return { error: NOT_INVITED };

  const ip = await getIp();
  // App-level brute-force / credential-stuffing guard (the OTP paths have one too).
  const rl = rateLimit(`pw-signin:${e.data}:${ip ?? "unknown"}`, 10, 10 * 60_000);
  if (!rl.ok) {
    const waitSec = Math.ceil(rl.retryAfterMs / 1000);
    return { error: `Too many attempts. Please wait ${waitSec} seconds and try again.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: e.data,
    password: p.data,
  });
  // Generic error — never leak "User not found" or internal Supabase codes.
  if (error) {
    void logSecurityEvent({ eventType: "login_failed", detail: { channel: "password" }, ip });
    return { error: "Invalid email or password." };
  }

  // Password is the first factor. If 2FA is on, hand off to the MFA screen.
  if (await needsMfaRedirect(supabase)) {
    return { ok: true as const, mfaRequired: true as const, next: "/mfa" };
  }

  const user = await getCurrentUser();
  void logSecurityEvent({
    actorUserId: user?.id ?? null,
    companyId: user?.company_id ?? null,
    eventType: "login_success",
    detail: { channel: "password" },
    ip,
  });
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signUpPassword(email: string, password: string) {
  const e = emailSchema.safeParse(email);
  const p = passwordSchema.safeParse(password);
  if (!e.success) return { error: e.error.issues[0].message };
  if (!p.success) return { error: p.error.issues[0].message };
  if (!isAllowedLogin(e.data)) return { error: NOT_INVITED };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: e.data,
    password: p.data,
  });
  // Generic error — never surface Supabase internals to the client.
  if (error) return { error: "Could not create account. Please try again." };

  // If email confirmation is required, Supabase returns no session.
  if (!data.session) {
    return {
      error: "Account created. Confirm it via the email link, then sign in.",
    };
  }

  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signOutAction() {
  const ip = await getIp();
  const supabase = await createClient();

  // Capture identity before the session is torn down.
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* best-effort */ }

  void logSecurityEvent({ actorUserId: userId, eventType: "signout", ip });
  await supabase.auth.signOut();
  return { ok: true as const };
}
