"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSlab } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";
import { sqFtFromInches } from "@/lib/money";
import { STONE_FINISHES, STONE_GRADES, SLAB_THICKNESSES_MM } from "@/lib/validation";

export default function AddSlabForm({ blockId }: { blockId: string }) {
  const router = useRouter();
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sqft =
    Number(length) > 0 && Number(width) > 0
      ? sqFtFromInches(Number(length), Number(width))
      : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await addSlab({
      blockId,
      bundleNo: fd.get("bundleNo") ?? "",
      slabNo: fd.get("slabNo") || undefined,
      lengthIn: fd.get("lengthIn"),
      widthIn: fd.get("widthIn"),
      netSqft: fd.get("netSqft") || undefined,
      thicknessMm: fd.get("thicknessMm") || undefined,
      finish: fd.get("finish") ?? "",
      grade: fd.get("grade") ?? "",
      godown: fd.get("godown") ?? "",
      rateRupees: fd.get("rateRupees") || undefined,
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    (e.target as HTMLFormElement).reset();
    setLength("");
    setWidth("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3"
    >
      <p className="font-bold text-white">Add a slab from this block</p>

      <div className="grid grid-cols-2 gap-3">
        <Field name="bundleNo" label="Bundle no. (opt.)" placeholder="B-7" />
        <Field name="slabNo" label="Slab no. (opt.)" placeholder="3" num />
      </div>

      <p className="text-xs font-semibold text-slate-400 pt-1">Gross size (inches)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field name="lengthIn" label="Length" placeholder="120" num value={length} onChange={setLength} />
        <Field name="widthIn" label="Height" placeholder="78" num value={width} onChange={setWidth} />
      </div>
      <div className="rounded-lg bg-gold/[0.06] border border-[#3a3320] px-3 py-2 text-sm text-gold">
        gross = <span className="font-bold">{sqft.toFixed(2)}</span> sq-ft
      </div>
      <Field name="netSqft" label="Net / usable sq-ft (opt.)" placeholder="63.5" num />

      <div className="grid grid-cols-3 gap-2">
        <Select name="thicknessMm" label="Thickness">
          <option value="">—</option>
          {SLAB_THICKNESSES_MM.map((t) => (
            <option key={t} value={t}>
              {t} mm
            </option>
          ))}
        </Select>
        <Select name="finish" label="Finish">
          <option value="">—</option>
          {STONE_FINISHES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Select name="grade" label="Grade">
          <option value="">—</option>
          {STONE_GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field name="godown" label="Godown / location (opt.)" placeholder="Godown A" />
        <Field name="rateRupees" label="Rate ₹/sq-ft (opt.)" placeholder="185" num />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <Button type="submit" variant="press" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Add slab"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  num,
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  num?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        type={num ? "number" : "text"}
        step="0.01"
        inputMode={num ? "decimal" : undefined}
        placeholder={placeholder}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}

function Select({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <select
        suppressHydrationWarning
        name={name}
        defaultValue=""
        className="mt-1 w-full text-base focus:border-gold outline-none"
      >
        {children}
      </select>
    </label>
  );
}
