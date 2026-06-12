import { describe, it, expect } from "vitest";
import { groupTasks, carriedDays, type TaskRow } from "./tasks";

const NOW = new Date("2026-06-12T14:00:00");

const t = (over: Partial<TaskRow>): TaskRow => ({
  id: "x",
  title: "task",
  status: "open",
  created_at: "2026-06-12T08:00:00",
  completed_at: null,
  ...over,
});

describe("carriedDays", () => {
  it("is 0 for a task created today", () => {
    expect(carriedDays("2026-06-12T01:00:00", NOW)).toBe(0);
  });
  it("counts whole days since creation (carry-forward)", () => {
    expect(carriedDays("2026-06-10T23:59:00", NOW)).toBe(2);
  });
});

describe("groupTasks", () => {
  it("keeps every open task in today's list, oldest first", () => {
    const { open } = groupTasks(
      [
        t({ id: "new", created_at: "2026-06-12T09:00:00" }),
        t({ id: "old", created_at: "2026-06-09T09:00:00" }),
      ],
      NOW,
    );
    expect(open.map((x) => x.id)).toEqual(["old", "new"]);
    expect(open[0].carriedDays).toBe(3);
    expect(open[1].carriedDays).toBe(0);
  });

  it("splits done tasks into today vs history by completion day", () => {
    const { doneToday, history } = groupTasks(
      [
        t({ id: "a", status: "done", completed_at: "2026-06-12T10:00:00" }),
        t({ id: "b", status: "done", completed_at: "2026-06-11T10:00:00" }),
        t({ id: "c", status: "done", completed_at: "2026-06-11T12:00:00" }),
      ],
      NOW,
    );
    expect(doneToday.map((x) => x.id)).toEqual(["a"]);
    expect(history).toHaveLength(1);
    expect(history[0].rows).toHaveLength(2);
    expect(history[0].label).toBe("11 Jun 2026");
  });
});
