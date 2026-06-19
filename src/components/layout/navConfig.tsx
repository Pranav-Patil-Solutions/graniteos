// Single source of truth for the section nav — shared by the mobile NavDrawer
// (hamburger) and the desktop sidebar so they never drift apart.
import {
  Home, Boxes, Users, Receipt, FileText, Wallet, Factory,
  Megaphone, Target, Sparkles, BarChart3, Package, Settings, History, Ruler, BookOpen, Banknote,
  HardHat, StickyNote, ShoppingCart, Truck,
} from "lucide-react";
import { can } from "@/lib/permissions";
import { accessFor, type AccessConfig, type AccessModule } from "@/lib/access-control";
import type { Role } from "@/lib/roles";

export type Need = "owner" | "broadcast" | undefined;
export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  need?: Need;
  /** Access-control module key — if set, 'none' access hides this item. */
  module?: AccessModule;
};

export const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Business",
    items: [
      { href: "/dashboard",     label: "Home",              icon: Home },
      { href: "/inventory",     label: "Stock",             icon: Boxes,    module: "inventory" },
      { href: "/parties",       label: "Parties",           icon: Users,    module: "parties" },
      { href: "/quotes",        label: "Quotes",            icon: Receipt,  module: "quotes" },
      { href: "/orders",        label: "Orders",            icon: FileText, module: "orders" },
      { href: "/money",         label: "Money",             icon: Wallet,   module: "money" },
      { href: "/batch-payment", label: "Batch Payment",     icon: Banknote, module: "money" },
      { href: "/measure",       label: "Measurement Sheet", icon: Ruler },
      { href: "/fabrication",   label: "Fabrication",       icon: Factory,  module: "fabrication" },
      { href: "/factory",       label: "Factory Floor",     icon: HardHat,  module: "fabrication" },
      { href: "/daybook",       label: "Daybook",           icon: BookOpen, need: "owner" },
      { href: "/notes",         label: "Voice Notes",       icon: StickyNote },
      { href: "/logs",          label: "Logs",              icon: History },
    ],
  },
  {
    group: "Procurement",
    items: [
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { href: "/vendor-payment",  label: "Vendor Payments", icon: Truck },
    ],
  },
  {
    group: "Growth",
    items: [
      { href: "/stock-alert", label: "Stock Alert",      icon: Megaphone, need: "broadcast" },
      { href: "/marketing",   label: "Marketing Helper", icon: Target,    need: "broadcast" },
      { href: "/ai-studio",   label: "AI Studio",        icon: Sparkles },
      { href: "/analytics",   label: "Insights",         icon: BarChart3, need: "owner", module: "analytics" },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/products",  label: "Products",  icon: Package,  need: "owner", module: "products" },
      { href: "/team",      label: "Team",      icon: Users,    need: "owner", module: "team" },
      { href: "/settings",  label: "Settings",  icon: Settings, need: "owner", module: "settings" },
    ],
  },
];

/**
 * Is a nav item visible to this role?
 * Checks two layers:
 *  1. The hard `need` (owner/broadcast) — overrides everything.
 *  2. The access config `module` — if level is 'none', hide the item.
 */
export function allowedFor(
  role: Role,
  need: Need,
  module?: AccessModule,
  accessConfig?: AccessConfig | null,
): boolean {
  // Layer 1: hard need gate (unchanged from before).
  if (need === "owner") return can(role, "inviteTeamMember");
  if (need === "broadcast") return can(role, "createQuote");

  // Layer 2: access control module gate.
  // Owners are always allowed (accessFor returns 'edit' for owner).
  if (module && accessConfig && role !== "owner") {
    const level = accessFor(accessConfig, role, module);
    if (level === "none") return false;
  }

  return true;
}

/** Active-state test that tolerates query strings (e.g. /parties?tab=suppliers). */
export function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base || (base !== "/dashboard" && pathname.startsWith(base));
}
