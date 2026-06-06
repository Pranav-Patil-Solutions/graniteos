"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function TiltCard({
  children,
  wow,
  className = "",
}: {
  children: ReactNode;
  wow?: boolean;
  className?: string;
}) {
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 18);
        rx.set((0.5 - (e.clientY - r.top) / r.height) * 18);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={`rounded-2xl p-4 border ${
        wow
          ? "border-[#3a3320] bg-gradient-to-br from-[#1c1810] to-graphite-800"
          : "border-graphite-500 bg-gradient-to-br from-graphite-700 to-graphite-800"
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
