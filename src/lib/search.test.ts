import { describe, it, expect } from "vitest";
import { matches } from "./search";

describe("matches", () => {
  it("matches case-insensitively in any field", () => {
    expect(matches("galaxy", "Black Galaxy", "granite")).toBe(true);
    expect(matches("GRANITE", "Black Galaxy", "granite")).toBe(true);
  });

  it("does not match when absent", () => {
    expect(matches("marble", "Black Galaxy", "granite")).toBe(false);
  });

  it("finds a Latin query inside a Hindi field", () => {
    expect(matches("rajesh", "राजेश")).toBe(true);
  });

  it("ignores empty query and null fields", () => {
    expect(matches("  ", "anything")).toBe(false);
    expect(matches("x", null, undefined)).toBe(false);
  });
});
