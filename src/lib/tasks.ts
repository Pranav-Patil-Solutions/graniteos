/**
 * Daybook task grouping — pure, so the page and tests share the same logic.
 *
 * The daybook model: an OPEN task always belongs to "today" no matter when it
 * was created (that's the carry-forward), with a `carriedDays` count so the UI
 * can show "since 10 Jun". A DONE task belongs to the day it was completed.
 */

export type TaskRow = {
  id: string;
  title: string;
  status: "open" | "done";
  created_at: string;
  completed_at: string | null;
};

export type OpenTask = TaskRow & { carriedDays: number };
export type DoneDay = { dayKey: string; label: string; rows: TaskRow[] };

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(dayKey: string): string {
  const d = new Date(dayKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Whole calendar days between a task's creation day and `now` (0 = today). */
export function carriedDays(createdAt: string, now: Date): number {
  const a = new Date(dayKeyOf(createdAt) + "T00:00:00").getTime();
  const b = new Date(dayKeyOf(now.toISOString()) + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function groupTasks(rows: TaskRow[], now: Date): {
  open: OpenTask[];
  doneToday: TaskRow[];
  history: DoneDay[];
} {
  const todayKey = dayKeyOf(now.toISOString());

  const open: OpenTask[] = rows
    .filter((t) => t.status === "open")
    .map((t) => ({ ...t, carriedDays: carriedDays(t.created_at, now) }))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)); // oldest first

  const done = rows.filter((t) => t.status === "done" && t.completed_at);
  const doneToday = done
    .filter((t) => dayKeyOf(t.completed_at as string) === todayKey)
    .sort((a, b) => ((a.completed_at as string) < (b.completed_at as string) ? 1 : -1));

  const byDay = new Map<string, TaskRow[]>();
  for (const t of done) {
    const k = dayKeyOf(t.completed_at as string);
    if (k === todayKey) continue;
    if (!byDay.has(k)) byDay.set(k, []);
    (byDay.get(k) as TaskRow[]).push(t);
  }
  const history: DoneDay[] = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest day first
    .map(([dayKey, rows]) => ({ dayKey, label: dayLabel(dayKey), rows }));

  return { open, doneToday, history };
}
