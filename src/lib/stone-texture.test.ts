import { describe, it, expect } from "vitest";
import { triangleAffine, paletteKey, type Pt } from "./stone-texture";

const apply = (m: number[], p: Pt): Pt => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("triangleAffine", () => {
  const s0 = { x: 0, y: 0 };
  const s1 = { x: 2, y: 0 };
  const s2 = { x: 0, y: 2 };

  it("identity when source == dest", () => {
    const m = triangleAffine(s0, s1, s2, s0, s1, s2)!;
    expect([m[0], m[1], m[2], m[3], m[4], m[5]].every((v, i) => near(v, [1, 0, 0, 1, 0, 0][i]))).toBe(true);
  });

  it("pure translation", () => {
    const t = (p: Pt) => ({ x: p.x + 5, y: p.y + 7 });
    const m = triangleAffine(s0, s1, s2, t(s0), t(s1), t(s2))!;
    expect(near(m[4], 5) && near(m[5], 7) && near(m[0], 1) && near(m[3], 1)).toBe(true);
  });

  it("maps each source vertex exactly onto its dest vertex", () => {
    const d0 = { x: 10, y: 20 };
    const d1 = { x: 90, y: 5 };
    const d2 = { x: 30, y: 80 };
    const m = triangleAffine(s0, s1, s2, d0, d1, d2)!;
    for (const [s, d] of [
      [s0, d0],
      [s1, d1],
      [s2, d2],
    ] as [Pt, Pt][]) {
      const r = apply(m, s);
      expect(near(r.x, d.x) && near(r.y, d.y)).toBe(true);
    }
  });

  it("returns null for a degenerate source", () => {
    expect(triangleAffine({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, s0, s1, s2)).toBe(null);
  });
});

describe("paletteKey", () => {
  it("classifies common stones", () => {
    expect(paletteKey("Black Galaxy")).toBe("black");
    expect(paletteKey("Makrana White Marble")).toBe("white");
    expect(paletteKey("Rajnagar Green Marble")).toBe("green");
    expect(paletteKey("Tan Brown")).toBe("brown");
    expect(paletteKey("Mystery")).toBe("default");
  });
});
