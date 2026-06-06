"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneSchema, otpSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export async function sendOtp(phone: string) {
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function verifyOtp(phone: string, token: string) {
  const p = phoneSchema.safeParse(phone);
  const t = otpSchema.safeParse(token);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!t.success) return { error: t.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: p.data,
    token: t.data,
    type: "sms",
  });
  if (error) return { error: error.message };

  const user = await getCurrentUser();
  return { ok: true as const, next: user ? "/dashboard" : "/setup" };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true as const };
}
