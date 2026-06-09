"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneSchema, emailSchema, otpSchema, passwordSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { isAllowedLogin, mayCreateUser } from "@/lib/beta-allowlist";

const NOT_INVITED =
  "This is a private beta. Ask the GraniteOS team to add your email or number.";

export type Channel = "phone" | "email" | "password";

export async function sendOtp(channel: Channel, value: string) {
  const supabase = await createClient();

  if (channel === "email") {
    const e = emailSchema.safeParse(value);
    if (!e.success) return { error: e.error.issues[0].message };
    if (!isAllowedLogin(e.data)) return { error: NOT_INVITED };
    const { error } = await supabase.auth.signInWithOtp({
      email: e.data,
      options: { shouldCreateUser: mayCreateUser() },
    });
    if (error) return { error: error.message };
    return { ok: true as const };
  }

  const p = phoneSchema.safeParse(value);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!isAllowedLogin(p.data)) return { error: NOT_INVITED };
  const { error } = await supabase.auth.signInWithOtp({
    phone: p.data,
    options: { shouldCreateUser: mayCreateUser() },
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function verifyOtp(channel: Channel, value: string, token: string) {
  const t = otpSchema.safeParse(token);
  if (!t.success) return { error: t.error.issues[0].message };

  const supabase = await createClient();

  if (channel === "email") {
    const e = emailSchema.safeParse(value);
    if (!e.success) return { error: e.error.issues[0].message };
    const { error } = await supabase.auth.verifyOtp({
      email: e.data,
      token: t.data,
      type: "email",
    });
    if (error) return { error: error.message };
  } else {
    const p = phoneSchema.safeParse(value);
    if (!p.success) return { error: p.error.issues[0].message };
    const { error } = await supabase.auth.verifyOtp({
      phone: p.data,
      token: t.data,
      type: "sms",
    });
    if (error) return { error: error.message };
  }

  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signInPassword(email: string, password: string) {
  const e = emailSchema.safeParse(email);
  const p = passwordSchema.safeParse(password);
  if (!e.success) return { error: e.error.issues[0].message };
  if (!p.success) return { error: p.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: e.data,
    password: p.data,
  });
  if (error) return { error: error.message };

  const user = await getCurrentUser();
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
  if (error) return { error: error.message };

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
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true as const };
}
