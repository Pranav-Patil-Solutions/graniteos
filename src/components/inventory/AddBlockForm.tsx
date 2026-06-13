"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Camera, X } from "lucide-react";
import { addBlock, uploadBlockPhoto } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export default function AddBlockForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");

  const cbm =
    Number(l) > 0 && Number(w) > 0 && Number(h) > 0
      ? (Number(l) * Number(w) * Number(h)) / 1_000_000
      : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await addBlock({
      label: fd.get("label"),
      material: fd.get("material"),
      color: fd.get("color") ?? "",
      lengthCm: fd.get("lengthCm") || undefined,
      widthCm: fd.get("widthCm") || undefined,
      heightCm: fd.get("heightCm") || undefined,
      weightTonnes: fd.get("weightTonnes") || undefined,
      origin: fd.get("origin") ?? "",
      supplier: fd.get("supplier") ?? "",
      costRupees: fd.get("costRupees") || undefined,
    });
    if ("error" in res) {
      setLoading(false);
      return setError(res.error ?? '');
    }
    // Block saved — attach the photo if one was chosen. A photo failure
    // shouldn't lose the block: surface it but keep the saved record.
    if (photo && res.id) {
      const up = await uploadBlockPhoto({
        blockId: res.id,
        imageBase64: await fileToBase64(photo),
        mimeType: photo.type,
      });
      if ("error" in up) {
        setLoading(false);
        return setError(`Block saved, but the photo failed: ${up.error}`);
      }
    }
    setLoading(false);
    (e.target as HTMLFormElement).reset();
    setL("");
    setW("");
    setH("");
    setPhoto(null);
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
      <Field name="label" label="Block no. / name" placeholder="BL-118 / Black Galaxy #1" required />
      <div className="grid grid-cols-2 gap-3">
        <Field name="material" label="Material" placeholder="Black Galaxy" required />
        <Field name="color" label="Colour (opt.)" placeholder="Black w/ gold" />
      </div>

      <p className="text-xs font-semibold text-slate-400 pt-1">Block size (cm) → CBM</p>
      <div className="grid grid-cols-3 gap-2">
        <Field name="lengthCm" label="Length" placeholder="280" num value={l} onChange={setL} />
        <Field name="widthCm" label="Width" placeholder="180" num value={w} onChange={setW} />
        <Field name="heightCm" label="Height" placeholder="160" num value={h} onChange={setH} />
      </div>
      <div className="rounded-lg bg-gold/[0.06] border border-[#3a3320] px-3 py-2 text-sm text-gold">
        = <span className="font-bold">{cbm.toFixed(3)}</span> CBM (cubic metres)
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field name="weightTonnes" label="Weight t (opt.)" placeholder="18.4" num />
        <Field name="costRupees" label="Cost ₹ (opt.)" placeholder="120000" num />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="supplier" label="Supplier (opt.)" placeholder="Patel Stone" />
        <Field name="origin" label="Quarry / origin (opt.)" placeholder="Chamarajanagar" />
      </div>

      {/* real block photo — camera on mobile, file picker on desktop */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {photo ? (
        <div className="flex items-center gap-3 rounded-lg border border-graphite-600 bg-white/[0.04] px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(photo)} alt="block" className="w-12 h-12 rounded-md object-cover" />
          <span className="flex-1 text-xs text-slate-300 truncate">{photo.name}</span>
          <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="min-h-0 text-slate-500 hover:text-rose-300 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-graphite-500 text-slate-400 py-2.5 text-sm hover:border-gold hover:text-gold transition-colors"
        >
          <Camera className="w-4 h-4" /> Add a photo of this block (optional)
        </button>
      )}

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
  required,
  num,
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
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
        required={required}
        placeholder={placeholder}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
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
