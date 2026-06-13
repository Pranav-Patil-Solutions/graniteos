import { describe, it, expect } from "vitest";
import {
  accessFor,
  hasAccess,
  DEFAULT_CONFIG,
  type AccessConfig,
} from "./access-control";

// ── accessFor ────────────────────────────────────────────────────────────────

describe("accessFor()", () => {
  it("always returns 'edit' for owner regardless of config", () => {
    expect(accessFor(null, "owner", "quotes")).toBe("edit");
    expect(accessFor({}, "owner", "money")).toBe("edit");
    expect(accessFor({ sales_manager: { quotes: "none" } }, "owner", "quotes")).toBe("edit");
  });

  it("uses the stored config value when present and valid", () => {
    const config: AccessConfig = {
      sales_manager: { quotes: "view", orders: "edit" },
    };
    expect(accessFor(config, "sales_manager", "quotes")).toBe("view");
    expect(accessFor(config, "sales_manager", "orders")).toBe("edit");
  });

  it("falls back to DEFAULT_CONFIG when config is null", () => {
    expect(accessFor(null, "sales_manager", "quotes")).toBe(
      DEFAULT_CONFIG.sales_manager.quotes,
    );
    expect(accessFor(null, "store_manager", "inventory")).toBe(
      DEFAULT_CONFIG.store_manager.inventory,
    );
    expect(accessFor(null, "fabrication_supervisor", "fabrication")).toBe(
      DEFAULT_CONFIG.fabrication_supervisor.fabrication,
    );
  });

  it("falls back to DEFAULT_CONFIG when config is an empty object", () => {
    expect(accessFor({}, "sales_manager", "parties")).toBe(
      DEFAULT_CONFIG.sales_manager.parties,
    );
  });

  it("falls back to DEFAULT_CONFIG for a module not in the stored config", () => {
    const config: AccessConfig = {
      sales_manager: { quotes: "edit" }, // money is missing
    };
    // money is 'none' in DEFAULT_CONFIG for sales_manager
    expect(accessFor(config, "sales_manager", "money")).toBe("none");
  });

  it("returns 'none' for any unknown/invalid stored value", () => {
    const config = {
      sales_manager: { quotes: "superpower" as never },
    };
    expect(accessFor(config, "sales_manager", "quotes")).toBe("none");
  });

  it("DEFAULT_CONFIG — sales_manager has edit on quotes/orders/parties", () => {
    expect(DEFAULT_CONFIG.sales_manager.quotes).toBe("edit");
    expect(DEFAULT_CONFIG.sales_manager.orders).toBe("edit");
    expect(DEFAULT_CONFIG.sales_manager.parties).toBe("edit");
  });

  it("DEFAULT_CONFIG — sales_manager has none on money", () => {
    expect(DEFAULT_CONFIG.sales_manager.money).toBe("none");
  });

  it("DEFAULT_CONFIG — store_manager has edit on inventory", () => {
    expect(DEFAULT_CONFIG.store_manager.inventory).toBe("edit");
  });

  it("DEFAULT_CONFIG — fabrication_supervisor has none on quotes", () => {
    expect(DEFAULT_CONFIG.fabrication_supervisor.quotes).toBe("none");
  });

  it("DEFAULT_CONFIG — fabrication_supervisor has edit on fabrication", () => {
    expect(DEFAULT_CONFIG.fabrication_supervisor.fabrication).toBe("edit");
  });
});

// ── hasAccess ────────────────────────────────────────────────────────────────

describe("hasAccess()", () => {
  it("returns true for owner on any module at any level", () => {
    expect(hasAccess(null, "owner", "money", "edit")).toBe(true);
    expect(hasAccess(null, "owner", "settings", "view")).toBe(true);
  });

  it("edit level satisfies both 'edit' and 'view' minLevel", () => {
    const config: AccessConfig = { sales_manager: { quotes: "edit" } };
    expect(hasAccess(config, "sales_manager", "quotes", "edit")).toBe(true);
    expect(hasAccess(config, "sales_manager", "quotes", "view")).toBe(true);
  });

  it("view level satisfies 'view' but not 'edit'", () => {
    const config: AccessConfig = { store_manager: { quotes: "view" } };
    expect(hasAccess(config, "store_manager", "quotes", "view")).toBe(true);
    expect(hasAccess(config, "store_manager", "quotes", "edit")).toBe(false);
  });

  it("none level satisfies neither 'view' nor 'edit'", () => {
    const config: AccessConfig = { sales_manager: { money: "none" } };
    expect(hasAccess(config, "sales_manager", "money", "view")).toBe(false);
    expect(hasAccess(config, "sales_manager", "money", "edit")).toBe(false);
  });

  it("owner config overrides even if none is stored for another role", () => {
    const config: AccessConfig = { sales_manager: { money: "none" } };
    expect(hasAccess(config, "owner", "money", "edit")).toBe(true);
  });
});

// ── Per-role matrix — view user cannot mutate ────────────────────────────────

describe("access matrix — view user cannot mutate", () => {
  const viewConfig: AccessConfig = {
    sales_manager: { quotes: "view" },
    store_manager: { orders: "view" },
    fabrication_supervisor: { fabrication: "view" },
  };

  it("sales_manager with view on quotes cannot edit quotes", () => {
    expect(hasAccess(viewConfig, "sales_manager", "quotes", "edit")).toBe(false);
  });

  it("store_manager with view on orders cannot edit orders", () => {
    expect(hasAccess(viewConfig, "store_manager", "orders", "edit")).toBe(false);
  });

  it("fabrication_supervisor with view on fabrication cannot edit fabrication", () => {
    expect(hasAccess(viewConfig, "fabrication_supervisor", "fabrication", "edit")).toBe(false);
  });
});

// ── None user cannot read module data via accessFor ──────────────────────────

describe("access matrix — none user blocked", () => {
  const noneConfig: AccessConfig = {
    sales_manager: { money: "none" },
    store_manager: { quotes: "none" },
    fabrication_supervisor: { parties: "none" },
  };

  it("sales_manager with none on money has no access", () => {
    expect(accessFor(noneConfig, "sales_manager", "money")).toBe("none");
    expect(hasAccess(noneConfig, "sales_manager", "money", "view")).toBe(false);
  });

  it("store_manager with none on quotes has no access", () => {
    expect(accessFor(noneConfig, "store_manager", "quotes")).toBe("none");
    expect(hasAccess(noneConfig, "store_manager", "quotes", "view")).toBe(false);
  });

  it("fabrication_supervisor with none on parties has no access", () => {
    expect(accessFor(noneConfig, "fabrication_supervisor", "parties")).toBe("none");
    expect(hasAccess(noneConfig, "fabrication_supervisor", "parties", "view")).toBe(false);
  });
});
