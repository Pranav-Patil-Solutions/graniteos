export type Role = "owner" | "sales_manager" | "store_manager" | "fabrication_supervisor";

export const ROLES: Role[] = ["owner", "sales_manager", "store_manager", "fabrication_supervisor"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  sales_manager: "Sales Manager",
  store_manager: "Store Manager",
  fabrication_supervisor: "Fabrication Supervisor",
};

export const ROLE_BADGE: Record<Role, string> = {
  owner: "bg-granite-green text-white",
  sales_manager: "bg-blue-100 text-blue-800",
  store_manager: "bg-orange-100 text-orange-800",
  fabrication_supervisor: "bg-purple-100 text-purple-800",
};

export type TabKey = "home" | "inventory" | "orders" | "quotes" | "payments" | "fabrication";

export const TABS: Record<TabKey, { label: string; href: string }> = {
  home: { label: "Home", href: "/dashboard" },
  inventory: { label: "Inventory", href: "/inventory" },
  orders: { label: "Orders", href: "/orders" },
  quotes: { label: "Quotes", href: "/quotes" },
  payments: { label: "Payments", href: "/payments" },
  fabrication: { label: "Fabrication", href: "/fabrication" },
};

export const NAV_TABS_BY_ROLE: Record<Role, TabKey[]> = {
  owner: ["home", "inventory", "orders", "quotes", "payments"],
  sales_manager: ["home", "inventory", "orders", "quotes"],
  store_manager: ["home", "inventory", "orders"],
  fabrication_supervisor: ["home", "fabrication", "orders"],
};
