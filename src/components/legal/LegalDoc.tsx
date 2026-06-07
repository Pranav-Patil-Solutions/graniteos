import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_500px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#cfd4da]">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-gold">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-granite-green to-granite-green2 grid place-items-center font-extrabold text-white text-sm">
            G
          </span>
          GraniteOS
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {updated}</p>

        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          This is a starting template. Please have it reviewed by a legal professional before relying
          on it commercially.
        </div>

        <div className="mt-6 space-y-5 text-[14px] leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-1.5 [&_a]:text-gold [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:marker:text-slate-500">
          {children}
        </div>

        <div className="mt-10 flex gap-4 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-gold">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-gold">
            Privacy
          </Link>
          <span>© 2026 GraniteOS</span>
        </div>
      </div>
    </div>
  );
}
