"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Premium 3D auth backdrop: a black-gold marble photo that parallaxes with the
 * cursor, behind a frosted-glass card that tilts in 3D. Wraps the login/setup forms.
 */
export default function AuthScene({ children }: { children: ReactNode }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  // Marble parallax (moves opposite the cursor, subtly)
  const bgX = useSpring(useTransform(mx, [0, 1], [18, -18]), { stiffness: 60, damping: 20 });
  const bgY = useSpring(useTransform(my, [0, 1], [18, -18]), { stiffness: 60, damping: 20 });

  // Glass-card 3D tilt
  const rotX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 150, damping: 18 });
  const rotY = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 150, damping: 18 });

  function onMove(e: React.PointerEvent) {
    mx.set(e.clientX / window.innerWidth);
    my.set(e.clientY / window.innerHeight);
  }

  return (
    <div
      onPointerMove={onMove}
      className="relative min-h-screen overflow-hidden bg-graphite-900"
    >
      {/* parallax marble background */}
      <motion.div aria-hidden style={{ x: bgX, y: bgY }} className="absolute -inset-12">
        <Image
          src="/login-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      {/* darkening + vignette for contrast */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_40%,rgba(0,0,0,0.55))]" />

      {/* tilting glass card */}
      <div
        className="relative min-h-screen grid place-items-center px-5 py-10"
        style={{ perspective: 1200 }}
      >
        <motion.div
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
          className="w-full max-w-sm rounded-3xl border border-gold/30 bg-white/[0.06] backdrop-blur-xl p-7 shadow-2xl shadow-black/60"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
