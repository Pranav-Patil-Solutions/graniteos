"use client";

// Persistent left sidebar for wide screens (lg+) — expandable group nav.
// On phones it's hidden; the hamburger NavDrawer + bottom tabs take over.
import { Smartphone } from "lucide-react";
import type { Role } from "@/lib/roles";
import type { AccessConfig } from "@/lib/access-control";
import NavGroups from "@/components/layout/NavGroups";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/auth/SignOutButton";

export default function DesktopSidebar({
  role,
  accessConfig,
  onSwitchToMobile,
}: {
  role: Role;
  accessConfig?: AccessConfig | null;
  onSwitchToMobile?: () => void;
}) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-line-dark bg-graphite-900/95 backdrop-blur">
      <div className="flex items-center h-16 px-5 border-b border-line-dark shrink-0">
        <span className="font-display text-2xl font-semibold leading-none tracking-tight">
          <span className="text-gold">G</span>
          <span className="text-white">raniteOS</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavGroups role={role} accessConfig={accessConfig} />
      </div>

      <div className="px-4 py-3 border-t border-line-dark shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {onSwitchToMobile && (
            <button
              onClick={onSwitchToMobile}
              title="Preview the phone layout"
              className="inline-flex items-center gap-2 rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-gold hover:border-gold/40 transition-colors"
            >
              <Smartphone className="w-4 h-4" /> Mobile
            </button>
          )}
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
