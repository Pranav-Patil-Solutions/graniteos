"use client";

import { useState } from "react";
import { Upload, ScanLine, Copy, Check, RefreshCw } from "lucide-react";
import { identifySlab, type SlabIdentity } from "@/actions/identify-slab";

function compress(file: File): Promise<{ dataUrl: string; base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, base64: dataUrl.split(",")[1], mime: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function listingText(s: SlabIdentity): string {
  const lines = [
    `${s.name}${s.type ? ` (${s.type})` : ""}`,
    "",
    s.description,
  ];
  if (s.uses.length) lines.push("", `Best for: ${s.uses.join(", ")}`);
  if (s.colours.length) lines.push(`Tones: ${s.colours.join(", ")}`);
  return lines.filter((l) => l !== undefined).join("\n");
}

export default function SlabIdentifier() {
  const [photo, setPhoto] = useState<{ dataUrl: string; base64: string; mime: string } | null>(null);
  const [slab, setSlab] = useState<SlabIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSlab(null);
    const p = await compress(file);
    setPhoto(p);
    void run(p);
  }

  async function run(p = photo) {
    if (!p) return;
    setLoading(true);
    setError("");
    const res = await identifySlab({ imageBase64: p.base64, mimeType: p.mime });
    setLoading(false);
    if ("error" in res) return setError(res.error ?? '');
    setSlab(res.slab);
  }

  async function copy() {
    if (!slab) return;
    await navigator.clipboard.writeText(listingText(slab));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!photo) {
    return (
      <label className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-graphite-500 py-12 text-slate-300 cursor-pointer hover:border-gold hover:text-gold">
        <ScanLine className="w-7 h-7" />
        <span className="font-semibold">Snap or upload a slab photo</span>
        <span className="text-xs text-slate-500">We&apos;ll name the stone &amp; draft a listing</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </label>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-graphite-600 bg-graphite-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.dataUrl} alt="slab" className="block w-full max-h-[42vh] object-contain" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-gold">
              <RefreshCw className="w-7 h-7 animate-spin" />
              <span className="text-sm font-semibold">Reading the stone…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}

      {slab && !loading && (
        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/[0.06] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-gold">{slab.name}</p>
              <p className="text-xs text-slate-400">{slab.type}</p>
            </div>
            <button
              onClick={copy}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy listing"}
            </button>
          </div>
          {slab.description && <p className="mt-2 text-sm text-slate-200 leading-relaxed">{slab.description}</p>}
          {slab.uses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {slab.uses.map((u) => (
                <span key={u} className="rounded-full border border-graphite-600 px-2.5 py-0.5 text-[11px] text-slate-300">
                  {u}
                </span>
              ))}
            </div>
          )}
          {slab.colours.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">Tones: {slab.colours.join(" · ")}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => run()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#0b0e11] hover:brightness-110 disabled:opacity-50"
        >
          <ScanLine className="w-4 h-4" />
          {loading ? "Reading…" : slab ? "Re-scan" : "Identify"}
        </button>
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-300 hover:text-white cursor-pointer">
          <Upload className="w-4 h-4" /> New photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
