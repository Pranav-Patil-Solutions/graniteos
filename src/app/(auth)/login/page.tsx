"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  sendOtp,
  verifyOtp,
  signInPassword,
  signUpPassword,
  type Channel,
} from "@/actions/auth";
import { Button } from "@/components/ui/Button";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");

  const [channel, setChannel] = useState<Channel>("phone");
  const [step, setStep] = useState<"identify" | "otp">("identify");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [pwMode, setPwMode] = useState<"signin" | "signup">("signin");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function goNext(next: string) {
    router.replace(redirectTo || next);
    router.refresh();
  }

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await sendOtp(channel, value);
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await verifyOtp(channel, value, otp);
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    goNext(res.next!);
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res =
      pwMode === "signin"
        ? await signInPassword(value, password)
        : await signUpPassword(value, password);
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    goNext(res.next!);
  }

  function pickChannel(c: Channel) {
    setChannel(c);
    setStep("identify");
    setValue("");
    setPassword("");
    setOtp("");
    setError("");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center text-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center text-2xl font-extrabold shadow-lg shadow-granite-green2/40">
          G
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">GraniteOS</h1>
        <p className="mt-1 text-sm text-slate-400">
          {step === "otp"
            ? `Enter the code sent to ${value}`
            : "Sign in to your granite business"}
        </p>
      </div>

      {/* Phone / Email / Password toggle */}
      {step === "identify" && (
        <div className="grid grid-cols-3 gap-1 p-1 mb-4 rounded-xl bg-white/[0.04] border border-graphite-600">
          {(["phone", "email", "password"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickChannel(c)}
              className={`rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                channel === c ? "bg-gold/15 text-gold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* PASSWORD mode */}
      {channel === "password" ? (
        <form onSubmit={onPassword} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Email address</span>
            <input
              suppressHydrationWarning
              type="email"
              inputMode="email"
              autoComplete="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="you@email.com"
              className="mt-1.5 w-full text-base focus:border-gold outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Password</span>
            <input
              suppressHydrationWarning
              type="password"
              autoComplete={pwMode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1.5 w-full text-base focus:border-gold outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <Button type="submit" variant="press" className="w-full" disabled={loading}>
            {loading
              ? "Please wait..."
              : pwMode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setPwMode(pwMode === "signin" ? "signup" : "signin");
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-300"
          >
            {pwMode === "signin"
              ? "First time here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      ) : step === "identify" ? (
        /* PHONE / EMAIL — step 1: identifier */
        <form onSubmit={onSendOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              {channel === "phone" ? "Phone number" : "Email address"}
            </span>
            <input
              suppressHydrationWarning
              key={channel}
              type={channel === "phone" ? "tel" : "email"}
              inputMode={channel === "phone" ? "tel" : "email"}
              autoComplete={channel === "phone" ? "tel" : "email"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={channel === "phone" ? "+91 99999 99999" : "you@email.com"}
              className="mt-1.5 w-full text-base focus:border-gold outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <Button type="submit" variant="press" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send code"}
          </Button>
        </form>
      ) : (
        /* PHONE / EMAIL — step 2: OTP */
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Verification code</span>
            <input
              suppressHydrationWarning
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              style={{ height: 64 }}
              className="mt-1.5 w-full text-center text-2xl tracking-[0.5em] focus:border-gold outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <Button type="submit" variant="press" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("identify");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-300"
          >
            Use a different {channel === "phone" ? "phone number" : "email"}
          </button>
        </form>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
      {children}
    </div>
  );
}
