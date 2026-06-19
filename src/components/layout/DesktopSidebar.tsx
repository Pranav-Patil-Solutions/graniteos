"use client";

// Persistent left rail for wide screens (lg+). Collapsed to an icon rail by
// default; expands on hover (peek) or stays open when pinned. On phones it's
// hidden and the hamburger NavDrawer + bottom tabs take over. Same nav source.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Role } from "@/lib/roles";
import type { AccessConfig } from "@/lib/access-control";
import { NAV_GROUPS, allowedFor, isActive } from "@/components/layout/navConfig";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/auth/SignOutButton";

export default function DesktopSidebar({
  role,
  accessConfig,
  pinned,
  onTogglePin,
  onSwitchToMobile,
}: {
  role: Role;
  accessConfig?: AccessConfig | null;
  pinned: boolean;
  onTogglePin: () => void;
  onSwitchToMobile?: () => void;
}) {
  const pathname = usePathname();

  // Label/footer chrome is hidden in the collapsed rail and revealed when the
  // sidebar is pinned open or hovered (CSS group-hover) — so the rail stays a
  // clean icon strip until you reach for it.
  const reveal = pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <aside
      className={`group hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-line-dark bg-graphite-900/95 backdrop-blur overflow-x-hidden transition-[width] duration-200 ease-out ${
        pinned ? "w-60" : "w-16 hover:w-60 hover:shadow-2xl hover:shadow-black/50"
      }`}
    >
      {/* Header: gold "G" mark always; full wordmark + pin reveal on expand */}
      <div className="flex items-center h-16 px-4 border-b border-line-dark shrink-0">
        <span className="font-display text-xl font-semibold leading-none whitespace-nowrap">
          <span className="text-gold">G</span>
          <span className={`text-white transition-opacity duration-150 ${reveal}`}>raniteOS</span>
        </span>
        <button
          onClick={onTogglePin}
          title={pinned ? "Collapse sidebar" : "Keep sidebar open"}
          aria-label={pinned ? "Collapse sidebar" : "Keep sidebar open"}
          className={`ml-auto p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-white/[0.06] transition ${reveal}`}
        >
          {pinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((it) =>
            allowedFor(role, it.need, it.module, accessConfig),
          );
          if (items.length === 0) return null;
          return (
            <div key={g.group} className="mb-3">
              <p
                className={`px-2 mb-1 text-[10px] uppercase tracking-[0.16em] text-gold/70 font-semibold whitespace-nowrap transition-opacity duration-150 ${reveal}`}
              >
                {g.group}
              </p>
              {items.map((it) => {
                const active = isActive(pathname, it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    title={it.label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-gold/15 text-gold"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className={`whitespace-nowrap transition-opacity duration-150 ${reveal}`}>
                      {it.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-line-dark shrink-0">
        <div className={`space-y-2 transition-opacity duration-150 ${reveal}`}>
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            {onSwitchToMobile && (
              <button
                onClick={onSwitchToMobile}
                title="Preview the phone layout"
                className="inline-flex items-center gap-2 rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-gold hover:border-gold/40 transition-colors whitespace-nowrap"
              >
                <Smartphone className="w-4 h-4 shrink-0" /> Mobile
              </button>
            )}
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
