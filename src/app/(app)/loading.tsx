// Shown instantly on every (app) navigation while the server component fetches —
// so tapping a section feels immediate instead of freezing on the old screen. The
// AppShell (sidebar / ☰ / bottom nav) stays mounted; only this content area swaps.
import { Skeleton, SkeletonKpis, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 pt-12 pb-8">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="mt-2.5 h-4 w-32 rounded" />

      <SkeletonKpis className="mt-6" />
      <Skeleton className="mt-4 h-24 rounded-2xl" />
      <SkeletonList className="mt-4" rows={5} />
    </div>
  );
}
