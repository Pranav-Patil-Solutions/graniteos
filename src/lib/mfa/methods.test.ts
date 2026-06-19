import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone, methodSendsCode } from "./methods";

describe("maskEmail", () => {
  it("keeps the first two local chars + full domain", () => {
    expect(maskEmail("rajesh@gmail.com")).toBe("ra•••@gmail.com");
  });
  it("handles a one-char local part", () => {
    expect(maskEmail("a@b.com")).toBe("a•••@b.com");
  });
  it("returns empty for nullish", () => {
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
  });
  it("leaves a malformed address untouched", () => {
    expect(maskEmail("notanemail")).toBe("notanemail");
  });
});

describe("maskPhone", () => {
  it("keeps the +country prefix and last four", () => {
    expect(maskPhone("+919812345678")).toBe("+91 ••••• 5678");
  });
  it("strips spaces and masks the middle", () => {
    expect(maskPhone("+91 98123 45678")).toBe("+91 ••••• 5678");
  });
  it("handles a local number with no plus", () => {
    expect(maskPhone("9812345678")).toBe("98 ••••• 5678");
  });
  it("returns short input as-is", () => {
    expect(maskPhone("123")).toBe("123");
    expect(maskPhone("")).toBe("");
  });
});

describe("methodSendsCode", () => {
  it("is true for email + phone, false for authenticator", () => {
    expect(methodSendsCode("email")).toBe(true);
    expect(methodSendsCode("phone")).toBe(true);
    expect(methodSendsCode("authenticator")).toBe(false);
  });
});
