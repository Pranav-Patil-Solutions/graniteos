import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import JobControls from "@/components/fabrication/JobControls";
import { FAB_STAGES } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  job_no: string | null;
  title: string;
  material: string | null;
  qty_sqft: number;
  machine: string | null;
  stage: string;
  qc_status: string;
};

const STAGE_LABEL: Record<string, string> = {
  queued: "Queued",
  cutting: "Cutting",
  polishing: "Polishing",
  edging: "Edging",
  qc: "Quality Check",
  ready: "Ready",
  dispatched: "Dispatched",
};

const STAGE_ACCENT: Record<string, string> = {
  queued: "text-slate-300 border-slate-500/30",
  cutting: "text-amber-300 border-amber-500/30",
  polishing: "text-amber-300 border-amber-500/30",
  edging: "text-amber-300 border-amber-500/30",
  qc: "text-blue-300 border-blue-500/30",
  ready: "text-granite-green2 border-granite-green2/40",
  dispatched: "text-slate-400 border-graphite-600",
};

export default async function FactoryFloorPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_jobs")
    .select("id, job_no, title, material, qty_sqft, machine, stage, qc_status")
    .order("created_at", { ascending: true });
  const jobs = (data ?? []) as Job[];

  // Shop-floor view: only the work that's still on the floor, biggest first.
  const active = jobs.filter((j) => j.stage !== "dispatched");
  const counts = FAB_STAGES.map((s) => ({ stage: s, n: jobs.filter((j) => j.stage === s).length }));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Factory Floor</h1>
          <p className="text-sm text-slate-400">Big buttons for the shop — advance each job as it moves.</p>
        </div>
        <span className="text-right">
          <span className="block text-4xl font-black text-gold leading-none">{active.length}</span>
          <span className="text-[11px] text-slate-400">on floor</span>
        </span>
      </div>

      {/* stage tally */}
      <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {counts.map((c) => (
          <div key={c.stage} className={`rounded-xl border bg-white/[0.03] px-2 py-2 text-center ${STAGE_ACCENT[c.stage]}`}>
            <span className="block text-2xl font-extrabold leading-none">{c.n}</span>
            <span className="text-[10px] uppercase tracking-wide">{STAGE_LABEL[c.stage]}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {active.length === 0 && (
          <p className="text-center text-base text-slate-500 py-10">
            Nothing on the floor right now. New production jobs appear here.
          </p>
        )}
        {active.map((j) => (
          <div key={j.id} className="rounded-2xl border border-graphite-600 bg-white/[0.05] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-bold text-white leading-tight">
                  {j.job_no ? <span className="text-gold">{j.job_no} · </span> : null}
                  {j.title}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {[j.material, j.qty_sqft ? `${Number(j.qty_sqft)} sq-ft` : null, j.machine]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-bold uppercase tracking-wide rounded-full border px-3 py-1 ${STAGE_ACCENT[j.stage]}`}>
                {STAGE_LABEL[j.stage] ?? j.stage}
              </span>
            </div>
            <div className="mt-4">
              <JobControls jobId={j.id} stage={j.stage} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
