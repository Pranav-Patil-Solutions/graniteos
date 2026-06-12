"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadBlockPhoto } from "@/actions/inventory";

/** "Add photo" on a block — opens the camera on mobile, file picker on
 *  desktop, uploads, and refreshes. Also used to replace an existing photo. */
export default function BlockPhotoButton({
  blockId,
  hasPhoto,
}: {
  blockId: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const res = await uploadBlockPhoto({
      blockId,
      imageBase64: btoa(bin),
      mimeType: file.type,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-black/45 backdrop-blur border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-slab disabled:opacity-60"
      >
        <Camera className="w-3.5 h-3.5" />
        {busy ? "Uploading…" : hasPhoto ? "Change photo" : "Add photo"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
    </>
  );
}
