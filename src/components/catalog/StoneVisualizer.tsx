"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import RoomTryOn from "./RoomTryOn";
import AiTryOn from "./AiTryOn";

export type VizMaterial = {
  label: string;
  material: string;
  color?: string | null;
  photo_path?: string | null;
};

export default function StoneVisualizer({
  materials,
  triggerLabel,
  triggerClassName,
}: {
  materials: VizMaterial[];
  triggerLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"rooms" | "ai">("rooms");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#0b0e11] hover:brightness-110"
        }
      >
        <Sparkles className="w-4 h-4" /> {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-graphite-600 bg-graphite-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" /> See it in your space
              </h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* tabs */}
            <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-graphite-600">
              <button
                onClick={() => setTab("rooms")}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  tab === "rooms" ? "bg-gold/15 text-gold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Try a room
              </button>
              <button
                onClick={() => setTab("ai")}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  tab === "ai" ? "bg-gold/15 text-gold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Use my photo ✨
              </button>
            </div>

            <div className="mt-3">
              {tab === "rooms" ? <RoomTryOn materials={materials} /> : <AiTryOn materials={materials} />}
            </div>

            <p className="mt-3 text-[11px] text-graphite-500">
              {tab === "rooms"
                ? "Preview on a sample room — actual stone shade & veining vary slab to slab."
                : "AI photoreal on your own photo. Actual stone varies slab to slab."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
