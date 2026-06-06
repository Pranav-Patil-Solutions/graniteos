"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneSchema, emailSchema, otpSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export type Channel = "phone" | "email";

export async function sendOtp(channel: Channel, value: string) {
  const supabase = await createClient();

  if (channel === "email") {
    const e = emailSchema.safeParse(value);
    if (!e.success) return { error: e.error.issues[0].message };
    const { error } = await supabase.auth.signInWithOtp({
      email: e.data,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return { ok: true as const };
  }

  const p = phoneSchema.safeParse(value);
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await supabase.auth.signInWithOtp({ phone: p.data });
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

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true as const };
}
