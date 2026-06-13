"use client";

// Global ☰ menu — opens a drawer listing every section (role-aware). Lives in
// AppShell so it's on every app screen.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Monitor } from "lucide-react";
import type { Role } from "@/lib/roles";
import type { AccessConfig } from "@/lib/access-control";
import { NAV_GROUPS, allowedFor, isActive } from "@/components/layout/navConfig";
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
  const pathname = usePathname();

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
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-72 max-w-[82vw] bg-graphite-900 border-r border-line-dark shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-line-dark">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold text-gold leading-none">G</span>
            <span className="font-display text-lg font-semibold text-white">GraniteOS</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="w-9 h-9 grid place-items-center text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="overflow-y-auto h-[calc(100%-56px-116px)] px-3 py-3">
          {NAV_GROUPS.map((g) => {
            const items = g.items.filter((it) =>
              allowedFor(role, it.need, it.module, accessConfig),
            );
            if (items.length === 0) return null;
            return (
              <div key={g.group} className="mb-4">
                <p className="px-2 mb-1 text-[10px] uppercase tracking-[0.16em] text-gold/60 font-semibold">{g.group}</p>
                {items.map((it) => {
                  const active = isActive(pathname, it.href);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? "bg-gold/15 text-gold" : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

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
