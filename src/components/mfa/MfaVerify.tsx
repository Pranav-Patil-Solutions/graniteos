"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sendMfaCode, verifyMfaCode, verifyAuthenticator } from "@/actions/mfa";
import { MFA_METHOD_LABEL, methodSendsCode, type MfaMethod } from "@/lib/mfa/methods";

type Props = {
  methods: MfaMethod[];
  maskedEmail: string;
  maskedPhone: string;
  redirectTo?: string | null;
  /** Override navigation on success (e.g. for re-auth / sensitive-action modals). */
  onVerified?: (next: string) => void;
};

const ALL: MfaMethod[] = ["email", "phone", "authenticator"];
const ICON: Record<MfaMethod, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  authenticator: <ShieldCheck className="w-4 h-4" />,
};
const RESEND_SECONDS = 30;

function firstMethod(methods: MfaMethod[]): MfaMethod {
  // Prefer the strongest available method by default.
  return (
    (["authenticator", "email", "phone"] as MfaMethod[]).find((m) => methods.includes(m)) ??
    methods[0] ??
    "authenticator"
  );
}

export default function MfaVerify({
  methods,
  maskedEmail,
  maskedPhone,
  redirectTo,
  onVerified,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<MfaMethod>(() => firstMethod(methods));
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [sentMasked, setSentMasked] = useState("");
  const [busy, setBusy] = useState<"" | "send" | "verify">("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const needsSend = methodSendsCode(selected);
  const showCodeInput = !needsSend || sent;

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Focus the code box as soon as it appears.
  useEffect(() => {
    if (showCodeInput) codeRef.current?.focus();
  }, [showCodeInput, selected]);

  function pick(method: MfaMethod) {
    if (!methods.includes(method) || method === selected) return;
    setSelected(method);
    setCode("");
    setError("");
    setSent(false);
    setSentMasked("");
    setResendIn(0);
  }

  async function doSend(isResend = false) {
    setError("");
    setBusy("send");
    const res = await sendMfaCode(selected);
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setSent(true);
    setSentMasked(res.masked ?? "");
    setResendIn(RESEND_SECONDS);
    if (isResend) setCode("");
  }

  function finish(next: string) {
    if (onVerified) return onVerified(next);
    router.replace(redirectTo || next || "/dashboard");
    router.refresh();
  }

  async function doVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("verify");
    const res =
      selected === "authenticator"
        ? await verifyAuthenticator(code)
        : await verifyMfaCode(selected, code);
    if ("error" in res) {
      setBusy("");
      return setError(res.error ?? "");
    }
    finish(res.next ?? "/dashboard");
  }

  const targetHint =
    selected === "email"
      ? maskedEmail
      : selected === "phone"
        ? maskedPhone
        : "";

  return (
    <div>
      {/* Segmented method buttons */}
      <div
        role="group"
        aria-label="Choose a verification method"
        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-graphite-600"
      >
        {ALL.map((m) => {
          const enabled = methods.includes(m);
          const active = selected === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => pick(m)}
              disabled={!enabled}
              aria-pressed={active}
              title={
                enabled
                  ? MFA_METHOD_LABEL[m]
                  : m === "phone"
                    ? "Phone codes need SMS setup — not available yet"
                    : `${MFA_METHOD_LABEL[m]} isn't enabled on this account`
              }
              className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1 text-xs sm:text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-gold/15 text-gold"
                  : enabled
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 opacity-50 cursor-not-allowed"
              }`}
            >
              {ICON[m]}
              <span className="leading-tight text-center">
                {m === "authenticator" ? "Authenticator" : MFA_METHOD_LABEL[m]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Method body */}
      <form onSubmit={doVerify} className="mt-5 space-y-4">
        {selected === "authenticator" ? (
          <p className="text-sm text-slate-300">
            Open your authenticator app and enter the current 6-digit code for GraniteOS.
          </p>
        ) : !sent ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              We&apos;ll send a 6-digit code to{" "}
              <span className="text-white font-medium">{targetHint || "your " + selected}</span>.
            </p>
            <Button
              type="button"
              variant="press"
              className="w-full"
              onClick={() => doSend(false)}
              disabled={busy === "send"}
            >
              {busy === "send" ? "Sending…" : `Send code to ${selected}`}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-300" aria-live="polite">
            Code sent to <span className="text-white font-medium">{sentMasked}</span>. Enter it below.
          </p>
        )}

        {showCodeInput && (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                {selected === "authenticator" ? "Authenticator code" : "Verification code"}
              </span>
              <input
                ref={codeRef}
                suppressHydrationWarning
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                aria-describedby={error ? "mfa-error" : undefined}
                style={{ height: 60 }}
                className="mt-1.5 w-full text-center text-2xl tracking-[0.5em] focus:border-gold outline-none"
              />
            </label>

            {error && (
              <div
                id="mfa-error"
                role="alert"
                aria-live="assertive"
                className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="press"
              className="w-full"
              disabled={busy === "verify" || code.length < 6}
            >
              {busy === "verify" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                </span>
              ) : (
                "Verify & continue"
              )}
            </Button>

            {needsSend && (
              <button
                type="button"
                onClick={() => doSend(true)}
                disabled={resendIn > 0 || busy === "send"}
                className="w-full text-sm text-slate-500 hover:text-slate-300 disabled:opacity-60"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            )}
          </>
        )}

        {error && !showCodeInput && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20"
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
