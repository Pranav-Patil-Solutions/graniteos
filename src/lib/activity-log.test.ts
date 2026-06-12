import { describe, it, expect } from "vitest";
import { buildActivityLog } from "@/lib/activity-log";

const pname = (id: string | null) => (id === "c1" ? "Sharma Marbles" : id ?? "—");

describe("buildActivityLog", () => {
  it("flattens every source into one feed", () => {
    const rows = buildActivityLog(
      {
        parties: [{ id: "c1", kind: "customer", name: "Sharma", created_at: "2026-06-11T08:00:00Z" }],
        invoices: [{ invoice_no: "INV-1", customer_id: "c1", total_paise: 100000, created_at: "2026-06-11T10:00:00Z" }],
        payments: [{ customer_id: "c1", amount_paise: 50000, mode: "upi", created_at: "2026-06-11T12:00:00Z" }],
        slabs: [{ sqft: 42, created_at: "2026-06-11T09:00:00Z" }],
      },
      pname,
    );
    expect(rows).toHaveLength(4);
  });

  it("sorts newest first", () => {
    const rows = buildActivityLog(
      {
        payments: [{ customer_id: null, amount_paise: 1, mode: "cash", created_at: "2026-06-11T12:00:00Z" }],
        slabs: [{ sqft: 1, created_at: "2026-06-11T09:00:00Z" }],
      },
      pname,
    );
    expect(rows[0].kind).toBe("payment");
    expect(rows[1].kind).toBe("slab");
  });

  it("resolves party names and formats rupees", () => {
    const rows = buildActivityLog(
      { payments: [{ customer_id: "c1", amount_paise: 100000, mode: "upi", created_at: "2026-06-11T12:00:00Z" }] },
      pname,
    );
    expect(rows[0].desc).toContain("Sharma Marbles");
    expect(rows[0].desc).toContain("₹1,000");
  });

  it("humanizes order status underscores", () => {
    const rows = buildActivityLog(
      { orders: [{ order_no: "ORD-9", status: "in_production", created_at: "2026-06-11T12:00:00Z" }] },
      pname,
    );
    expect(rows[0].desc).toBe("Order ORD-9 — in production");
  });
});
