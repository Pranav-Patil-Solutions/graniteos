"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Role } from "@/lib/roles";
import type { AccessConfig } from "@/lib/access-control";
import { NAV_GROUPS, allowedFor, isActive } from "@/components/layout/navConfig";

const LS_KEY = "gos-nav-open-v1";

/**
 * Expandable group navigation, shared by the desktop sidebar and the mobile
 * drawer. Each top-level group collapses/expands (chevron rotates); the group
 * holding the active route is always kept open; the user's open/closed choices
 * persist in localStorage. Height animates via the grid-rows 0fr→1fr trick.
 */
export default function NavGroups({
  role,
  accessConfig,
  onNavigate,
}: {
  role: Role;
  accessConfig?: AccessConfig | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => allowedFor(role, it.need, it.module, accessConfig)),
  })).filter((g) => g.items.length > 0);

  const activeGroup = groups.find((g) => g.items.some((it) => isActive(pathname, it.href)))?.group;

  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let saved: Record<string, boolean> = {};
    try {
      saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {}
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) init[g.group] = g.group in saved ? saved[g.group] : true;
    setOpen(init);
  }, []);

  // The active group is always open; otherwise use the persisted choice (default open).
  const isExpanded = (group: string) => group === activeGroup || (open[group] ?? true);

  function toggle(group: string) {
    setOpen((prev) => {
      const next = { ...prev, [group]: !(prev[group] ?? true) };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <nav className="space-y-1.5">
      {groups.map((g) => {
        const expanded = isExpanded(g.group);
        return (
          <div key={g.group}>
            <button
              onClick={() => toggle(g.group)}
              aria-expanded={expanded}
              className="w-full !min-h-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-bold text-gold/75 hover:bg-white/[0.05] hover:text-gold transition-colors"
            >
              {g.group}
              <ChevronDown
                className={`ml-auto w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pb-1 pt-0.5 space-y-0.5">
                  {g.items.map((it) => {
                    const active = isActive(pathname, it.href);
                    const Icon = it.icon;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-gold/15 text-gold"
                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gold" aria-hidden />
                        )}
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
