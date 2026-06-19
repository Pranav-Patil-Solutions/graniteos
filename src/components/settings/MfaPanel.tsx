"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, ShieldCheck, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  startEnroll,
  confirmEnroll,
  disableAuthenticator,
  setEmailMfa,
  setPhoneMfa,
} from "@/actions/mfa";

export type MfaState = {
  authenticator: boolean;
  authenticatorFactorId: string | null;
  email: boolean;
  phone: boolean;
  phoneAvailable: boolean;
  hasPhone: boolean;
  maskedEmail: string;
  maskedPhone: string;
};

export default function MfaPanel({ initial }: { initial: MfaState }) {
  const router = useRouter();
  const [s, setS] = useState<MfaState>(initial);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const anyOn = s.authenticator || s.email || s.phone;

  // Authenticator enrollment sub-flow
  const [enrolling, setEnrolling] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const qrSrc =
    qr && qr.trim().startsWith("<svg")
      ? `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`
      : qr;

  async function toggleEmail() {
    setError("");
    setBusy("email");
    const res = await setEmailMfa(!s.email);
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setS((p) => ({ ...p, email: !p.email }));
    // Re-sync the server (so the /mfa enrolment gate forwards once 2FA is on).
    router.refresh();
  }

  async function togglePhone() {
    setError("");
    setBusy("phone");
    const res = await setPhoneMfa(!s.phone);
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setS((p) => ({ ...p, phone: !p.phone }));
    router.refresh();
  }

  async function beginEnroll() {
    setError("");
    setBusy("auth");
    const res = await startEnroll();
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setEnrollFactorId(res.factorId);
    setQr(res.qr);
    setSecret(res.secret);
    setEnrolling(true);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollFactorId) return;
    setError("");
    setBusy("auth");
    const res = await confirmEnroll(enrollFactorId, code);
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setS((p) => ({ ...p, authenticator: true, authenticatorFactorId: enrollFactorId }));
    setEnrolling(false);
    setEnrollFactorId(null);
    setQr(null);
    setSecret(null);
    setCode("");
    // Enrolment also raised the session to AAL2 — refreshing lets the /mfa gate
    // send a must-enrol owner straight on to the dashboard (no more dead link).
    router.refresh();
  }

  async function turnOffAuth() {
    if (!s.authenticatorFactorId) return;
    if (typeof window !== "undefined" && !window.confirm("Turn off the authenticator app?")) return;
    setError("");
    setBusy("auth");
    const res = await disableAuthenticator(s.authenticatorFactorId);
    setBusy("");
    if ("error" in res) return setError(res.error ?? "");
    setS((p) => ({ ...p, authenticator: false, authenticatorFactorId: null }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Two-factor adds a second step at sign-in. Turn on any of the methods below — the same
        choices appear when you sign in.
      </p>

      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}

      {/* AUTHENTICATOR */}
      <Row
        icon={<ShieldCheck className="w-5 h-5" />}
        title="Authenticator app"
        desc="Google Authenticator, Authy, etc. Most secure — works offline, no codes to wait for."
        on={s.authenticator}
      >
        {s.authenticator ? (
          <button
            type="button"
            onClick={turnOffAuth}
            disabled={busy === "auth"}
            className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm font-semibold hover:bg-red-500/15 disabled:opacity-60"
          >
            {busy === "auth" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Turn off"}
          </button>
        ) : enrolling ? null : (
          <Button onClick={beginEnroll} variant="press" disabled={busy === "auth"}>
            {busy === "auth" ? "Preparing…" : "Set up"}
          </Button>
        )}
      </Row>

      {enrolling && (
        <form onSubmit={confirm} className="rounded-2xl border border-graphite-600 bg-white/[0.03] p-4 space-y-3">
          <p className="text-sm text-slate-300">1. Scan this with your authenticator app:</p>
          {qrSrc && (
            <div className="inline-flex rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="Authenticator QR code" width={160} height={160} />
            </div>
          )}
          {secret && (
            <p className="text-xs text-slate-400">
              Can&apos;t scan? Key: <code className="text-gold break-all">{secret}</code>
            </p>
          )}
          <p className="text-sm text-slate-300">2. Enter the 6-digit code it shows:</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            style={{ height: 52 }}
            className="w-full max-w-[200px] text-center text-xl tracking-[0.4em] focus:border-gold outline-none"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="press" disabled={busy === "auth" || code.length < 6}>
              {busy === "auth" ? "Verifying…" : "Verify & turn on"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setEnrolling(false);
                setQr(null);
                setSecret(null);
                setCode("");
                setError("");
              }}
              className="rounded-xl border border-graphite-600 bg-white/[0.04] text-slate-300 px-4 py-2.5 text-sm font-semibold hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* EMAIL */}
      <Row
        icon={<Mail className="w-5 h-5" />}
        title="Email"
        desc={s.maskedEmail ? `Codes go to ${s.maskedEmail}` : "Codes go to your account email"}
        on={s.email}
      >
        <Toggle on={s.email} busy={busy === "email"} onClick={toggleEmail} label="Email 2FA" />
      </Row>

      {/* PHONE */}
      <Row
        icon={<Phone className="w-5 h-5" />}
        title="Phone (SMS)"
        desc={
          s.phoneAvailable
            ? `Codes go to ${s.maskedPhone}`
            : s.hasPhone
              ? "SMS isn't set up yet — available once an SMS provider is added."
              : "Add a phone number to your account, plus an SMS provider, to use this."
        }
        on={s.phone}
      >
        {s.phoneAvailable ? (
          <Toggle on={s.phone} busy={busy === "phone"} onClick={togglePhone} label="Phone 2FA" />
        ) : (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full border border-graphite-600 bg-white/[0.03] text-slate-500">
            Unavailable
          </span>
        )}
      </Row>

      {!anyOn && (
        <p className="text-xs text-slate-500">
          2FA is currently off. Turn on at least one method above to protect your account.
        </p>
      )}
    </div>
  );
}

function Row({
  icon,
  title,
  desc,
  on,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 flex items-start gap-3">
      <span className={on ? "text-emerald-400 mt-0.5" : "text-gold mt-0.5"}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">{title}</h3>
          {on && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-500/30 bg-emerald-500/10">
              <Check className="w-3 h-3" /> On
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  on,
  busy,
  onClick,
  label,
}: {
  on: boolean;
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={busy}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
        on ? "bg-emerald-500/80" : "bg-graphite-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

