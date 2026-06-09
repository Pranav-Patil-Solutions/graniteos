/**
 * A premium procedural "polished stone" swatch (pure CSS, no external images).
 * Colour is inferred from the material/colour text. Real slab photos can be
 * added later via the slab-catalog feature.
 */

type Key = "black" | "white" | "grey" | "brown" | "green" | "red" | "default";

function stoneKey(material: string, color?: string | null): Key {
  const s = `${material} ${color ?? ""}`.toLowerCase();
  if (/black|galaxy|absolute|jet/.test(s)) return "black";
  if (/white|carrara|statuario|makrana|albeta|morwad/.test(s)) return "white";
  if (/grey|gray|steel|kuppam|cloud|silver/.test(s)) return "grey";
  if (/brown|tan|coffee|paradiso|kashmir|gold/.test(s)) return "brown";
  if (/green|forest|fusion/.test(s)) return "green";
  if (/red|ruby|lakha|jhansi|maroon|pink/.test(s)) return "red";
  return "default";
}

// layered gradients: base stone + flecks + polished sheen
const PALETTES: Record<Key, string> = {
  black:
    "radial-gradient(circle at 25% 30%, rgba(201,162,75,.55) 0 1.2px, transparent 2px), radial-gradient(circle at 68% 62%, rgba(230,230,235,.5) 0 1.2px, transparent 2px), radial-gradient(circle at 82% 22%, rgba(201,162,75,.4) 0 1px, transparent 2px), linear-gradient(135deg,#1b1b22,#0b0b0e 65%)",
  white:
    "linear-gradient(115deg, transparent 0 44%, rgba(120,120,130,.45) 45% 46%, transparent 47%), linear-gradient(160deg, transparent 0 60%, rgba(120,120,130,.35) 61% 62%, transparent 63%), linear-gradient(135deg,#efeee9,#cdccc6)",
  grey:
    "radial-gradient(circle at 30% 35%, rgba(255,255,255,.25) 0 1px, transparent 2px), radial-gradient(circle at 70% 65%, rgba(0,0,0,.3) 0 1.4px, transparent 2px), linear-gradient(135deg,#5a626d,#272d36)",
  brown:
    "radial-gradient(circle at 35% 30%, rgba(214,180,120,.5) 0 1.2px, transparent 2px), radial-gradient(circle at 72% 60%, rgba(40,28,18,.5) 0 1.4px, transparent 2px), linear-gradient(135deg,#6b513a,#2c2017)",
  green:
    "radial-gradient(circle at 30% 40%, rgba(180,210,180,.35) 0 1.2px, transparent 2px), linear-gradient(115deg, transparent 0 55%, rgba(220,235,220,.25) 56% 57%, transparent 58%), linear-gradient(135deg,#1c4a3a,#0a1f17)",
  red:
    "radial-gradient(circle at 28% 32%, rgba(240,220,210,.3) 0 1.2px, transparent 2px), radial-gradient(circle at 70% 62%, rgba(20,6,6,.5) 0 1.4px, transparent 2px), linear-gradient(135deg,#6e2626,#2a0f0f)",
  default:
    "radial-gradient(circle at 30% 35%, rgba(201,162,75,.4) 0 1.2px, transparent 2px), linear-gradient(135deg,#3a3a42,#15151a)",
};

export function StoneSwatch({
  material,
  color,
  className = "",
}: {
  material: string;
  color?: string | null;
  className?: string;
}) {
  const bg = PALETTES[stoneKey(material, color)];
  // Only add `relative` when the caller hasn't already set a position — passing
  // e.g. `absolute inset-0` otherwise collides with `relative` and the swatch
  // collapses to zero height.
  const positioned = /(?:^|\s)(?:absolute|fixed|relative|sticky)(?:\s|$)/.test(className);
  return (
    <div
      aria-hidden
      className={`${positioned ? "" : "relative"} overflow-hidden ${className}`}
      style={{ background: bg, backgroundSize: "14px 14px, 14px 14px, 14px 14px, cover" }}
    >
      {/* polished sheen */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.10),transparent_45%)]" />
    </div>
  );
}
