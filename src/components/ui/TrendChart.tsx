"use client";

// TrendChart — area line, gold 2px stroke, gold→transparent fill, faint
// horizontal gridlines only, range chip top-right. Recharts. Spec §3.7.
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChevronDown } from "lucide-react";
import { formatINR } from "@/lib/money";

export type TrendPoint = { label: string; value: number }; // value in paise

export function TrendChart({
  title,
  data,
  ranges = ["6 Months"],
}: {
  title: string;
  data: TrendPoint[];
  ranges?: string[];
}) {
  const [range, setRange] = useState(ranges[0]);
  const [open, setOpen] = useState(false);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="rounded-2xl border border-line-dark bg-shell-elevated p-4 shadow-slab">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ondark">{title}</h3>
        {ranges.length > 1 ? (
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full border border-line-dark bg-white/[0.04] px-3 py-1 text-[12px] text-ondark-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {range} <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {open && (
              <div className="absolute right-0 mt-1 z-10 rounded-lg border border-line-dark bg-shell-elevated2 p-1">
                {ranges.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRange(r); setOpen(false); }}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-[12px] ${r === range ? "text-gold" : "text-ondark-muted hover:text-ondark"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-line-dark bg-white/[0.04] px-3 py-1 text-[12px] text-ondark-muted">
            {range} <ChevronDown className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="trend-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e4c97e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#c8a24b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#9aa1a9", fontSize: 11 }} />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ stroke: "rgba(200,162,75,0.4)" }}
              contentStyle={{ background: "#1c2127", border: "1px solid rgba(242,240,235,0.08)", borderRadius: 10, color: "#f2f0eb", fontSize: 12 }}
              formatter={(v) => [formatINR(Number(v) || 0), "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#c8a24b"
              strokeWidth={2}
              fill="url(#trend-gold)"
              isAnimationActive={!reduce}
              animationDuration={400}
              dot={false}
              activeDot={{ r: 4, fill: "#e4c97e", stroke: "#0b0e11" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
