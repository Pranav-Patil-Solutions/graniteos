"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { advanceStage, setQC } from "@/actions/fabrication";
import { FAB_STAGES } from "@/lib/validation";

const SHORT: Record<string, string> = {
  queued: "Queue",
  cutting: "Cut",
  polishing: "Polish",
  edging: "Edge",
  qc: "QC",
  ready: "Ready",
  dispatched: "Sent",
};

export default function JobControls({ jobId, stage }: { jobId: string; stage: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const idx = FAB_STAGES.indexOf(stage as (typeof FAB_STAGES)[number]);

  return (
    <div>
      {/* stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FAB_STAGES.map((s, i) => (
          <div key={s} className="flex items-center">
            <span
              className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 whitespace-nowrap ${
                i < idx
                  ? "bg-granite-green2/15 text-granite-green2"
                  : i === idx
                    ? "bg-gold/20 text-gold"
                    : "bg-white/[0.04] text-slate-500"
              }`}
            >
              {SHORT[s]}
            </span>
            {i < FAB_STAGES.length - 1 && <span className="text-slate-600 text-[9px] px-0.5">›</span>}
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="mt-2 flex gap-2">
        {stage === "qc" ? (
          <>
            <button
              disabled={pending}
              onClick={() => start(async () => { await setQC(jobId, "passed"); router.refresh(); })}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-granite-green2/20 text-granite-green2 border border-granite-green2/40 py-1.5 text-xs font-bold"
            >
              <Check className="w-3.5 h-3.5" /> QC Pass
            </button>
            <button
              disabled={pending}
              onClick={() => start(async () => { await setQC(jobId, "failed"); router.refresh(); })}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 py-1.5 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" /> QC Fail
            </button>
          </>
        ) : stage === "dispatched" ? (
          <span className="text-xs text-granite-green2 font-semibold">✅ Dispatched</span>
        ) : (
          <button
            disabled={pending}
            onClick={() => start(async () => { await advanceStage(jobId, stage); router.refresh(); })}
            className="inline-flex items-center gap-1 rounded-lg bg-gold/15 text-gold border border-gold/40 px-3 py-1.5 text-xs font-bold"
          >
            Advance to {SHORT[FAB_STAGES[Math.min(idx + 1, FAB_STAGES.length - 1)]]}{" "}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
