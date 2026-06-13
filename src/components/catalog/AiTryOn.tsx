"use client";

import { useState } from "react";
import { Upload, Download, Share2, Wand2, RefreshCw } from "lucide-react";
import { visualizeStone } from "@/actions/visualize";
import type { VizMaterial } from "./StoneVisualizer";

const SURFACES = ["countertop", "floor", "wall", "backsplash", "staircase"] as const;

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

export default function AiTryOn({ materials }: { materials: VizMaterial[] }) {
  const [original, setOriginal] = useState<{ dataUrl: string; base64: string; mime: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [matIdx, setMatIdx] = useState(0);
  const [surface, setSurface] = useState<string>("countertop");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setOriginal(await compress(file));
  }

  async function generate(idx = matIdx) {
    if (!original) return;
    setLoading(true);
    setError("");
    const res = await visualizeStone({
      imageBase64: original.base64,
      mimeType: original.mime,
      material: materials[idx]?.material ?? "granite",
      surface,
    });
    setLoading(false);
    if ("error" in res) return setError(res.error ?? '');
    setResult(res.image);
    setCompare(false);
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "graniteos-preview.png";
    a.click();
  }
  async function share() {
    if (!result) return;
    try {
      const blob = await (await fetch(result)).blob();
      const file = new File([blob], "graniteos-preview.png", { type: blob.type });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Stone preview" });
        return;
      }
    } catch {
      /* fall through */
    }
    download();
  }

  const shown = result && !compare ? result : original?.dataUrl;

  if (!original) {
    return (
      <label className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-graphite-500 py-12 text-slate-300 cursor-pointer hover:border-gold hover:text-gold">
        <Upload className="w-7 h-7" />
        <span className="font-semibold">Upload or take a photo of your room</span>
        <span className="text-xs text-slate-500">Your real kitchen, floor, wall…</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </label>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-graphite-600 bg-graphite-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown!} alt="preview" className="block w-full max-h-[50vh] object-contain" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-gold">
              <RefreshCw className="w-7 h-7 animate-spin" />
              <span className="text-sm font-semibold">Rendering your space…</span>
            </div>
          </div>
        )}
        {result && !loading && (
          <button
            onMouseDown={() => setCompare(true)}
            onMouseUp={() => setCompare(false)}
            onMouseLeave={() => setCompare(false)}
            onTouchStart={() => setCompare(true)}
            onTouchEnd={() => setCompare(false)}
            className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"
          >
            {compare ? "original" : "hold to compare"}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] text-slate-500 shrink-0">Surface:</span>
        {SURFACES.map((s) => (
          <button
            key={s}
            onClick={() => setSurface(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border capitalize ${
              surface === s ? "bg-gold/15 text-gold border-gold/40" : "border-graphite-600 text-slate-300 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {materials.length > 1 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] text-slate-500 shrink-0">Stone:</span>
          {materials.map((m, i) => (
            <button
              key={m.label + i}
              onClick={() => setMatIdx(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border ${
                i === matIdx ? "bg-gold/15 text-gold border-gold/40" : "border-graphite-600 text-slate-300 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => generate()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#0b0e11] hover:brightness-110 disabled:opacity-50"
        >
          <Wand2 className="w-4 h-4" />
          {loading ? "Rendering…" : result ? "Re-render" : `Show ${materials[matIdx]?.label ?? "stone"}`}
        </button>
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-300 hover:text-white cursor-pointer">
          <Upload className="w-4 h-4" /> New photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
        {result && !loading && (
          <>
            <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-300 hover:text-white">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-300 hover:text-white">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </>
        )}
      </div>
    </div>
  );
}
