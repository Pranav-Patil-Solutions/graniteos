"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { signInPassword, signUpPassword } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwMode, setPwMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function finish(res: { next?: string; mfaRequired?: boolean }) {
    if (res.mfaRequired) {
      const q = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
      router.replace(`/mfa${q}`);
    } else {
      router.replace(redirectTo || res.next || "/dashboard");
    }
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res =
      pwMode === "signin"
        ? await signInPassword(email, password)
        : await signUpPassword(email, password);
    if ("error" in res) {
      setLoading(false);
      return setError(res.error ?? "");
    }
    finish(res);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center text-center mb-7">
        {/* classical gold seal-ring monogram */}
        <div className="relative w-16 h-16 rounded-full grid place-items-center border border-gold/40 bg-gradient-to-b from-white/[0.07] to-transparent shadow-[0_0_34px_rgba(200,162,75,0.28)]">
          <span className="absolute inset-1.5 rounded-full border border-gold/15" aria-hidden />
          <span className="font-display text-[30px] font-semibold text-gold leading-none">G</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-white tracking-tight">GraniteOS</h1>
        <p className="text-[10px] uppercase tracking-[0.32em] text-gold/70 mt-1.5">made by HandelOS</p>
        <div className="mt-4 flex items-center gap-2 w-32" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="w-1.5 h-1.5 rotate-45 bg-gold/70" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
        </div>
        <p className="mt-3.5 text-sm text-slate-300">
          {pwMode === "signin"
            ? "Sign in to your account"
            : "Create your GraniteOS account"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Username (email)</span>
          <input
            suppressHydrationWarning
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "login-error" : undefined}
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
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="mt-1.5 w-full text-base focus:border-gold outline-none"
          />
        </label>

        {error && <ErrorPill id="login-error">{error}</ErrorPill>}

        <Button type="submit" variant="press" className="w-full" disabled={loading}>
          {loading
            ? "Please wait..."
            : pwMode === "signin"
              ? "Login"
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

      <p className="mt-6 text-center text-[11px] text-slate-500">
        By continuing you agree to our{" "}
        <a href="/terms" className="text-slate-400 hover:text-gold underline">
          Terms
        </a>{" "}
        &amp;{" "}
        <a href="/privacy" className="text-slate-400 hover:text-gold underline">
          Privacy
        </a>
        .
      </p>
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

function ErrorPill({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    /* role=alert + aria-live=assertive → AT announces the error immediately (WCAG 3.3.1 / 4.1.3) */
    <div id={id} role="alert" aria-live="assertive" className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
      {children}
    </div>
  );
}
