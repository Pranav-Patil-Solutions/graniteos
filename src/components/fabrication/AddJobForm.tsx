"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createJob } from "@/actions/fabrication";
import { Button } from "@/components/ui/Button";
import { FAB_MACHINES } from "@/lib/validation";

export default function AddJobForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createJob({
      title: fd.get("title"),
      material: fd.get("material") ?? "",
      qtySqft: fd.get("qtySqft") || undefined,
      machine: fd.get("machine") ?? "",
      notes: fd.get("notes") ?? "",
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-graphite-500 text-slate-300 py-3.5 hover:border-gold hover:text-gold transition-colors"
      >
        <Plus className="w-4 h-4" /> New production job
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3"
    >
      <p className="font-bold text-white">New job</p>
      <Field name="title" label="Job title" placeholder="Verma kitchen — 6 slabs polish + edge" required />
      <div className="grid grid-cols-2 gap-3">
        <Field name="material" label="Material" placeholder="Black Galaxy" />
        <Field name="qtySqft" label="Qty (sq-ft)" placeholder="390" num />
      </div>
      <label className="block">
        <span className="text-xs font-medium text-slate-300">Machine</span>
        <select
          suppressHydrationWarning
          name="machine"
          defaultValue=""
          className="mt-1 w-full text-base focus:border-gold outline-none"
        >
          <option value="">—</option>
          {FAB_MACHINES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="press" className="flex-1" disabled={loading}>
          {loading ? "Saving..." : "Create job"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  num,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  num?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        type={num ? "number" : "text"}
        inputMode={num ? "decimal" : undefined}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}
