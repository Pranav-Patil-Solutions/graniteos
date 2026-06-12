import { describe, it, expect } from "vitest";
import { groupByDay } from "@/lib/daybook";
import type { LogRow } from "@/lib/activity-log";

const row = (at: string, desc: string): LogRow => ({ at, kind: "invoice", label: "X", desc });

describe("groupByDay", () => {
  it("groups by calendar day, preserving newest-first order", () => {
    const groups = groupByDay([
      row("2026-06-12T10:00:00Z", "a"),
      row("2026-06-12T09:00:00Z", "b"),
      row("2026-06-11T15:00:00Z", "c"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].dayKey).toBe("2026-06-12");
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1].dayKey).toBe("2026-06-11");
    expect(groups[1].label).toBe("11 Jun 2026");
  });

  it("returns empty for no rows", () => {
    expect(groupByDay([])).toEqual([]);
  });
});
