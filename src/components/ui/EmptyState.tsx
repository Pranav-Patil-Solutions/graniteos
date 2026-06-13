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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-600 bg-white/[0.02] py-12 px-6 text-center">
      {icon && <div className="mb-3 text-slate-500">{icon}</div>}
      <p className="text-sm font-semibold text-slate-300">{heading}</p>
      {subtext && <p className="mt-1.5 text-xs text-slate-500 max-w-xs">{subtext}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-granite-green2 text-white px-4 py-2 text-sm font-semibold"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
