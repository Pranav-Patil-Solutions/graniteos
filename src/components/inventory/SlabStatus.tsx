"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setSlabStatus } from "@/actions/inventory";

const OPTIONS: { value: "in_stock" | "reserved" | "sold"; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

const STYLE: Record<string, string> = {
  in_stock: "bg-granite-green2/20 text-granite-green2 border-granite-green2/40",
  reserved: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  sold: "bg-slate-500/15 text-slate-300 border-slate-400/40",
};

export default function SlabStatus({
  slabId,
  blockId,
  status,
}: {
  slabId: string;
  blockId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  return (
    <div>
      <div className="flex gap-1">
        {OPTIONS.map((o) => {
          const active = o.value === status;
          return (
            <button
              key={o.value}
              disabled={pending}
              onClick={() => {
                setErr("");
                start(async () => {
                  const r = await setSlabStatus(slabId, o.value, blockId);
                  if (r && "error" in r) {
                    setErr(r.error ?? "Couldn't update the slab status.");
                    return;
                  }
                  router.refresh();
                });
              }}
              className={`text-[11px] font-semibold rounded-lg border px-2 py-1 transition-colors ${
                active ? STYLE[o.value] : "border-graphite-600 text-slate-500 hover:text-slate-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {err && <p className="mt-1 text-[11px] text-red-400">{err}</p>}
    </div>
  );
}
