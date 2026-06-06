"use server";

import { createClient } from "@/lib/supabase/server";
import { emailSchema, otpSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export async function sendOtp(email: string) {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function verifyOtp(email: string, token: string) {
  const e = emailSchema.safeParse(email);
  const t = otpSchema.safeParse(token);
  if (!e.success) return { error: e.error.issues[0].message };
  if (!t.success) return { error: t.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: e.data,
    token: t.data,
    type: "email",
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
