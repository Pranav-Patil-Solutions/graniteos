"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { drawStoneTexture, triangleAffine, type Pt } from "@/lib/stone-texture";
import { ROOMS, type Room } from "./rooms";
import type { VizMaterial } from "./StoneVisualizer";

export default function RoomTryOn({ materials }: { materials: VizMaterial[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const texRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [roomIdx, setRoomIdx] = useState(0);
  const [matIdx, setMatIdx] = useState(0);

  const room = ROOMS[roomIdx];

  function texture(idx: number): HTMLCanvasElement {
    const c = texRef.current.get(idx);
    if (c) return c;
    const t = document.createElement("canvas");
    t.width = t.height = 512;
    drawStoneTexture(t.getContext("2d")!, 512, 512, materials[idx]?.material, materials[idx]?.color ?? undefined);
    texRef.current.set(idx, t);
    return t;
  }

  function render(r: Room, mIdx: number) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const q = r.mask.map((p) => ({ x: p.x * w, y: p.y * h })) as [Pt, Pt, Pt, Pt];
    const tex = texture(mIdx);
    const tw = tex.width;
    const th = tex.height;
    const drawTri = (s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) => {
      const m = triangleAffine(s0, s1, s2, d0, d1, d2);
      if (!m) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(d0.x, d0.y);
      ctx.lineTo(d1.x, d1.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(tex, 0, 0);
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    drawTri({ x: 0, y: 0 }, { x: tw, y: 0 }, { x: tw, y: th }, q[0], q[1], q[2]);
    drawTri({ x: 0, y: 0 }, { x: tw, y: th }, { x: 0, y: th }, q[0], q[2], q[3]);

    const clip = () => {
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[1].x, q[1].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.lineTo(q[3].x, q[3].y);
      ctx.closePath();
      ctx.clip();
    };
    ctx.save();
    clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = r.shadow;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
    ctx.save();
    clip();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  // load room image whenever the room changes
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cw = Math.min(canvas.parentElement?.clientWidth ?? 560, 560);
      canvas.width = cw;
      canvas.height = Math.round((cw * img.naturalHeight) / img.naturalWidth);
      render(room, matIdx);
    };
    img.src = room.src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdx]);

  // re-render on material change
  useEffect(() => {
    if (imgRef.current) render(room, matIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matIdx]);

  function download() {
    const a = document.createElement("a");
    a.href = canvasRef.current!.toDataURL("image/png");
    a.download = "graniteos-preview.png";
    a.click();
  }
  async function share() {
    const c = canvasRef.current!;
    try {
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
      if (blob) {
        const file = new File([blob], "graniteos-preview.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Stone preview" });
          return;
        }
      }
    } catch {
      /* fall through */
    }
    download();
  }

  return (
    <div>
      {/* room picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] text-slate-500 shrink-0">Room:</span>
        {ROOMS.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setRoomIdx(i)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border ${
              i === roomIdx ? "bg-gold/15 text-gold border-gold/40" : "border-graphite-600 text-slate-300 hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-graphite-600 bg-graphite-900">
        <canvas ref={canvasRef} className="block w-full" />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Showing <span className="text-slate-300">{materials[matIdx]?.label}</span> on the {room.surface}.
      </p>

      {/* stone picker */}
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-300 hover:text-white">
          <Download className="w-4 h-4" /> Download
        </button>
        <button onClick={share} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-[#0b0e11] hover:brightness-110">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>
    </div>
  );
}
