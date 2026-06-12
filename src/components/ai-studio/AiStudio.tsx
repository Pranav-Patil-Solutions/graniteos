"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScanLine, Wand2, MessageSquareText, Sparkles, AlertTriangle } from "lucide-react";
import AiTryOn from "@/components/catalog/AiTryOn";
import MarketingStudio from "@/components/growth/MarketingStudio";
import SlabIdentifier from "@/components/ai-studio/SlabIdentifier";
import type { VizMaterial } from "@/components/catalog/StoneVisualizer";

type ToolKey = "identify" | "visualize" | "copy";

// `paid: true` tools run on metered Gemini calls — they carry a PAID badge and
// stay blocked (UI + server action) until billing is set up. The Copywriter
// runs on Groq's free tier and is always available.
const TOOLS: { key: ToolKey; label: string; tag: string; paid: boolean; icon: React.ReactNode }[] = [
  { key: "identify", label: "Slab Identifier", tag: "Snap a slab → instant listing", paid: true, icon: <ScanLine className="w-5 h-5" /> },
  { key: "visualize", label: "Room Visualizer", tag: "See the stone in your space", paid: true, icon: <Wand2 className="w-5 h-5" /> },
  { key: "copy", label: "Copywriter", tag: "WhatsApp posts & offers", paid: false, icon: <MessageSquareText className="w-5 h-5" /> },
];

export default function AiStudio({
  vizMaterials,
  materials,
  billingReady,
}: {
  vizMaterials: VizMaterial[];
  materials: string[];
  billingReady: boolean;
}) {
  const [tool, setTool] = useState<ToolKey>(billingReady ? "identify" : "copy");
  const current = TOOLS.find((t) => t.key === tool);
  const blocked = !billingReady && !!current?.paid;

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
              className={`relative rounded-xl border p-3 text-left transition ${
                active
                  ? "border-gold/50 bg-gold/[0.08]"
                  : "border-graphite-600 bg-graphite-900/40 hover:border-graphite-500"
              }`}
            >
              {t.paid && !billingReady && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold tracking-wide rounded px-1 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PAID
                </span>
              )}
              <span className={active ? "text-gold" : "text-slate-300"}>{t.icon}</span>
              <p className={`mt-2 text-xs font-bold leading-tight ${active ? "text-gold" : "text-white"}`}>
                {t.label}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">{current?.tag}</p>

      {blocked ? (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4" /> Paid feature — billing not set up yet
          </p>
          <p className="mt-1.5 text-sm text-slate-400">
            {current?.label} runs on metered Google AI calls that cost money per use. To switch it
            on: enable billing on the Google AI account, then set{" "}
            <code className="text-slate-200">AI_BILLING_READY=true</code> in the deployment
            environment. Until then this tool won&apos;t run — so there are no surprise charges.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            The Copywriter is free and works today.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          {tool === "identify" && <SlabIdentifier />}
          {tool === "visualize" && <AiTryOn materials={vizMaterials} />}
          {tool === "copy" && <MarketingStudio materials={materials} />}
        </div>
      )}
    </div>
  );
}
