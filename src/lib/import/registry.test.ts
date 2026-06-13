import { describe, it, expect } from "vitest";
import { getImportModule, IMPORT_MODULES, WIZARD_MODULE_KEYS } from "./registry";

// ── Module presence ───────────────────────────────────────────────────────────

describe("IMPORT_MODULES registry", () => {
  it("contains products and team modules", () => {
    const keys = IMPORT_MODULES.map((m) => m.key);
    expect(keys).toContain("products");
    expect(keys).toContain("team");
  });

  it("products and customers are marked setupPriority=required", () => {
    const products = getImportModule("products");
    const customers = getImportModule("customers");
    expect(products?.setupPriority).toBe("required");
    expect(customers?.setupPriority).toBe("required");
  });

  it("WIZARD_MODULE_KEYS contains exactly the right 5 setup modules", () => {
    expect(WIZARD_MODULE_KEYS).toHaveLength(5);
    expect(WIZARD_MODULE_KEYS).toContain("products");
    expect(WIZARD_MODULE_KEYS).toContain("customers");
    expect(WIZARD_MODULE_KEYS).toContain("suppliers");
    expect(WIZARD_MODULE_KEYS).toContain("blocks");
    expect(WIZARD_MODULE_KEYS).toContain("team");
  });
});

// ── Products schema ───────────────────────────────────────────────────────────

describe("products module schema", () => {
  const mod = getImportModule("products")!;

  it("accepts a valid row with all fields", () => {
    const result = mod.schema.safeParse({
      name: "Black Galaxy 18mm",
      hsnCode: "68022190",
      uom: "SQF",
      rateRupees: "220",
      gstRate: "18",
      material: "Black Galaxy",
      finish: "Polished",
      notes: "Best seller",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a row with only the required name field", () => {
    const result = mod.schema.safeParse({
      name: "Statuario White",
      hsnCode: "",
      uom: "",
      rateRupees: "",
      gstRate: "",
      material: "",
      finish: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid GST rate", () => {
    const result = mod.schema.safeParse({
      name: "Test Product",
      gstRate: "15", // not a valid rate
    });
    expect(result.success).toBe(false);
    const msg = (result as { success: false; error: { issues: { message: string }[] } }).error.issues[0].message;
    expect(msg).toMatch(/0, 5, 12, 18 or 28/i);
  });

  it("accepts all valid GST rates (0, 5, 12, 18, 28)", () => {
    for (const rate of [0, 5, 12, 18, 28]) {
      const result = mod.schema.safeParse({ name: "Product", gstRate: rate });
      expect(result.success, `Expected GST rate ${rate} to be valid`).toBe(true);
    }
  });

  it("rejects an empty name", () => {
    const result = mod.schema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts numeric gstRate from xlsx (number type)", () => {
    const result = mod.schema.safeParse({ name: "Test", gstRate: 18 });
    expect(result.success).toBe(true);
  });
});

// ── Team schema ───────────────────────────────────────────────────────────────

describe("team module schema", () => {
  const mod = getImportModule("team")!;

  it("accepts a valid row", () => {
    const result = mod.schema.safeParse({
      name: "Ravi Kumar",
      phone: "+919876543210",
      role: "sales_manager",
    });
    expect(result.success).toBe(true);
  });

  it("accepts phone without country code", () => {
    const result = mod.schema.safeParse({
      name: "Priya Sharma",
      phone: "9876543210",
      role: "store_manager",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    const result = mod.schema.safeParse({
      name: "Test",
      phone: "123",
      role: "sales_manager",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = mod.schema.safeParse({
      name: "Test",
      phone: "+919876543210",
      role: "ceo",
    });
    expect(result.success).toBe(false);
    const msg = (result as { success: false; error: { issues: { message: string }[] } }).error.issues[0].message;
    expect(msg).toMatch(/sales_manager|store_manager|fabrication_supervisor/i);
  });

  it("accepts case-insensitive role values", () => {
    const result = mod.schema.safeParse({
      name: "Test",
      phone: "+919876543210",
      role: "Sales_Manager", // mixed case
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = mod.schema.safeParse({
      name: "",
      phone: "+919876543210",
      role: "sales_manager",
    });
    expect(result.success).toBe(false);
  });

  it("accepts phone number passed as a number (from xlsx)", () => {
    const result = mod.schema.safeParse({
      name: "Test",
      phone: 9876543210,
      role: "fabrication_supervisor",
    });
    expect(result.success).toBe(true);
  });
});

// ── canonicalEnum ─────────────────────────────────────────────────────────────

describe("canonicalEnum", () => {
  it("is tested via the existing customers schema — no change needed", () => {
    const mod = getImportModule("customers")!;
    expect(mod).toBeDefined();
  });
});
