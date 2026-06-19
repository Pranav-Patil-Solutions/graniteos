import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import AddJobForm from "@/components/fabrication/AddJobForm";
import JobControls from "@/components/fabrication/JobControls";

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

export default async function FabricationPage() {
  const { viewOnly } = await requireModuleAccess("fabrication");
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_jobs")
    .select("id, job_no, title, material, qty_sqft, machine, stage, qc_status")
    .order("created_at", { ascending: false });
  const jobs = (data ?? []) as Job[];

  const active = jobs.filter((j) => j.stage !== "dispatched");
  const wip = jobs.filter((j) => !["queued", "ready", "dispatched"].includes(j.stage)).length;
  const ready = jobs.filter((j) => j.stage === "ready").length;

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Fabrication</h1>
      <p className="text-sm text-slate-400">Cut → polish → edge → QC → ready</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-white">{active.length}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">active</div>
        </Card>
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-gold">{wip}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">in progress</div>
        </Card>
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-granite-green2">{ready}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">ready</div>
        </Card>
      </div>

      {!viewOnly && (
        <div className="mt-5">
          <AddJobForm />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {jobs.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-6">
            No jobs yet — create your first production job above.
          </p>
        )}
        {jobs.map((j) => (
          <div key={j.id} className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">
                  {j.job_no ? `${j.job_no} · ` : ""}
                  {j.title}
                </p>
                <p className="text-xs text-slate-400">
                  {j.material ?? ""}
                  {j.qty_sqft ? ` · ${Number(j.qty_sqft)} sq-ft` : ""}
                  {j.machine ? ` · ${j.machine}` : ""}
                </p>
              </div>
              {j.qc_status !== "pending" && (
                <span
                  className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
                    j.qc_status === "passed"
                      ? "bg-granite-green2/20 text-granite-green2"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  QC {j.qc_status}
                </span>
              )}
            </div>
            <div className="mt-2.5">
              <JobControls jobId={j.id} stage={j.stage} viewOnly={viewOnly} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
