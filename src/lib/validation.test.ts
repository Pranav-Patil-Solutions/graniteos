import { describe, it, expect } from "vitest";
import { phoneSchema, otpSchema, companySetupSchema } from "./validation";

describe("phoneSchema", () => {
  it("accepts E.164-ish numbers", () => {
    expect(phoneSchema.safeParse("+919999999999").success).toBe(true);
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
    });
    expect(r.success).toBe(true);
  });
  it("rejects a too-short company name", () => {
    const r = companySetupSchema.safeParse({ companyName: "S", city: "X", ownerName: "Ramesh" });
    expect(r.success).toBe(false);
  });
});
