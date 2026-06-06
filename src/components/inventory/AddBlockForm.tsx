"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addBlock } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";

export default function AddBlockForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await addBlock({
      label: fd.get("label"),
      material: fd.get("material"),
      weightTonnes: fd.get("weightTonnes"),
      supplier: fd.get("supplier") ?? "",
      costRupees: fd.get("costRupees") || undefined,
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
        <Plus className="w-4 h-4" /> Add a stone block
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3"
    >
      <p className="font-bold text-white">New block</p>
      <Field name="label" label="Block name / number" placeholder="Black Galaxy #1" required />
      <Field name="material" label="Material" placeholder="Black Galaxy granite" required />
      <div className="grid grid-cols-2 gap-3">
        <Field name="weightTonnes" label="Weight (tonnes)" placeholder="18.4" type="number" step="0.01" required />
        <Field name="costRupees" label="Cost (₹, optional)" placeholder="120000" type="number" />
      </div>
      <Field name="supplier" label="Supplier (optional)" placeholder="Patel Stone" />
      {error && <ErrorPill>{error}</ErrorPill>}
      <div className="flex gap-2">
        <Button type="submit" variant="press" className="flex-1" disabled={loading}>
          {loading ? "Saving..." : "Save block"}
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
  type = "text",
  step,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        type={type}
        step={step}
        inputMode={type === "number" ? "decimal" : undefined}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
      {children}
    </div>
  );
}
