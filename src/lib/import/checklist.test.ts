import { describe, it, expect } from "vitest";
import {
  buildChecklist,
  isChecklistComplete,
  checklistProgress,
  type ChecklistCounts,
} from "./checklist";

// ── buildChecklist ────────────────────────────────────────────────────────────

describe("buildChecklist()", () => {
  it("always marks 'Redeem key' as done regardless of counts", () => {
    const c: ChecklistCounts = { products: 0, users: 1, quotes: 0, orders: 0 };
    const items = buildChecklist(c);
    expect(items.find((i) => i.key === "key")?.done).toBe(true);
  });

  it("marks 'Import masters' done when products > 0", () => {
    expect(buildChecklist({ products: 1, users: 1, quotes: 0, orders: 0 })
      .find((i) => i.key === "masters")?.done).toBe(true);
    expect(buildChecklist({ products: 0, users: 1, quotes: 0, orders: 0 })
      .find((i) => i.key === "masters")?.done).toBe(false);
  });

  it("marks 'Add team' done when users > 1", () => {
    expect(buildChecklist({ products: 0, users: 2, quotes: 0, orders: 0 })
      .find((i) => i.key === "team")?.done).toBe(true);
    expect(buildChecklist({ products: 0, users: 1, quotes: 0, orders: 0 })
      .find((i) => i.key === "team")?.done).toBe(false);
  });

  it("marks 'Create a quote' done when quotes > 0", () => {
    expect(buildChecklist({ products: 0, users: 1, quotes: 3, orders: 0 })
      .find((i) => i.key === "quote")?.done).toBe(true);
  });

  it("marks 'Record an order' done when orders > 0", () => {
    expect(buildChecklist({ products: 0, users: 1, quotes: 0, orders: 1 })
      .find((i) => i.key === "order")?.done).toBe(true);
  });

  it("returns exactly 5 items in the right order", () => {
    const items = buildChecklist({ products: 0, users: 1, quotes: 0, orders: 0 });
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.key)).toEqual(["key", "masters", "team", "quote", "order"]);
  });

  it("every item has a non-empty label, href and hint", () => {
    const items = buildChecklist({ products: 0, users: 1, quotes: 0, orders: 0 });
    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.hint.length).toBeGreaterThan(0);
    }
  });
});

// ── isChecklistComplete ───────────────────────────────────────────────────────

describe("isChecklistComplete()", () => {
  it("returns false when any non-always-done item is pending", () => {
    expect(isChecklistComplete({ products: 0, users: 1, quotes: 0, orders: 0 })).toBe(false);
    expect(isChecklistComplete({ products: 1, users: 1, quotes: 0, orders: 0 })).toBe(false);
  });

  it("returns true only when all items are done", () => {
    expect(isChecklistComplete({ products: 1, users: 2, quotes: 1, orders: 1 })).toBe(true);
  });
});

// ── checklistProgress ─────────────────────────────────────────────────────────

describe("checklistProgress()", () => {
  it("returns total = 5 always", () => {
    const { total } = checklistProgress({ products: 0, users: 1, quotes: 0, orders: 0 });
    expect(total).toBe(5);
  });

  it("counts done items correctly", () => {
    // key is always done (1), products done (1) = 2
    const { done } = checklistProgress({ products: 1, users: 1, quotes: 0, orders: 0 });
    expect(done).toBe(2);
  });

  it("returns done = 5 when everything is complete", () => {
    const { done, total } = checklistProgress({ products: 1, users: 2, quotes: 1, orders: 1 });
    expect(done).toBe(total);
  });
});
