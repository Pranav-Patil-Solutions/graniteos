"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { uploadSlabPhoto } from "@/actions/photos";
import { StoneSwatch } from "./StoneSwatch";

/** Resize/compress in the browser so uploads are fast even from a phone camera. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82),
  );
}

export default function SlabPhoto({
  slabId,
  blockId,
  photo,
  material,
  color,
}: {
  slabId: string;
  blockId: string;
  photo: string | null;
  material: string;
  color: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await compress(file);
      const fd = new FormData();
      fd.append("photo", blob, "slab.jpg");
      const res = await uploadSlabPhoto(slabId, blockId, fd);
      if (res.error) setError(res.error);
      else router.refresh();
    } catch {
      setError("Could not process that image.");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="slab"
            className="w-full h-32 object-cover rounded-xl border border-white/10"
          />
        ) : (
          <StoneSwatch
            material={material}
            color={color}
            className="w-full h-32 rounded-xl border border-white/10"
          />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur px-2.5 py-1.5 text-xs font-semibold text-white border border-white/15 hover:border-gold/50"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
          {busy ? "Uploading..." : photo ? "Replace photo" : "Add photo"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-300 mt-1">{error}</p>}
    </div>
  );
}
