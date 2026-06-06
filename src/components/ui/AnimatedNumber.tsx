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
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = frameValue(value, 0, duration, delay, now - t0);
      setShown(v);
      if (now - t0 < delay + duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);
  return (
    <span className={className}>
      {prefix}
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
