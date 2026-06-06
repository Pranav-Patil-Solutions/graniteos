import { Card } from "./Card";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  prefix = "₹",
  hint,
  gold,
}: {
  label: string;
  value: number;
  prefix?: string;
  hint?: string;
  gold?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs text-slate-400">{label}</div>
      <AnimatedNumber
        value={value}
        prefix={prefix}
        className={`block text-3xl font-extrabold mt-0.5 ${gold ? "text-gold" : "text-white"}`}
      />
      {hint && <div className="mt-2 text-xs text-granite-green2">{hint}</div>}
    </Card>
  );
}
