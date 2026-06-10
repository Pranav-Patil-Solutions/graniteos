"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * The "variable reward" moment. When the owner opens the app and money landed
 * since they were last here, we celebrate it — confetti + the amount. Wins feel
 * like wins, which is what makes people come back to look.
 *
 * Uses a localStorage "last seen" stamp (no DB for v1). Payments newer than that
 * stamp = new since the last visit.
 */

const SEEN_KEY = "gos_last_seen_v1";

type Payment = { amount: number; at: string };

export default function CelebrationLayer({ recentPayments }: { recentPayments: Payment[] }) {
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    const last = localStorage.getItem(SEEN_KEY);
    const lastMs = last ? new Date(last).getTime() : 0;
    // First ever visit: don't fire (everything would count as "new").
    const fresh = last
      ? recentPayments.filter((p) => new Date(p.at).getTime() > lastMs)
      : [];
    // Always advance the stamp so we only celebrate each payment once.
    localStorage.setItem(SEEN_KEY, new Date().toISOString());

    if (fresh.length > 0) {
      setAmount(fresh.reduce((s, p) => s + p.amount, 0));
      setN(fresh.length);
      setShow(true);
      const t = setTimeout(() => setShow(false), 6000);
      return () => clearTimeout(t);
    }
  }, [recentPayments]);

  const rupees = Math.round(amount / 100).toLocaleString("en-IN");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="fixed top-4 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-granite-green2/40 bg-gradient-to-br from-[#0c2418] to-graphite-800 px-5 py-3.5 shadow-2xl cursor-pointer"
            onClick={() => setShow(false)}
          >
            <Confetti />
            <div className="relative flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-extrabold text-granite-green2 leading-tight">
                  ₹{rupees} collected
                </p>
                <p className="text-[11px] text-slate-300">
                  {n} {n === 1 ? "payment" : "payments"} since you were last here
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  const colors = ["#34d399", "#c9a24b", "#60a5fa", "#f472b6", "#fbbf24"];
  const bits = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {bits.map((i) => {
        const left = (i * 53) % 100;
        const delay = (i % 6) * 0.08;
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            initial={{ y: -10, opacity: 0, rotate: 0 }}
            animate={{ y: 90, opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 1.2 }}
            style={{ left: `${left}%`, background: color }}
            className="absolute top-0 h-1.5 w-1.5 rounded-[1px]"
          />
        );
      })}
    </div>
  );
}
