"use client";

// BottomNav — 5 slots: Home, Customers, center gold "+" FAB (raised, glow),
// Alerts, More. Frosted glass. Active gold, inactive muted. Spec §3.10.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, Bell, MoreHorizontal } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/parties", label: "Customers", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname();
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 bg-[#0b0e11]/75 backdrop-blur-md border-t border-line-dark"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative max-w-lg mx-auto h-16 grid grid-cols-5 items-center">
        {left.map((it) => <Slot key={it.href} item={it} active={pathname.startsWith(it.href)} />)}
        <div className="grid place-items-center">
          <button
            onClick={onAdd}
            aria-label="Create new"
            className="w-14 h-14 -mt-7 rounded-full bg-gold text-[#14181c] grid place-items-center shadow-[0_8px_24px_rgba(200,162,75,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
        {right.map((it) => <Slot key={it.href} item={it} active={pathname.startsWith(it.href)} />)}
      </div>
    </nav>
  );
}

function Slot({ item, active }: { item: (typeof ITEMS)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex flex-col items-center justify-center gap-1 h-full" style={{ color: active ? "#c8a24b" : "#9aa1a9" }}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}
