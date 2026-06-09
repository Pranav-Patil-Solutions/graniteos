// StatTile — dark elevated card; icon top-left (gold stroke), caption label,
// title value. For 2-column grids. Redesign spec §3.2.
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-line-dark bg-shell-elevated p-4 shadow-slab">
      <Icon className="w-5 h-5 text-gold" strokeWidth={1.75} />
      <p className="mt-3 text-[12px] leading-4 font-medium text-ondark-muted">{label}</p>
      <p className={`mt-1 font-display text-[22px] leading-7 font-semibold tnum ${accent ? "text-gold" : "text-ondark"}`}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-ondark-muted tnum">{sub}</p>}
    </div>
  );
}
