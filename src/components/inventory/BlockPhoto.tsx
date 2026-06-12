/**
 * A block's visual: its REAL photo when one has been uploaded, otherwise an
 * honest neutral chip (material initials) — never a fake "stone" texture.
 * Server-safe (no hooks).
 */

function initials(material: string): string {
  return material
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function BlockPhoto({
  photoPath,
  material,
  className = "",
}: {
  photoPath?: string | null;
  material: string;
  className?: string;
}) {
  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoPath} alt={material} className={`object-cover ${className}`} />
    );
  }
  return (
    <div
      aria-hidden
      className={`grid place-items-center bg-white/[0.06] border border-graphite-600 ${className}`}
    >
      <span className="text-sm font-bold text-slate-400 tracking-wide">{initials(material)}</span>
    </div>
  );
}
