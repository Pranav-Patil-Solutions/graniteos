// Reusable loading skeletons — a slow premium sheen (.shimmer) over token
// surfaces, so they re-theme with the rest of the app and respect reduced-motion.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg border border-graphite-600/60 ${className}`} />;
}

/** A vertical stack of list-row skeletons (inventory / quotes / parties …). */
export function SkeletonList({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

/** A row of KPI-card skeletons. */
export function SkeletonKpis({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-2xl" />
      ))}
    </div>
  );
}
