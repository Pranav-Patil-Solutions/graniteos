"use client";

import { useEffect, useState } from "react";
import { frameValue } from "./animate";

export { easeOutCubic, frameValue } from "./animate";

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 1400,
  delay = 200,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // Honour reduced-motion: skip the count-up entirely.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = frameValue(value, 0, duration, delay, now - t0);
      setShown(v);
      if (now - t0 < delay + duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Guarantee the final value even if rAF is throttled or paused (e.g. a
    // background tab, where requestAnimationFrame never fires): setTimeout
    // still runs, so the number always lands on its target.
    const settle = setTimeout(() => setShown(value), delay + duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [value, duration, delay]);
  return (
    <span className={className}>
      {prefix}
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
