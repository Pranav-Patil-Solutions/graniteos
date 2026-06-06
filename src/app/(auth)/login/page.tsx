"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp } from "@/actions/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await verifyOtp(phone, otp);
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace(redirectTo || res.next!);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-granite-green text-white flex items-center justify-center text-2xl font-bold">
          G
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">GraniteOS</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "phone"
            ? "Sign in to your granite business"
            : `Enter the code sent to ${phone}`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={onSendOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 99999 99999"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-base focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <PrimaryButton loading={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </PrimaryButton>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              style={{ height: 64 }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-center text-2xl tracking-[0.5em] focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <PrimaryButton loading={loading}>
            {loading ? "Verifying..." : "Verify & continue"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Use a different phone number
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function PrimaryButton({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-granite-green text-white font-semibold text-base disabled:opacity-60 hover:opacity-95 transition"
    >
      {children}
    </button>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
      {children}
    </div>
  );
}
