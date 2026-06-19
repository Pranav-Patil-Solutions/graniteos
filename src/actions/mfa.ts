"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { otpSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { maskEmail, maskPhone, type MfaMethod } from "@/lib/mfa/methods";
import {
  loadMfaCtx,
  availableMethods,
  mfaEnabled,
  mfaIsSatisfied,
  markMfaPassed,
  MFA_SMS_ENABLED,
} from "@/lib/mfa/server";

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN / VERIFY CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

/** What the MFA screen needs: is MFA required, which methods, and masked targets. */
export async function getLoginMfaContext() {
  const supabase = await createClient();
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) {
    return {
      mfaRequired: false as const,
      mustEnroll: false as const,
      methods: [] as MfaMethod[],
      maskedEmail: "",
      maskedPhone: "",
    };
  }
  const methods = availableMethods(ctx);
  const satisfied = await mfaIsSatisfied(supabase);
  // Owners MUST have MFA. If an owner hasn't enrolled any method, the /mfa screen
  // shows the enrollment panel (instead of bouncing to /dashboard, which would loop
  // against needsMfaRedirect). Non-owners are never forced to enrol.
  const me = await getCurrentUser();
  const mustEnroll = me?.role === "owner" && !mfaEnabled(ctx) && !satisfied;
  return {
    mfaRequired: mfaEnabled(ctx) && methods.length > 0 && !satisfied,
    mustEnroll,
    methods,
    maskedEmail: maskEmail(ctx.email),
    maskedPhone: maskPhone(ctx.phone),
  };
}

/** Send a one-time code to the user's email or phone (authenticator needs no send). */
export async function sendMfaCode(method: MfaMethod) {
  const supabase = await createClient();
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) return { error: "Your session expired — please sign in again." };

  if (method === "email") {
    if (!ctx.email) return { error: "No email is on file for this account." };
    const { error } = await supabase.auth.signInWithOtp({
      email: ctx.email,
      options: { shouldCreateUser: false },
    });
    if (error) return { error: sendError(error.message) };
    return { ok: true as const, masked: maskEmail(ctx.email) };
  }

  if (method === "phone") {
    if (!MFA_SMS_ENABLED) return { error: "Phone codes aren't available yet on this account." };
    if (!ctx.phone) return { error: "No phone number is on file for this account." };
    const { error } = await supabase.auth.signInWithOtp({
      phone: ctx.phone,
      options: { shouldCreateUser: false },
    });
    if (error) return { error: sendError(error.message) };
    return { ok: true as const, masked: maskPhone(ctx.phone) };
  }

  return { error: "This method doesn't use a sent code." };
}

/** Verify an email/phone OTP, then mark the session MFA-passed. */
export async function verifyMfaCode(method: MfaMethod, code: string) {
  const c = otpSchema.safeParse(code);
  if (!c.success) return { error: c.error.issues[0].message };

  const supabase = await createClient();
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) return { error: "Your session expired — please sign in again." };

  if (method === "email") {
    if (!ctx.email) return { error: "No email is on file for this account." };
    const { error } = await supabase.auth.verifyOtp({ email: ctx.email, token: c.data, type: "email" });
    if (error) return { error: verifyError(error.message) };
  } else if (method === "phone") {
    if (!ctx.phone) return { error: "No phone number is on file for this account." };
    const { error } = await supabase.auth.verifyOtp({ phone: ctx.phone, token: c.data, type: "sms" });
    if (error) return { error: verifyError(error.message) };
  } else {
    return { error: "Use the authenticator step for this method." };
  }

  await markMfaPassed(supabase);
  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

/** Verify a TOTP code from the authenticator app (raises the session to AAL2). */
export async function verifyAuthenticator(code: string) {
  const c = otpSchema.safeParse(code);
  if (!c.success) return { error: c.error.issues[0].message };

  const supabase = await createClient();
  const { data: list, error: lErr } = await supabase.auth.mfa.listFactors();
  if (lErr) return { error: lErr.message };
  const factor = list?.totp?.[0];
  if (!factor) return { error: "No authenticator is set up on this account." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: c.data });
  if (error) return { error: verifyError(error.message) };

  await markMfaPassed(supabase);
  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — manage which methods are on
// ─────────────────────────────────────────────────────────────────────────────

