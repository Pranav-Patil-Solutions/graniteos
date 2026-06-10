"use client";

// Global ☰ menu — opens a drawer listing every section (role-aware). Lives in
// AppShell so it's on every app screen.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Home, Boxes, Users, Truck, Receipt, FileText, Wallet, Factory,
  Megaphone, Target, Sparkles, BarChart3, Package, Settings,
} from "lucide-react";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import SignOutButton from "@/components/auth/SignOutButton";

type Need = "owner" | "broadcast" | undefined;
type Item = { href: string; label: string; icon: typeof Home; need?: Need };

const GROUPS: { group: string; items: Item[] }[] = [
  {
    group: "Business",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/inventory", label: "Stock", icon: Boxes },
      { href: "/parties", label: "Customers", icon: Users },
      { href: "/parties?tab=suppliers", label: "Suppliers", icon: Truck },
      { href: "/quotes", label: "Quotes", icon: Receipt },
      { href: "/orders", label: "Orders", icon: FileText },
      { href: "/money", label: "Money", icon: Wallet },
      { href: "/fabrication", label: "Fabrication", icon: Factory },
    ],
  },
  {
    group: "Growth",
    items: [
      { href: "/stock-alert", label: "Stock Alert", icon: Megaphone, need: "broadcast" },
      { href: "/marketing", label: "Marketing Helper", icon: Target, need: "broadcast" },
      { href: "/growth", label: "Marketing AI", icon: Sparkles },
      { href: "/analytics", label: "Insights", icon: BarChart3, need: "owner" },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/products", label: "Products", icon: Package, need: "owner" },
      { href: "/team", label: "Team", icon: Users, need: "owner" },
      { href: "/settings", label: "Settings", icon: Settings, need: "owner" },
    ],
  },
];

export default function NavDrawer({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const allowed = (need: Need) =>
    need === "owner" ? can(role, "inviteTeamMember") : need === "broadcast" ? can(role, "createQuote") : true;

  return (
    <>
      {/* hamburger trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="fixed top-3 left-3 z-40 w-10 h-10 grid place-items-center rounded-xl bg-[#0b0e11]/70 backdrop-blur border border-line-dark text-ondark hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
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
        className={`fixed inset-y-0 left-0 z-[70] w-72 max-w-[82vw] bg-[#0c1014] border-r border-line-dark shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
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

        <nav className="overflow-y-auto h-[calc(100%-56px-72px)] px-3 py-3">
          {GROUPS.map((g) => {
            const items = g.items.filter((it) => allowed(it.need));
            if (items.length === 0) return null;
            return (
              <div key={g.group} className="mb-4">
                <p className="px-2 mb-1 text-[10px] uppercase tracking-[0.16em] text-gold/60 font-semibold">{g.group}</p>
                {items.map((it) => {
                  const base = it.href.split("?")[0];
                  const active = pathname === base || (base !== "/dashboard" && pathname.startsWith(base));
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

        <div className="absolute bottom-0 inset-x-0 px-4 py-4 border-t border-line-dark">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
