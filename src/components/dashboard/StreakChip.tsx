"use client";

import { useEffect, useState } from "react";

/**
 * A daily-visit streak. Pure client/localStorage for v1 (no DB needed) — it
 * rewards the habit of opening the app every day. The number going up is a
 * small, real dopamine hit; breaking a long streak is a loss the user avoids.
 *
 * (Server-backed streaks come with the engagement table later so they survive
 * across devices.)
 */

const KEY = "gos_streak_v1";
const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local-ish)

function dayDiff(a: string, b: string) {
  return Math.round(
    (new Date(b + "T00:00").getTime() - new Date(a + "T00:00").getTime()) / 86_400_000,
  );
}

export default function StreakChip() {
  const [count, setCount] = useState<number | null>(null);
  const [milestone, setMilestone] = useState(false);

  useEffect(() => {
    let saved: { last: string; n: number } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      saved = null;
    }
    const t = today();
    let n = 1;
    if (saved) {
      const gap = dayDiff(saved.last, t);
      if (gap === 0) n = saved.n; // already counted today
      else if (gap === 1) n = saved.n + 1; // consecutive day
      else n = 1; // streak broken
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ last: t, n }));
    } catch {
      /* ignore */
    }
    setCount(n);
    if (n === 3 || n === 7 || n === 14 || n === 30 || n % 50 === 0) setMilestone(true);
  }, []);

  if (count === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
        milestone
          ? "bg-gold/20 text-gold border-gold/40"
          : "bg-white/[0.05] text-slate-300 border-graphite-600"
      }`}
      title="Days in a row you've opened GraniteOS"
    >
      🔥 {count}-day streak{milestone ? " · milestone!" : ""}
    </span>
  );
}
