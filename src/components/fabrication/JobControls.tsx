"use client";

import { useState, useTransition } from "react";
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

export default function JobControls({
  jobId,
  stage,
  viewOnly = false,
}: {
  jobId: string;
  stage: string;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const idx = FAB_STAGES.indexOf(stage as (typeof FAB_STAGES)[number]);

  function run(fn: () => Promise<{ error?: string } | { ok: true }>) {
    setErr("");
    start(async () => {
      const r = await fn();
      if (r && "error" in r) {
        setErr(r.error ?? "Couldn't update the job.");
        return;
      }
      router.refresh();
    });
  }

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
            {i < FAB_STAGES.length - 1 && <span className="text-slate-600 text-[10px] px-0.5">›</span>}
          </div>
        ))}
      </div>

      {/* actions */}
      {!viewOnly && (
        <div className="mt-2 flex gap-2">
          {stage === "qc" ? (
            <>
              <button
                disabled={pending}
                onClick={() => run(() => setQC(jobId, "passed"))}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-granite-green2/20 text-granite-green2 border border-granite-green2/40 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> QC Pass
              </button>
              <button
                disabled={pending}
                onClick={() => run(() => setQC(jobId, "failed"))}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> QC Fail
              </button>
            </>
          ) : stage === "dispatched" ? (
            <span className="text-xs text-granite-green2 font-semibold">✅ Dispatched</span>
          ) : (
            <button
              disabled={pending}
              onClick={() => run(() => advanceStage(jobId, stage))}
              className="inline-flex items-center gap-1 rounded-lg bg-gold/15 text-gold border border-gold/40 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              Advance to {SHORT[FAB_STAGES[Math.min(idx + 1, FAB_STAGES.length - 1)]]}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {err && <p className="mt-1.5 text-xs text-red-400">{err}</p>}
    </div>
  );
}
