import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  MFA_COOKIE,
  MFA_COOKIE_MAX_AGE,
  signMfaToken,
  verifyMfaToken,
} from "@/lib/mfa/cookie";
import type { MfaMethod } from "@/lib/mfa/methods";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Phone OTP only works once a paid SMS provider is wired; flip this env on then. */
export const MFA_SMS_ENABLED = process.env.MFA_SMS_ENABLED === "true";

export type MfaCtx = {
  user: User;
  email: string | null;
  phone: string | null;
  totpEnrolled: boolean;
  emailEnabled: boolean;
  phoneEnabled: boolean;
};

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** The Supabase session id — the MFA cookie is bound to this so each login re-checks. */
export async function currentSessionId(supabase: DB): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "";
  return (decodeJwt(session.access_token)?.session_id as string) ?? "";
}

/** Load the signed-in user + their MFA preferences (or null if not signed in). */
export async function loadMfaCtx(supabase: DB): Promise<MfaCtx | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const totpEnrolled = aal?.nextLevel === "aal2"; // a verified TOTP factor exists

  const meta = (user.app_metadata?.mfa ?? {}) as { email?: boolean; phone?: boolean };
  return {
    user,
    email: user.email ?? null,
    phone: user.phone ?? null,
    totpEnrolled,
    emailEnabled: !!meta.email,
    phoneEnabled: !!meta.phone,
  };
}

/** Methods this user can actually use right now (enrolled / on file / provider live). */
export function availableMethods(ctx: MfaCtx): MfaMethod[] {
  const m: MfaMethod[] = [];
  if (ctx.totpEnrolled) m.push("authenticator");
  if (ctx.emailEnabled && ctx.email) m.push("email");
  if (ctx.phoneEnabled && ctx.phone && MFA_SMS_ENABLED) m.push("phone");
  return m;
}

/** Whether the user opted into MFA at all (any method switched on). */
export function mfaEnabled(ctx: MfaCtx): boolean {
  return ctx.totpEnrolled || ctx.emailEnabled || ctx.phoneEnabled;
}

/** True once the second factor has been cleared for this session (AAL2 or signed cookie). */
export async function mfaIsSatisfied(supabase: DB): Promise<boolean> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return true;
  const sid = await currentSessionId(supabase);
  const token = (await cookies()).get(MFA_COOKIE)?.value;
  return verifyMfaToken(token, sid, Date.now());
}

/** Write the signed MFA-passed cookie for the current session. */
export async function markMfaPassed(supabase: DB): Promise<void> {
  const sid = await currentSessionId(supabase);
  if (!sid) return;
  const jar = await cookies();
  jar.set(MFA_COOKIE, signMfaToken(sid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MFA_COOKIE_MAX_AGE,
  });
}

/**
 * Gate decision used by requireSession: does this request need to go to /mfa?
 *
 * For non-owners: enforced only when the user has MFA on AND at least one
 * usable method (so a user whose only method went offline isn't locked out).
 *
 * For OWNER role: MFA is MANDATORY. An owner who has not enrolled ANY MFA
 * method is redirected to /mfa so they can set up MFA before accessing the app.
 *
 * ⚠ REDIRECT LOOP RISK (owner + no enrolled methods):
 *   requireSession() → needsMfaRedirect=true → redirect /mfa
 *   /mfa page → getLoginMfaContext() → mfaEnabled=false → mfaRequired=false → redirect /dashboard
 *   /dashboard → requireSession() → needsMfaRedirect=true → redirect /mfa  …loop
 *
 * To fully resolve this, `getLoginMfaContext` in src/actions/mfa.ts (or the /mfa
 * page itself) must detect the "owner + no enrolled methods" case and render an
 * MFA ENROLLMENT UI instead of redirecting to /dashboard. Until that is wired,
 * the /mfa page will bounce the owner back to /dashboard and the loop will occur.
 * This flag correctly identifies the enforcement point; the UX fix lives in mfa.ts.
 */
export async function needsMfaRedirect(supabase: DB): Promise<boolean> {
  const ctx = await loadMfaCtx(supabase);
  if (!ctx) return false;

  if (!mfaEnabled(ctx)) {
    // OWNER mandatory MFA: even without any method opted in, owners must enroll.
    // Best-effort role lookup — if the RPC fails we don't block the user.
    try {
      const { data } = await supabase.rpc("my_user");
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.role === "owner") return true;
    } catch {
      // Swallow RPC errors — fail open (don't lock out on a DB blip).
    }
    return false;
  }

  if (availableMethods(ctx).length === 0) return false;
  return !(await mfaIsSatisfied(supabase));
}
