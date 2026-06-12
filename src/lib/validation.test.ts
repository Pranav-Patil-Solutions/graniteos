import { describe, it, expect } from "vitest";
import { phoneSchema, otpSchema, companySetupSchema } from "./validation";

describe("phoneSchema", () => {
  it("accepts E.164-ish numbers", () => {
    expect(phoneSchema.safeParse("+919999999999").success).toBe(true);
  });
  it("accepts a German (+49) number", () => {
    expect(phoneSchema.safeParse("+4915123456789").success).toBe(true);
  });
  it("accepts numbers typed with spaces/dashes and cleans them", () => {
    const r = phoneSchema.safeParse("+49 151 2345-6789");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("+4915123456789");
  });
  it("rejects junk", () => {
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("requires exactly 6 digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("123").success).toBe(false);
  });
});

describe("companySetupSchema", () => {
  it("accepts a minimal valid company", () => {
    const r = companySetupSchema.safeParse({
      companyName: "Sharma Stone", city: "Jamnagar", ownerName: "Ramesh",
      productKey: "GRNT-AB23-CD45-EF67",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a too-short company name", () => {
    const r = companySetupSchema.safeParse({
      companyName: "S", city: "X", ownerName: "Ramesh", productKey: "GRNT-AB23-CD45-EF67",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a missing product key", () => {
    const r = companySetupSchema.safeParse({
      companyName: "Sharma Stone", city: "Jamnagar", ownerName: "Ramesh",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a product key with invalid characters", () => {
    const r = companySetupSchema.safeParse({
      companyName: "Sharma Stone", city: "Jamnagar", ownerName: "Ramesh",
      productKey: "GRNT_$$$$",
    });
    expect(r.success).toBe(false);
  });
});
