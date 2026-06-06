export default function ComingSoon({
  title,
  slice,
}: {
  title: string;
  slice: string;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-4xl">🛠️</div>
        <p className="mt-3 font-medium text-slate-700">Coming soon</p>
        <p className="mt-1 text-sm text-slate-500">
          This module ships in {slice}.
        </p>
      </div>
    </div>
  );
}
