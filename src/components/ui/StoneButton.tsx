// PrimaryButton (gold fill, dark text) + GhostButton (1px gold border, gold text).
// Redesign spec §3.13. 12px radius, ≥44px touch target, gold focus ring.
import Link from "next/link";

type Common = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-[44px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50";

function Shell({ variant, href, onClick, type = "button", disabled, className = "", children }: Common & { variant: string }) {
  const cls = `${base} ${variant} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function PrimaryButton(props: Common) {
  return <Shell {...props} variant="bg-gold text-[#14181c] hover:brightness-110" />;
}

export function GhostButton(props: Common) {
  return <Shell {...props} variant="border border-gold/70 text-gold hover:bg-gold/10 bg-transparent" />;
}
