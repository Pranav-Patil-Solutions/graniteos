/**
 * Procedural "polished stone" texture + the affine triangle-warp math used to
 * drape a stone onto a pre-masked surface in the free template-room visualizer.
 */

export type Pt = { x: number; y: number };

type Pal = { base: string; flecks: [string, number][] };

const PALETTES: Record<string, Pal> = {
  black: { base: "#0c0c0e", flecks: [["40,40,46", 0.78], ["201,162,75", 0.18], ["230,230,235", 0.04]] },
  white: { base: "#e7e6e1", flecks: [["120,120,130", 0.5], ["180,178,172", 0.5]] },
  grey: { base: "#2a2f37", flecks: [["255,255,255", 0.4], ["10,10,12", 0.6]] },
  brown: { base: "#2c2017", flecks: [["214,180,120", 0.5], ["20,12,6", 0.5]] },
  green: { base: "#0e2018", flecks: [["180,210,180", 0.4], ["220,235,220", 0.2], ["8,18,12", 0.4]] },
  red: { base: "#2a0f0f", flecks: [["240,220,210", 0.3], ["20,6,6", 0.7]] },
  default: { base: "#15151a", flecks: [["201,162,75", 0.5], ["230,230,235", 0.5]] },
};

export function paletteKey(material?: string, color?: string): string {
  const s = `${material ?? ""} ${color ?? ""}`.toLowerCase();
  if (/black|galaxy|absolute|jet/.test(s)) return "black";
  if (/white|carrara|statuario|makrana|albeta|morwad/.test(s)) return "white";
  if (/grey|gray|steel|kuppam|cloud|silver/.test(s)) return "grey";
  if (/brown|tan|coffee|paradiso|kashmir|gold/.test(s)) return "brown";
  if (/green|forest|fusion|rajnagar/.test(s)) return "green";
  if (/red|ruby|lakha|jhansi|maroon|pink/.test(s)) return "red";
  return "default";
}

/** Paint a procedural speckled polished stone onto a canvas 2D context. */
export function drawStoneTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  material?: string,
  color?: string,
): void {
  const pal = PALETTES[paletteKey(material, color)];
  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, w, h);
  const count = Math.round((w * h) / 28);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let acc = 0;
    let chosen = pal.flecks[0][0];
    for (const [c, wt] of pal.flecks) {
      acc += wt;
      if (r <= acc) {
        chosen = c;
        break;
      }
    }
    ctx.fillStyle = `rgba(${chosen},${Math.random() * 0.7})`;
    const s = Math.random() * 2.4 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, s, 0, 7);
    ctx.fill();
  }
}

/**
 * Affine transform [a,b,c,d,e,f] (canvas setTransform order) mapping source
 * triangle (s0,s1,s2) onto destination triangle (d0,d1,d2).
 * Apply: x' = a*x + c*y + e ; y' = b*x + d*y + f.
 */
export function triangleAffine(
  s0: Pt,
  s1: Pt,
  s2: Pt,
  d0: Pt,
  d1: Pt,
  d2: Pt,
): [number, number, number, number, number, number] | null {
  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (denom === 0) return null;

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const c = (s0.x * (d1.x - d2.x) + s1.x * (d2.x - d0.x) + s2.x * (d0.x - d1.x)) / denom;
  const e =
    (s0.x * (s1.y * d2.x - s2.y * d1.x) -
      s0.y * (s1.x * d2.x - s2.x * d1.x) +
      d0.x * (s1.x * s2.y - s2.x * s1.y)) /
    denom;

  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const d = (s0.x * (d1.y - d2.y) + s1.x * (d2.y - d0.y) + s2.x * (d0.y - d1.y)) / denom;
  const f =
    (s0.x * (s1.y * d2.y - s2.y * d1.y) -
      s0.y * (s1.x * d2.y - s2.x * d1.y) +
      d0.y * (s1.x * s2.y - s2.x * s1.y)) /
    denom;

  return [a, b, c, d, e, f];
}
