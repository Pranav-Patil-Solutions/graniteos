// Measurement-sheet totals over slab pieces. A slab already stores sqft
// (generated: round(length_in*width_in/144,2)); value = sqft × rate (paise/sqft).
// Pure + tested; the page reads slabs (RLS-scoped) and hands the pieces here.

export type SlabPiece = { sqft: number | string; rate_paise: number | string };

export function sheetTotals(pieces: SlabPiece[]) {
  let area = 0;
  let value_paise = 0;
  for (const p of pieces) {
    const sqft = Number(p.sqft) || 0;
    const rate = Number(p.rate_paise) || 0;
    area += sqft;
    value_paise += Math.round(sqft * rate);
  }
  return {
    count: pieces.length,
    area: Math.round(area * 100) / 100,
    value_paise,
  };
}
