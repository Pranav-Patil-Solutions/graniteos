# GraniteOS — "See it in your space" Stone Visualizer (Design Spec)

**Date:** 2026-06-08
**Status:** Approved — build
**Author:** Pranav + Claude

## Goal
Let a customer upload a photo of their room and preview the selected granite/marble
applied to a surface (countertop / floor / wall). Customer-facing, on the public
catalogue + slab passport. No login.

## Decisions (locked)
- **Engine:** no-AI, pure browser 2D `<canvas>` overlay. No API key, no per-image cost,
  nothing stored server-side. Works even where WebGL is blocked (unlike the 3D viewer).
- **Placement:** public slab passport `/s/[id]` ("See *material* in your space") and the
  public catalogue `/catalog/[id]` ("Try in your space").
- Upgrade path: same button/UX can later call Gemini image-edit for photoreal, without
  changing the customer flow. Out of scope now.

## Flow
1. Upload or snap a photo (`<input type=file accept=image capture=environment>`).
2. Tap the **4 corners** of the target surface (TL → TR → BR → BL). Undo / reset available.
3. Render: warp the stone texture into the quad (perspective via 2-triangle affine map on
   2D canvas), then **multiply the original photo's luminance back over the quad** so the
   surface's own shadows/highlights show through (reads as set-in, not pasted).
4. Switch stone live (when >1 material supplied) — re-warps with corners kept.
5. **Download** PNG; **Share** via Web Share API (file) with WhatsApp fallback to text.

## Components
- `src/components/catalog/StoneVisualizer.tsx` (client): trigger button + modal holding the
  whole tool (upload → mark → result + material chips + download/share). Self-contained.
  Props: `materials: {label,material,color,photo_path}[]`, `triggerLabel`, `triggerClassName?`.
- `src/lib/stone-texture.ts`: `drawStoneTexture(ctx,w,h,material,color)` + palette — procedural
  speckle texture (shared logic with the 3D viewer's surface). Used when a slab has no photo.
- Integration:
  - `/s/[id]`: pass the single slab's `{material,color,photo_path}` → button "See it in your space".
  - `CatalogView`: pass all in-stock materials (distinct) → button "Try in your space" with switcher.

## Texture source
Prefer the slab's real `photo_path` as the texture when present; else the procedural stone
texture so every material works (demo slabs have no photos → procedural).

## Realism technique
- Quad split into triangles (TL,TR,BR) + (TL,BR,BL); per-triangle `ctx.transform` affine map
  from texture pixel space; `ctx.clip()` to each triangle.
- Shadow/highlight pass: `globalCompositeOperation='multiply'`, alpha ~0.55, draw original
  photo clipped to the quad polygon.

## Out of scope (YAGNI)
Auto surface detection, multi-surface in one render, server-side saving, AI photoreal.

## Testing
- Unit: affine-matrix helper (maps source tri → dest tri exactly) in `stone-texture` or inline.
- Manual: upload a kitchen photo on localhost, mark a countertop, switch materials, download.
