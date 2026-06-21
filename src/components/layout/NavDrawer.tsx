"use client";

// Global ☰ menu — opens a drawer listing every section (role-aware). Lives in
// AppShell so it's on every app screen.
import { useEffect, useState } from "react";
import { Menu, X, Monitor } from "lucide-react";
import type { Role } from "@/lib/roles";
import type { AccessConfig } from "@/lib/access-control";
import NavGroups from "@/components/layout/NavGroups";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/auth/SignOutButton";

export default function NavDrawer({
  role,
  accessConfig,
  forceMobile = false,
  onSwitchToDesktop,
}: {
  role: Role;
  accessConfig?: AccessConfig | null;
  forceMobile?: boolean;
  onSwitchToDesktop?: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape key (WCAG 2.1.2 / 4.1.2)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* hamburger trigger — mobile/tablet only; desktop uses the sidebar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className={`fixed top-3 left-3 z-40 w-10 h-10 grid place-items-center rounded-xl bg-graphite-900/70 backdrop-blur border border-line-dark text-ondark hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${forceMobile ? "" : "lg:hidden"}`}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* drawer */}
      {/* role=dialog + aria-modal inform AT that this is a modal drawer (WCAG 2.1.2 / 4.1.2) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-[70] w-72 max-w-[82vw] bg-graphite-900 border-r border-line-dark shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-line-dark">
          <span className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold/12 hairline-gold font-display text-lg font-bold text-gold leading-none">G</span>
            <span className="font-display text-xl font-semibold leading-none tracking-tight text-ondark">GraniteOS</span>
          </span>
          <button onClick={() => setOpen(false)} aria-label="Close" className="w-9 h-9 grid place-items-center text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-56px-116px)] px-3 py-3">
          <NavGroups role={role} accessConfig={accessConfig} onNavigate={() => setOpen(false)} />
        </div>

        <div className="absolute bottom-0 inset-x-0 px-4 py-3 border-t border-line-dark space-y-2">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* way back to the desktop layout — only meaningful on a wide screen */}
            {forceMobile && onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-gold hover:border-gold/40 transition-colors"
              >
                <Monitor className="w-4 h-4" /> Desktop view
              </button>
            )}
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
