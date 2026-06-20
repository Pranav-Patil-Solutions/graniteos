import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  /** What this screen is for — a single short sentence. */
  heading: string;
  /** Optional second line with more context. */
  subtext?: string;
  /** Label for the primary action button. */
  actionLabel?: string;
  /** Where the action button links to. */
  actionHref?: string;
  /** Icon or illustration node (optional). */
  icon?: ReactNode;
}

/**
 * Reusable zero-state card shown when a list screen has no rows yet.
 * Tells users what the screen is for and gives them a path to fill it.
 */
export function EmptyState({
  heading,
  subtext,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-500/70 bg-white/[0.02] py-14 px-6 text-center">
      {icon && (
        <div className="mb-4 grid place-items-center w-16 h-16 rounded-2xl border border-graphite-600 bg-white/[0.03] text-gold/70">
          {icon}
        </div>
      )}
      <p className="font-display text-lg font-semibold text-white tracking-tight">{heading}</p>
      {subtext && <p className="mt-1.5 text-sm text-slate-400 max-w-sm leading-relaxed">{subtext}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold text-graphite-900 px-4 py-2.5 text-sm font-bold hover:brightness-110 transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
