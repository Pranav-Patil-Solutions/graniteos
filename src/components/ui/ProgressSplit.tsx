// ProgressSplit — one bar: collected (positive green) from left, remainder
// (receivable) in negative @30%. Two end labels. Redesign spec §3.6.
import { formatINR } from "@/lib/money";

export function ProgressSplit({
  collectedPaise,
  receivablePaise,
}: {
  collectedPaise: number;
  receivablePaise: number;
}) {
  const total = Math.max(1, collectedPaise + receivablePaise);
  const pct = Math.round((collectedPaise / total) * 100);
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-negative/30">
        <div className="h-full bg-positive" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tnum">
        <span className="text-positive font-semibold">{formatINR(collectedPaise)} collected</span>
        <span className="text-negative font-semibold">{formatINR(receivablePaise)} due</span>
      </div>
    </div>
  );
}
