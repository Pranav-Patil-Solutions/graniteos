// StatusBadge — pill, 11px semibold, tinted bg at ~14% of its semantic colour.
// Variants per redesign spec §3.5.

export type BadgeVariant = "pending" | "paid" | "overdue" | "partial" | "info";

const MAP: Record<BadgeVariant, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-positive/[0.14] text-positive" },
  pending: { label: "Pending", cls: "bg-negative/[0.14] text-negative" },
  overdue: { label: "Overdue", cls: "bg-negative/[0.14] text-negative" },
  partial: { label: "Partial", cls: "bg-info/[0.14] text-info" },
  info: { label: "Info", cls: "bg-info/[0.14] text-info" },
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children?: React.ReactNode;
}) {
  const m = MAP[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${m.cls}`}
    >
      {children ?? m.label}
    </span>
  );
}