export async function getMfaState() {
  const supabase = await createClient();
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) {
    return {
      authenticator: false,
      authenticatorFactorId: null as string | null,
      email: false,
      phone: false,
      phoneAvailable: false,
      hasPhone: false,
      maskedEmail: "",
      maskedPhone: "",
    };
  }
  const { data: list } = await supabase.auth.mfa.listFactors();
  const totp = list?.totp?.[0];
  return {
    authenticator: !!totp,
    authenticatorFactorId: totp?.id ?? null,
    email: ctx.emailEnabled,
    phone: ctx.phoneEnabled,
    phoneAvailable: MFA_SMS_ENABLED && !!ctx.phone,
    hasPhone: !!ctx.phone,
    maskedEmail: maskEmail(ctx.email),
    maskedPhone: maskPhone(ctx.phone),
  };
}

/** Turn the email factor on/off (stored in service-role app_metadata, unforgeable). */
export async function setEmailMfa(enabled: boolean) {
  return setMetaFlag("email", enabled);
}

/** Turn the phone factor on/off (only when a number is on file + SMS is live). */
export async function setPhoneMfa(enabled: boolean) {
  const supabase = await createClient();
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) return { error: "Your session expired — please sign in again." };
  if (enabled && (!ctx.phone || !MFA_SMS_ENABLED)) {
    return { error: "Phone verification isn't available yet (needs a number on file + SMS setup)." };
  }
  return setMetaFlag("phone", enabled, ctx);
}

// ── Authenticator (TOTP) enrollment ───────────────────────────────────────────

export async function startEnroll() {
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of (list?.all ?? []).filter((x) => x.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "GraniteOS" });
  if (error || !data) return { error: setupError(error?.message ?? "Could not start setup.") };
  return { ok: true as const, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmEnroll(factorId: string, code: string) {
  const c = otpSchema.safeParse(code);
  if (!c.success) return { error: c.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: c.data });
  if (error) return { error: verifyError(error.message) };
  await markMfaPassed(supabase);
  return { ok: true as const };
}

export async function disableAuthenticator(factorId: string) {
  const supabase = await createClient();
  // Disabling the second factor must require a verified (AAL2) session — mirrors
  // setMetaFlag's guard so a stolen, un-verified session can't strip MFA off.
  if (!(await mfaIsSatisfied(supabase))) {
    return { error: "Verify your current two-factor first to turn this off." };
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: verifyError(error.message) };
  return { ok: true as const };
}

// ── internals ─────────────────────────────────────────────────────────────────

async function setMetaFlag(
  key: "email" | "phone",
  enabled: boolean,
  preloaded?: Awaited<ReturnType<typeof loadMfaCtx>>,
) {
  const supabase = await createClient();
  const ctx = preloaded ?? (await loadMfaCtx(supabase));
  if (!ctx) return { error: "Your session expired — please sign in again." };

  // Turning a factor OFF requires a verified session (so a stolen, un-verified
  // session can't weaken MFA). Turning one ON is always allowed.
  if (!enabled && mfaEnabled(ctx) && !(await mfaIsSatisfied(supabase))) {
    return { error: "Verify your current two-factor first to turn this off." };
  }
  if (key === "email" && enabled && !ctx.email) {
    return { error: "No email is on file for this account." };
  }

  const admin = createAdminClient();
  const { data: got } = await admin.auth.admin.getUserById(ctx.user.id);
  const current = (got.user?.app_metadata?.mfa ?? {}) as Record<string, boolean>;
  const { error } = await admin.auth.admin.updateUserById(ctx.user.id, {
    app_metadata: { mfa: { ...current, [key]: enabled } },
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

function setupError(msg: string) {
  if (/not enabled|disabled|unsupported|not allowed/i.test(msg)) {
    return "Two-factor isn't switched on for this project yet. Ask the GraniteOS team to enable it.";
  }
  return msg;
}

function sendError(msg: string) {
  if (/rate|too many|limit|seconds/i.test(msg)) {
    return "Too many requests — wait a minute, then try again.";
  }
  return msg;
}

function verifyError(msg: string) {
  if (/expired|otp_expired/i.test(msg)) return "That code has expired — tap Resend to get a new one.";
  if (/aal2|insufficient|level/i.test(msg)) return "Please sign in with your authenticator to change this.";
  if (/invalid|incorrect|nonce|mismatch|token|not found/i.test(msg)) {
    return "That code didn't match — check it and try again.";
  }
  return msg;
}
