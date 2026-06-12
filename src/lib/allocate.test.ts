import { describe, it, expect } from "vitest";
import { allocateFifo } from "@/lib/allocate";

describe("allocateFifo", () => {
  it("fills the oldest invoices first", () => {
    const r = allocateFifo(15000, [
      { id: "A", outstanding_paise: 10000 },
      { id: "B", outstanding_paise: 10000 },
    ]);
    expect(r.allocations).toEqual([
      { invoiceId: "A", amount_paise: 10000 },
      { invoiceId: "B", amount_paise: 5000 },
    ]);
    expect(r.leftover_paise).toBe(0);
  });

  it("returns leftover when the amount exceeds total due", () => {
    const r = allocateFifo(25000, [{ id: "A", outstanding_paise: 10000 }]);
    expect(r.allocations).toEqual([{ invoiceId: "A", amount_paise: 10000 }]);
    expect(r.leftover_paise).toBe(15000);
  });

  it("skips already-settled invoices", () => {
    const r = allocateFifo(5000, [
      { id: "A", outstanding_paise: 0 },
      { id: "B", outstanding_paise: 8000 },
    ]);
    expect(r.allocations).toEqual([{ invoiceId: "B", amount_paise: 5000 }]);
    expect(r.leftover_paise).toBe(0);
  });
});
