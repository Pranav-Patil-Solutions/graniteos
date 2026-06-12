"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScanLine, Wand2, MessageSquareText, Sparkles } from "lucide-react";
import AiTryOn from "@/components/catalog/AiTryOn";
import MarketingStudio from "@/components/growth/MarketingStudio";
import SlabIdentifier from "@/components/ai-studio/SlabIdentifier";
import type { VizMaterial } from "@/components/catalog/StoneVisualizer";

type ToolKey = "identify" | "visualize" | "copy";

const TOOLS: { key: ToolKey; label: string; tag: string; icon: React.ReactNode }[] = [
  { key: "identify", label: "Slab Identifier", tag: "Snap a slab → instant listing", icon: <ScanLine className="w-5 h-5" /> },
  { key: "visualize", label: "Room Visualizer", tag: "See the stone in your space", icon: <Wand2 className="w-5 h-5" /> },
  { key: "copy", label: "Copywriter", tag: "WhatsApp posts & offers", icon: <MessageSquareText className="w-5 h-5" /> },
];

export default function AiStudio({
  vizMaterials,
  materials,
}: {
  vizMaterials: VizMaterial[];
  materials: string[];
}) {
  const [tool, setTool] = useState<ToolKey>("identify");

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-gold">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">AI Studio</h1>
          <p className="text-sm text-slate-400">Every AI tool for your stone business, in one place.</p>
        </div>
      </div>

      {/* tool selector */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {TOOLS.map((t) => {
          const active = tool === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTool(t.key)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-gold/50 bg-gold/[0.08]"
                  : "border-graphite-600 bg-graphite-900/40 hover:border-graphite-500"
              }`}
            >
              <span className={active ? "text-gold" : "text-slate-300"}>{t.icon}</span>
              <p className={`mt-2 text-xs font-bold leading-tight ${active ? "text-gold" : "text-white"}`}>
                {t.label}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">{TOOLS.find((t) => t.key === tool)?.tag}</p>

      <div className="mt-3">
        {tool === "identify" && <SlabIdentifier />}
        {tool === "visualize" && <AiTryOn materials={vizMaterials} />}
        {tool === "copy" && <MarketingStudio materials={materials} />}
      </div>
    </div>
  );
}
