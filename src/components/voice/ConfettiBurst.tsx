"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * One-shot celebration burst — the "you did it" moment on completion (a recorded
 * payment, a saved note). Pass a counter as `fire`; every time it increases the
 * confetti fountains up from the bottom centre and clears itself. Reusable
 * sibling to the dashboard's CelebrationLayer.
 */

const COLORS = ["#34d399", "#c9a24b", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa"];

export default function ConfettiBurst({ fire, label }: { fire: number; label?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (fire <= 0) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2000);
    return () => clearTimeout(t);
  }, [fire]);

  const bits = Array.from({ length: 28 }, (_, i) => i);

  return (
    <AnimatePresence>
      {on && (
        <div key={fire} className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
          {bits.map((i) => {
            const spread = (i / bits.length) * 2 - 1; // -1..1
            const dx = spread * 220 + ((i % 3) - 1) * 24;
            const dy = -(180 + (i % 5) * 60);
            const color = COLORS[i % COLORS.length];
            const delay = (i % 7) * 0.02;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: dx, y: dy, opacity: [1, 1, 0], rotate: 540 }}
                transition={{ duration: 1.5, delay, ease: "easeOut" }}
                style={{ left: "50%", bottom: "12%", background: color }}
                className="absolute h-2 w-2 rounded-[2px]"
              />
            );
          })}
          {label && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-[30%] rounded-full bg-granite-green2/20 border border-granite-green2/40 px-4 py-1.5 text-sm font-bold text-granite-green2"
            >
              {label}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
