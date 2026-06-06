"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Box, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";

const SlabViewer = dynamic(() => import("@/components/three/SlabViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full grid place-items-center text-graphite-500 text-sm">
      Loading 3D slab…
    </div>
  ),
});

/* count-up hook */
function useCountUp(target: number, dur = 1400, delay = 300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0 - delay) / dur);
      if (t > 0) setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, delay]);
  return v;
}

function TiltCard({
  icon,
  title,
  sub,
  wow,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  wow?: boolean;
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
      }`}
    >
      <div style={{ transform: "translateZ(30px)" }} className={wow ? "text-gold" : "text-graphite-200"}>
        {icon}
      </div>
      <p
        style={{ transform: "translateZ(22px)" }}
        className={`font-bold mt-2 ${wow ? "text-gold" : "text-white"}`}
      >
        {title}
      </p>
      <p style={{ transform: "translateZ(14px)" }} className="text-xs text-slate-400 mt-1">
        {sub}
      </p>
    </motion.div>
  );
}

export default function ShowcasePage() {
  const cash = useCountUp(240000);
  const recovery = useCountUp(71, 1400, 700);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)] text-[#e8e6e1] px-5 py-7">
      <div className="max-w-5xl mx-auto">
        {/* top */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-granite-green to-granite-green2 grid place-items-center font-extrabold text-white text-xl shadow-lg shadow-granite-green2/40">
            G
          </div>
          <div>
            <div className="text-lg font-bold">GraniteOS</div>
            <div className="text-xs text-slate-400">premium · interactive · 3D</div>
          </div>
          <div className="ml-auto text-xs text-gold border border-graphite-500 px-3 py-1.5 rounded-full">
            👆 drag the slab
          </div>
        </div>

        {/* hero */}
        <div className="grid md:grid-cols-2 gap-5 mt-6 items-center">
          <div className="relative h-[320px] rounded-3xl bg-gradient-to-b from-graphite-800 to-graphite-900 border border-graphite-600 overflow-hidden shadow-inner">
            <SlabViewer className="w-full h-full" />
            <div className="absolute left-4 bottom-3 text-xs text-slate-400">
              Black Galaxy · <span className="text-gold font-semibold">spin it</span> — your real slabs, in 3D
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-gold">Good morning</div>
            <div className="text-3xl font-bold mt-0.5">Ramesh Sharma</div>
            <div className="text-slate-400 text-sm">Sharma Stone Industries</div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] border border-graphite-600 p-5 backdrop-blur">
              <div className="text-xs text-slate-400">Cash in today</div>
              <div className="text-3xl font-extrabold text-gold mt-0.5">
                ₹{cash.toLocaleString("en-IN")}
              </div>
              <div className="mt-2 text-xs text-granite-green2">
                ▲ Recovery up 4% — ₹1.9L saved this month
              </div>
            </div>
          </div>
        </div>

        {/* tilt cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-6" style={{ perspective: 1000 }}>
          <TiltCard icon={<Box />} title="Stock" sub="412 slabs · 18 blocks" />
          <TiltCard icon={<Star />} title="Recovery Radar" sub="71% avg yield" wow />
          <TiltCard icon={<FileText />} title="GST Bills" sub="auto 5% / 18%" />
        </div>

        {/* recovery gauge */}
        <div className="flex items-center gap-5 mt-6 bg-white/[0.03] border border-graphite-600 rounded-3xl p-5">
          <div
            className="w-28 h-28 rounded-full grid place-items-center shrink-0"
            style={{ background: `conic-gradient(#1f8a5b ${recovery}%, #1c2228 0)` }}
          >
            <div className="w-[88px] h-[88px] rounded-full bg-graphite-900 grid place-items-center">
              <div className="text-2xl font-extrabold">{recovery}%</div>
              <div className="text-[10px] text-slate-400">avg recovery</div>
            </div>
          </div>
          <div>
            <div className="font-bold">Profit &amp; Recovery Radar ⭐</div>
            <div className="text-sm text-slate-400 mt-1">
              What each block &amp; machine really earns you.
            </div>
            <div className="mt-2 text-xs text-gold bg-gold/[0.08] border border-[#3a3320] rounded-lg px-2.5 py-2">
              😲 Machine #2 wastes 8% more stone than #1 — ₹3.2 lakh/year.
            </div>
          </div>
        </div>

        {/* buttons */}
        <div className="mt-7">
          <div className="text-xs text-slate-400 mb-3">Your buttons — click &amp; feel them:</div>
          <div className="flex flex-wrap gap-3">
            <Button variant="press">＋ New GST Bill</Button>
            <Button variant="spring">📲 Send on WhatsApp</Button>
            <Button variant="morph" onAction={() => new Promise((r) => setTimeout(r, 1100))}>
              Record Payment
            </Button>
            <Button variant="outline">View Details</Button>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-graphite-500">
          Live in the real app · Next.js + Framer Motion + Three.js · runs without the database
        </div>
      </div>
    </div>
  );
}
