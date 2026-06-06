import { describe, it, expect } from "vitest";
import { easeOutCubic, frameValue } from "./animate";

describe("easeOutCubic", () => {
  it("is 0 at t=0 and 1 at t=1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
  it("is past halfway at t=0.5 (ease-out)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("frameValue", () => {
  it("returns 0 before the delay", () => {
    expect(frameValue(240000, 0, 1400, 300, 100)).toBe(0); // elapsed 100 < delay 300
  });
  it("returns the target once finished", () => {
    expect(frameValue(240000, 0, 1400, 300, 5000)).toBe(240000);
  });
  it("is monotonic between start and end", () => {
    const a = frameValue(100, 0, 1000, 0, 250);
    const b = frameValue(100, 0, 1000, 0, 500);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
