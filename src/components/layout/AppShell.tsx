"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_TABS_BY_ROLE, TABS, type Role, type TabKey } from "@/lib/roles";
import NavDrawer from "@/components/layout/NavDrawer";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import VoiceCommandBar from "@/components/voice/VoiceCommandBar";

const ICONS: Record<TabKey, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  inventory: <path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
  orders: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  quotes: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  fabrication: (
    <>
      <path d="M3 21h18M5 21V9l5 3V9l5 3V9l4 3v9" />
    </>
  ),
};

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = NAV_TABS_BY_ROLE[role] ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] lg:pl-60">
      <NavDrawer role={role} />
      <DesktopSidebar role={role} />
      <VoiceCommandBar />
      <main className="flex-1 pb-24 lg:pb-10 overflow-y-auto">{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 bg-graphite-900/90 backdrop-blur border-t border-graphite-600 z-50 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around h-16 max-w-lg mx-auto">
          {tabs.map((key) => {
            const tab = TABS[key];
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={key}
                href={tab.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1"
                style={{ color: active ? "#c9a24b" : "#5c6470" }}
              >
                {active && (
                  <motion.span
                    layoutId="navpill"
                    className="absolute top-1 h-1 w-8 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[key]}
                </svg>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
