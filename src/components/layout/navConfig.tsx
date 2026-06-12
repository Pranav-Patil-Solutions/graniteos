// Single source of truth for the section nav — shared by the mobile NavDrawer
// (hamburger) and the desktop sidebar so they never drift apart.
import {
  Home, Boxes, Users, Truck, Receipt, FileText, Wallet, Factory,
  Megaphone, Target, Sparkles, BarChart3, Package, Settings, History, Ruler, BookOpen, Banknote,
  Search, HardHat, StickyNote,
} from "lucide-react";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

export type Need = "owner" | "broadcast" | undefined;
export type NavItem = { href: string; label: string; icon: typeof Home; need?: Need };

export const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Business",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/search", label: "Search", icon: Search },
      { href: "/inventory", label: "Stock", icon: Boxes },
      { href: "/parties", label: "Customers", icon: Users },
      { href: "/parties?tab=suppliers", label: "Suppliers", icon: Truck },
      { href: "/quotes", label: "Quotes", icon: Receipt },
      { href: "/orders", label: "Orders", icon: FileText },
      { href: "/money", label: "Money", icon: Wallet },
      { href: "/batch-payment", label: "Batch Payment", icon: Banknote },
      { href: "/measure", label: "Measurement Sheet", icon: Ruler },
      { href: "/fabrication", label: "Fabrication", icon: Factory },
      { href: "/factory", label: "Factory Floor", icon: HardHat },
      { href: "/daybook", label: "Daybook", icon: BookOpen },
      { href: "/notes", label: "Voice Notes", icon: StickyNote },
      { href: "/logs", label: "Logs", icon: History },
    ],
  },
  {
    group: "Growth",
    items: [
      { href: "/stock-alert", label: "Stock Alert", icon: Megaphone, need: "broadcast" },
      { href: "/marketing", label: "Marketing Helper", icon: Target, need: "broadcast" },
      { href: "/ai-studio", label: "AI Studio", icon: Sparkles },
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

/** Is a nav item visible to this role? */
export function allowedFor(role: Role, need: Need): boolean {
  if (need === "owner") return can(role, "inviteTeamMember");
  if (need === "broadcast") return can(role, "createQuote");
  return true;
}

/** Active-state test that tolerates query strings (e.g. /parties?tab=suppliers). */
export function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base || (base !== "/dashboard" && pathname.startsWith(base));
}
