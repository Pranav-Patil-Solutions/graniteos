"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSlab } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";
import { sqFtFromInches } from "@/lib/money";

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
      lengthIn: fd.get("lengthIn"),
      widthIn: fd.get("widthIn"),
      thicknessMm: fd.get("thicknessMm") || undefined,
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
        <Field
          name="lengthIn"
          label="Length (inches)"
          placeholder="120"
          value={length}
          onChange={setLength}
        />
        <Field
          name="widthIn"
          label="Width (inches)"
          placeholder="78"
          value={width}
          onChange={setWidth}
        />
      </div>
      <div className="rounded-lg bg-gold/[0.06] border border-[#3a3320] px-3 py-2 text-sm text-gold">
        = <span className="font-bold">{sqft.toFixed(2)}</span> sq-ft
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="thicknessMm" label="Thickness (mm, opt.)" placeholder="18" />
        <Field name="rateRupees" label="Rate ₹/sq-ft (opt.)" placeholder="185" />
      </div>
      <Field name="godown" label="Godown / location (opt.)" placeholder="Godown A" plain />
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
  value,
  onChange,
  plain,
}: {
  name: string;
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  plain?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        type={plain ? "text" : "number"}
        step="0.01"
        inputMode={plain ? undefined : "decimal"}
        placeholder={placeholder}
        {...(onChange
          ? { value, onChange: (e) => onChange(e.target.value) }
          : {})}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}
