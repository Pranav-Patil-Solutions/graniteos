"use client";

// Persistent left rail for wide screens (lg+). On phones it's hidden and the
// hamburger NavDrawer + bottom tabs take over. Same nav source as the drawer.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/roles";
import { NAV_GROUPS, allowedFor, isActive } from "@/components/layout/navConfig";
import SignOutButton from "@/components/auth/SignOutButton";

export default function DesktopSidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-line-dark bg-[#0c1014]/95 backdrop-blur">
      <div className="flex items-center gap-2 h-16 px-5 border-b border-line-dark shrink-0">
        <span className="font-display text-2xl font-semibold text-gold leading-none">G</span>
        <span className="font-display text-lg font-semibold text-white">GraniteOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((it) => allowedFor(role, it.need));
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
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

      <div className="px-4 py-4 border-t border-line-dark shrink-0">
        <SignOutButton />
      </div>
    </aside>
  );
}
