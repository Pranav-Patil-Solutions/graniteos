import type { LicenseStatus } from "@/lib/license";

/** Full-screen lock shown when the license is missing, expired, or invalid.
 *  Rendered in place of the entire app — nothing runs without a valid license. */
export default function LicenseGate({ status }: { status: LicenseStatus }) {
  const expired = status.reason === "expired";
  const title = expired ? "Licence expired" : status.reason === "wrong-domain" ? "Licence not valid for this site" : "Licence required";
  const detail = expired
    ? `This GraniteOS licence${status.company ? ` for ${status.company}` : ""} expired on ${fmt(status.expiresAt)}.`
    : status.reason === "wrong-domain"
      ? "This licence was issued for a different website."
      : status.reason === "missing"
        ? "No licence was found for this installation."
        : "The licence on this installation is invalid.";

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(1100px_650px_at_70%_-10%,#1c2630,#0b0e11_60%)] px-6">
      <div className="relative w-full max-w-md rounded-[28px] border border-gold/25 bg-white/[0.05] backdrop-blur-xl p-8 text-center shadow-2xl shadow-black/60">
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[20px] border border-gold/15" />
        <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="relative">
          <div className="mx-auto w-16 h-16 rounded-full grid place-items-center border border-gold/40 bg-gradient-to-b from-white/[0.07] to-transparent shadow-[0_0_34px_rgba(200,162,75,0.28)]">
            <span className="font-display text-[30px] font-semibold text-gold leading-none">G</span>
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-white">{title}</h1>
          <div className="mt-3 flex items-center gap-2 w-32 mx-auto" aria-hidden>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
            <span className="w-1.5 h-1.5 rotate-45 bg-gold/70" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">{detail}</p>
          <p className="mt-2 text-sm text-slate-400">
            Please contact your provider to {expired ? "renew" : "activate"} your licence.
          </p>
          <div className="mt-6 rounded-xl border border-graphite-600 bg-black/20 px-4 py-3 text-left">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Installation</p>
            <p className="text-xs text-slate-300 mt-0.5">
              {status.company ?? "Unlicensed"}{status.plan ? ` · ${status.plan}` : ""}
            </p>
          </div>
          <p className="mt-6 text-[11px] text-graphite-500">GraniteOS · made by HandelOS</p>
        </div>
      </div>
    </div>
  );
}

function fmt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
