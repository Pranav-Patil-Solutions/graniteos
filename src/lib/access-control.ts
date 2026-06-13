/**
 * Access Control — pure helpers, no server-side imports.
 * Safe to import from both client and server code.
 *
 * Config shape:
 *   { "<role>": { "<module>": "none" | "view" | "edit" } }
 *
 * Owner is always "edit" for every module — hardcoded, not stored in DB.
 * Roles that have no config row fall back to DEFAULT_CONFIG.
 */

import type { Role } from "@/lib/roles";

// ── Types ────────────────────────────────────────────────────────────────────

export type AccessLevel = "none" | "view" | "edit";

/** Every controllable module key. Keep in sync with 0021 migration defaults. */
export const ACCESS_MODULES = [
  "quotes",
  "orders",
  "inventory",
  "fabrication",
  "money",
  "parties",
  "products",
  "analytics",
  "daybook",
  "import",
  "team",
  "settings",
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];

export type NonOwnerRole = "sales_manager" | "store_manager" | "fabrication_supervisor";

export type RoleConfig = Record<AccessModule, AccessLevel>;

/** The full JSONB shape stored in access_control.config. */
export type AccessConfig = Partial<Record<NonOwnerRole, Partial<RoleConfig>>>;

// ── Default config ────────────────────────────────────────────────────────────
// Must match the SQL in 0021_access_control.sql default_access_config().

export const DEFAULT_CONFIG: Record<NonOwnerRole, RoleConfig> = {
  sales_manager: {
    quotes:      "edit",
    orders:      "edit",
    parties:     "edit",
    inventory:   "view",
    money:       "none",
    fabrication: "none",
    products:    "none",
    analytics:   "none",
    daybook:     "none",
    import:      "none",
    team:        "none",
    settings:    "none",
  },
  store_manager: {
    quotes:      "view",
    orders:      "edit",
    parties:     "view",
    inventory:   "edit",
    money:       "none",
    fabrication: "view",
    products:    "none",
    analytics:   "none",
    daybook:     "none",
    import:      "none",
    team:        "none",
    settings:    "none",
  },
  fabrication_supervisor: {
    quotes:      "none",
    orders:      "view",
    parties:     "none",
    inventory:   "view",
    money:       "none",
    fabrication: "edit",
    products:    "none",
    analytics:   "none",
    daybook:     "none",
    import:      "none",
    team:        "none",
    settings:    "none",
  },
};

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Returns the access level for a given role + module, looking up the company's
 * config and falling back to DEFAULT_CONFIG for any missing entries.
 *
 * Owner always returns "edit" — hardcoded.
 */
export function accessFor(
  config: AccessConfig | null | undefined,
  role: Role,
  module: AccessModule,
): AccessLevel {
  if (role === "owner") return "edit";

  const nonOwnerRole = role as NonOwnerRole;
  const roleConfig = config?.[nonOwnerRole];

  // If the role has an entry in the config, use it (with validation).
  if (roleConfig !== undefined) {
    const stored = roleConfig?.[module];
    // Key is present — validate it.
    if (stored !== undefined) {
      if (stored === "edit" || stored === "view" || stored === "none") return stored;
      // Invalid stored value → fail closed (security: deny access).
      return "none";
    }
    // Module key is missing from this role's config → fall back to default.
    return DEFAULT_CONFIG[nonOwnerRole]?.[module] ?? "none";
  }

  // No config entry for this role at all → fall back to baked-in default.
  return DEFAULT_CONFIG[nonOwnerRole]?.[module] ?? "none";
}

/** Convenience: returns true if the level is >= the minimum required. */
export function hasAccess(
  config: AccessConfig | null | undefined,
  role: Role,
  module: AccessModule,
  minLevel: "view" | "edit",
): boolean {
  const level = accessFor(config, role, module);
  if (minLevel === "view") return level === "view" || level === "edit";
  return level === "edit";
}

// ── Module display labels ─────────────────────────────────────────────────────

export const MODULE_LABELS: Record<AccessModule, string> = {
  quotes:      "Quotes",
  orders:      "Orders",
  inventory:   "Stock / Inventory",
  fabrication: "Fabrication",
  money:       "Money / Payments",
  parties:     "Parties",
  products:    "Products",
  analytics:   "Analytics / Insights",
  daybook:     "Daybook",
  import:      "Import Data",
  team:        "Team",
  settings:    "Settings",
};
