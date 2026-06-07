"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "@/actions/quotes";

const FLOW = ["confirmed", "in_production", "dispatched", "delivered"] as const;

export default function OrderStatus({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const idx = FLOW.indexOf(status as (typeof FLOW)[number]);

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
      {idx < FLOW.length - 1 && idx >= 0 && (
        <button
          disabled={pending}
          onClick={() => start(async () => { await setOrderStatus(orderId, FLOW[idx + 1]); router.refresh(); })}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gold/15 text-gold border border-gold/40 px-3 py-1.5 text-xs font-bold"
        >
          Mark {FLOW[idx + 1].replace("_", " ")} →
        </button>
      )}
    </div>
  );
}
