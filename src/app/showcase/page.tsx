"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Box, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TiltCard } from "@/components/ui/TiltCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const SlabViewer = dynamic(() => import("@/components/three/SlabViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full grid place-items-center text-graphite-500 text-sm">
      Loading 3D slab…
    </div>
  ),
});

export default function ShowcasePage() {
  // The recovery ring drives a CSS conic-gradient angle, so it needs the raw
  // animating number (AnimatedNumber only renders text).
  const [recovery, setRecovery] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 1400;
    const delay = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0 - delay) / dur);
      if (t > 0) setRecovery(Math.round(71 * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
              <AnimatedNumber
                value={240000}
                prefix="₹"
                className="block text-3xl font-extrabold text-gold mt-0.5"
              />
              <div className="mt-2 text-xs text-granite-green2">
                ▲ Recovery up 4% — ₹1.9L saved this month
              </div>
            </div>
          </div>
        </div>

        {/* tilt cards (shared TiltCard primitive) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-6" style={{ perspective: 1000 }}>
          <TiltCard>
            <div style={{ transform: "translateZ(30px)" }} className="text-graphite-200">
              <Box />
            </div>
            <p style={{ transform: "translateZ(22px)" }} className="font-bold mt-2 text-white">
              Stock
            </p>
            <p style={{ transform: "translateZ(14px)" }} className="text-xs text-slate-400 mt-1">
              412 slabs · 18 blocks
            </p>
          </TiltCard>
          <TiltCard wow>
            <div style={{ transform: "translateZ(30px)" }} className="text-gold">
              <Star />
            </div>
            <p style={{ transform: "translateZ(22px)" }} className="font-bold mt-2 text-gold">
              Recovery Radar
            </p>
            <p style={{ transform: "translateZ(14px)" }} className="text-xs text-slate-400 mt-1">
              71% avg yield
            </p>
          </TiltCard>
          <TiltCard>
            <div style={{ transform: "translateZ(30px)" }} className="text-graphite-200">
              <FileText />
            </div>
            <p style={{ transform: "translateZ(22px)" }} className="font-bold mt-2 text-white">
              GST Bills
            </p>
            <p style={{ transform: "translateZ(14px)" }} className="text-xs text-slate-400 mt-1">
              auto 5% / 18%
            </p>
          </TiltCard>
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
            <span data-testid="morph-pay">
              <Button variant="morph" onAction={() => new Promise((r) => setTimeout(r, 1100))}>
                Record Payment
              </Button>
            </span>
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
