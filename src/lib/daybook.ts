// Daybook — groups an activity feed (newest-first) into calendar days.
// Reuses the activity-log row shape. Pure + tested.

import type { LogRow } from "@/lib/activity-log";

export type DayGroup = { dayKey: string; label: string; rows: LogRow[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Group rows (assumed already sorted newest-first) by their YYYY-MM-DD. */
export function groupByDay(rows: LogRow[]): DayGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, LogRow[]>();
  for (const r of rows) {
    const key = r.at.slice(0, 10);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(r);
  }
  return order.map((key) => ({ dayKey: key, label: dayLabel(key), rows: byKey.get(key)! }));
}
