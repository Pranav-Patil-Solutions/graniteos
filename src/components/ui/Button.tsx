"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

type Variant = "press" | "spring" | "outline" | "morph";

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  /** For "morph": an async action; the button spins, then shows ✓. */
  onAction?: () => Promise<unknown> | void;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 font-bold text-[15px] rounded-2xl px-6 py-3.5 select-none";

export function Button({
  children,
  variant = "press",
  className = "",
  onAction,
  onClick,
  type = "button",
  disabled,
}: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  if (variant === "morph") {
    async function run() {
      if (state !== "idle") return;
      haptic("tap");
      setState("loading");
      try {
        await onAction?.();
        setState("done");
        haptic("success");
        setTimeout(() => setState("idle"), 1300);
      } catch {
        setState("idle");
      }
    }
    // Plain <button> with CSS transitions for the morph (loading → ✓) feel.
    return (
      <button
        suppressHydrationWarning
        type={type}
        onClick={run}
        disabled={disabled || state !== "idle"}
        className={`${base} text-white transition-all duration-300 ${
          state === "done" ? "bg-green-600" : "bg-granite-green2"
        } ${state !== "idle" ? "!px-3.5 !rounded-full" : ""} ${className}`}
      >
        {state === "loading" ? (
          <span className="block w-5 h-5 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
        ) : state === "done" ? (
          <Check className="w-5 h-5" strokeWidth={3} />
        ) : (
          children
        )}
      </button>
    );
  }

  if (variant === "spring") {
    return (
      <motion.button
        suppressHydrationWarning
        type={type}
        onClick={onClick}
        disabled={disabled}
        onTapStart={() => haptic("tap")}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        className={`${base} bg-[#25D366] text-[#06351a] ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  if (variant === "outline") {
    return (
      <motion.button
        suppressHydrationWarning
        type={type}
        onClick={onClick}
        disabled={disabled}
        onTapStart={() => haptic("tap")}
        whileTap={{ scale: 0.97 }}
        className={`${base} relative overflow-hidden border-2 border-gold text-gold ${className}`}
        initial="rest"
        whileHover="hover"
      >
        <motion.span
          className="absolute inset-0 bg-gold origin-left"
          variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
          transition={{ duration: 0.3 }}
        />
        <motion.span
          className="relative z-10"
          variants={{ rest: { color: "var(--btn-outline-ink)" }, hover: { color: "#1a1407" } }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.span>
      </motion.button>
    );
  }

  // default: 3D press
  return (
    <motion.button
      suppressHydrationWarning
      type={type}
      onClick={onClick}
      disabled={disabled}
      onTapStart={() => haptic("tap")}
      whileTap={{ y: 5 }}
      transition={{ type: "spring", stiffness: 800, damping: 20 }}
      className={`${base} bg-granite-green2 text-white ${className}`}
      style={{ boxShadow: "0 6px 0 #0c5236, 0 10px 18px rgba(0,0,0,.4)" }}
    >
      {children}
    </motion.button>
  );
}
