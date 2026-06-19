"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "@/actions/quotes";

const FLOW = ["confirmed", "in_production", "dispatched", "delivered"] as const;

export default function OrderStatus({
  orderId,
  status,
  viewOnly = false,
}: {
  orderId: string;
  status: string;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const idx = FLOW.indexOf(status as (typeof FLOW)[number]);

  function change(next: (typeof FLOW)[number] | "cancelled") {
    setErr("");
    start(async () => {
      const r = await setOrderStatus(orderId, next);
      if (r && "error" in r) {
        setErr(r.error ?? "Couldn't update the order status.");
        return;
      }
      router.refresh();
    });
  }

  // A cancelled order has no place on the progress stepper — show it plainly.
  if (status === "cancelled") {
    return (
      <span className="inline-block text-[11px] font-semibold rounded-md px-2 py-1 bg-red-500/15 text-red-300">
        Order cancelled
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FLOW.map((s, i) => (
          <div key={s} className="flex items-center">
            <span
              className={`text-[10px] font-semibold rounded-md px-2 py-0.5 whitespace-nowrap capitalize ${
                i < idx
                  ? "bg-granite-green2/15 text-granite-green2"
                  : i === idx
                    ? "bg-gold/20 text-gold"
                    : "bg-white/[0.04] text-slate-500"
              }`}
            >
              {s.replace("_", " ")}
            </span>
            {i < FLOW.length - 1 && <span className="text-slate-600 px-0.5">›</span>}
          </div>
        ))}
      </div>
      {!viewOnly && idx >= 0 && idx < FLOW.length - 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() => change(FLOW[idx + 1])}
            className="inline-flex items-center gap-1 rounded-lg bg-gold/15 text-gold border border-gold/40 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Mark {FLOW[idx + 1].replace("_", " ")} →
          </button>
          <button
            disabled={pending}
            onClick={() => change("cancelled")}
            className="rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-50"
          >
            Cancel order
          </button>
        </div>
      )}
      {err && <p className="mt-1.5 text-xs text-red-400">{err}</p>}
    </div>
  );
}
