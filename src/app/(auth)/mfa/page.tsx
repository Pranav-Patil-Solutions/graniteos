import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLoginMfaContext, getMfaState } from "@/actions/mfa";
import MfaVerify from "@/components/mfa/MfaVerify";
import MfaPanel from "@/components/settings/MfaPanel";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getLoginMfaContext();

  // Owner with no MFA yet → enrol HERE (settings/security sits behind requireSession,
  // which would itself redirect an un-enrolled owner back to /mfa). Rendering the
  // enrollment panel here turns the gate into a single redirect, not a loop.
  if (ctx.mustEnroll) {
    const state = await getMfaState();
    // Only offer "continue" once a method is actually enrolled. Before that, the
    // link would bounce /dashboard → requireSession → /mfa forever.
    const anyOn = state.authenticator || state.email || state.phone;
    return (
      <div>
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative w-16 h-16 rounded-full grid place-items-center border border-gold/40 bg-gradient-to-b from-white/[0.07] to-transparent shadow-[0_0_34px_rgba(200,162,75,0.28)]">
            <ShieldCheck className="w-7 h-7 text-gold" aria-hidden />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-white tracking-tight">
            Set up two-factor
          </h1>
          <p className="mt-3 text-sm text-slate-300 max-w-xs">
            Two-factor authentication is required for owner accounts. Add a method below to
            secure your business data, then continue.
          </p>
        </div>

        <MfaPanel initial={state} />

        {anyOn ? (
          <p className="mt-6 text-center text-sm">
            <Link href={redirectTo || "/dashboard"} className="text-gold hover:underline">
              Continue to your dashboard →
            </Link>
          </p>
        ) : (
          <p className="mt-6 text-center text-xs text-slate-500">
            Add a method above to continue.
          </p>
        )}
      </div>
    );
  }

  // Already verified (or no MFA needed) → straight on.
  if (!ctx.mfaRequired) redirect(redirectTo || "/dashboard");

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-7">
        <div className="relative w-16 h-16 rounded-full grid place-items-center border border-gold/40 bg-gradient-to-b from-white/[0.07] to-transparent shadow-[0_0_34px_rgba(200,162,75,0.28)]">
          <ShieldCheck className="w-7 h-7 text-gold" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-white tracking-tight">
          Verify it&apos;s you
        </h1>
        <p className="mt-3 text-sm text-slate-300 max-w-xs">
          Two-factor authentication is on for your account. Choose how to confirm this sign-in.
        </p>
      </div>

      <MfaVerify
        methods={ctx.methods}
        maskedEmail={ctx.maskedEmail}
        maskedPhone={ctx.maskedPhone}
        redirectTo={redirectTo ?? null}
      />
    </div>
  );
}
