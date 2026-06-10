// Shown instantly on every (app) navigation while the server component fetches —
// so tapping a tab feels immediate instead of freezing on the old screen. The
// AppShell (top ☰ + bottom nav) stays mounted; only this content area swaps.
export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8 animate-pulse">
      <div className="h-8 w-44 rounded-lg bg-white/[0.07]" />
      <div className="mt-2 h-4 w-28 rounded bg-white/[0.04]" />

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] rounded-2xl bg-white/[0.05] border border-graphite-600" />
        ))}
      </div>

      <div className="mt-4 h-24 rounded-2xl bg-white/[0.04] border border-graphite-600" />

      <div className="mt-4 space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/[0.04] border border-graphite-600" />
        ))}
      </div>
    </div>
  );
}
