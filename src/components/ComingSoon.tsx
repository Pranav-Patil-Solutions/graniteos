export default function ComingSoon({ title, slice }: { title: string; slice: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-graphite-500 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl">🛠️</div>
        <p className="mt-3 font-medium text-slate-200">Coming soon</p>
        <p className="mt-1 text-sm text-slate-400">This module ships in {slice}.</p>
      </div>
    </div>
  );
}
