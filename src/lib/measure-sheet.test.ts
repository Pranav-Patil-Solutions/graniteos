import { describe, it, expect } from "vitest";
import { sheetTotals } from "@/lib/measure-sheet";

describe("sheetTotals", () => {
  it("sums area and value (sqft × paise-per-sqft)", () => {
    const t = sheetTotals([
      { sqft: 130, rate_paise: 8000 }, // ₹80/sqft → 1,040,000 paise
      { sqft: 42, rate_paise: 24000 }, // 1,008,000 paise
    ]);
    expect(t.count).toBe(2);
    expect(t.area).toBe(172);
    expect(t.value_paise).toBe(1040000 + 1008000);
  });

  it("tolerates postgres string numerics and empty input", () => {
    expect(sheetTotals([])).toEqual({ count: 0, area: 0, value_paise: 0 });
    const t = sheetTotals([{ sqft: "10.5", rate_paise: "10000" }]);
    expect(t.area).toBe(10.5);
    expect(t.value_paise).toBe(105000);
  });
});
