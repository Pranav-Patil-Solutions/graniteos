// StickyTotalBar — frosted bar pinned above the bottom nav in builder screens.
// Left: live total label. Right: gold primary button. Spec §3.9.
import { PrimaryButton } from "./StoneButton";

export function StickyTotalBar({
  label = "Total",
  value,
  actionLabel,
  onAction,
  disabled,
}: {
  label?: string;
  value: string;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 bg-[#0b0e11]/75 backdrop-blur-md border-t border-line-dark"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-ondark-muted leading-none">{label}</p>
          <p className="font-display text-[22px] leading-7 font-semibold text-ondark tnum">{value}</p>
        </div>
        <PrimaryButton onClick={onAction} disabled={disabled} className="px-6">
          {actionLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
