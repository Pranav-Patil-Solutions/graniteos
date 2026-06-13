/**
 * generate-icons.mjs
 * Creates public/icon-192.png, public/icon-512.png, and public/favicon.ico
 * for the GraniteOS PWA and Windows installer.
 * Uses pngjs (already in node_modules) — no extra dependencies.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

// Brand colors from src/app/globals.css
const BG   = [11,  14,  17,  255]; // --bg-base: #0b0e11
const GOLD = [200, 162, 75,  255]; // --c-gold: 200 162 75 (#c8a24b)

/**
 * "G" letter defined as rectangles in 0..1 normalised coords
 * within the letter bounding box.  Each entry is [x1, y1, x2, y2].
 *
 * Design: thick sans-serif G.
 *   – Top horizontal bar (leaves right edge open — that is the G "opening")
 *   – Left vertical bar (full height)
 *   – Bottom horizontal bar (full width)
 *   – Right vertical bar (lower half only)
 *   – Middle crossbar (from 48% to right edge, aligned to G mid-point)
 */
const SW = 0.20; // stroke width as fraction of letter box size
const G_RECTS = [
  // Top bar — from left to 0.80, leaving right open
  [SW,        0.00, 0.80,       SW       ],
  // Left bar — full height
  [0.00,      0.00, SW,         1.00     ],
  // Bottom bar — full width
  [SW,        1.00 - SW, 1.00,  1.00     ],
  // Right bar — lower half (from mid-point down)
  [1.00 - SW, 0.50, 1.00,       1.00     ],
  // Middle crossbar
  [0.48,      0.50, 1.00,       0.50 + SW],
];

/** Build pixel data for a GraniteOS icon of `size`×`size`. Returns a PNG buffer. */
function buildIconPng(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 });

  // Letter bounding box: 65% of the icon size, centred
  const LETTER_FRAC = 0.65;
  const lw = size * LETTER_FRAC;
  const lh = size * LETTER_FRAC;
  const lx = (size - lw) / 2;
  const ly = (size - lh) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Default: dark background
      let color = BG;

      // Normalised position within the letter box
      const nx = (x - lx) / lw;
      const ny = (y - ly) / lh;

      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        for (const [x1, y1, x2, y2] of G_RECTS) {
          if (nx >= x1 && nx < x2 && ny >= y1 && ny < y2) {
            color = GOLD;
            break;
          }
        }
      }

      png.data[idx]     = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }

  return PNG.sync.write(png);
}

/** Wrap one PNG buffer in a minimal ICO container. Works on Windows Vista+. */
function pngToIco(pngBuf, width, height) {
  // ICONDIR header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (icon)
  header.writeUInt16LE(1, 4); // count = 1

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16);
  // Width/height: 0 means 256; for 32 we write 32.
  entry.writeUInt8(width <= 255 ? width : 0, 0);
  entry.writeUInt8(height <= 255 ? height : 0, 1);
  entry.writeUInt8(0, 2);            // color count (0 = no palette)
  entry.writeUInt8(0, 3);            // reserved
  entry.writeUInt16LE(1, 4);         // planes
  entry.writeUInt16LE(32, 6);        // bit count
  entry.writeUInt32LE(pngBuf.length, 8);  // size of image data
  entry.writeUInt32LE(6 + 16, 12);   // offset = header + 1 entry = 22

  return Buffer.concat([header, entry, pngBuf]);
}

console.log("Generating GraniteOS PWA icons…");

const buf192 = buildIconPng(192);
const buf512 = buildIconPng(512);

writeFileSync(path.join(PUBLIC, "icon-192.png"), buf192);
console.log(`  wrote public/icon-192.png  (${buf192.length} bytes)`);

writeFileSync(path.join(PUBLIC, "icon-512.png"), buf512);
console.log(`  wrote public/icon-512.png  (${buf512.length} bytes)`);

// Generate a 32x32 favicon.ico for browser tabs and the Windows installer icon
const buf32  = buildIconPng(32);
const icoBuf = pngToIco(buf32, 32, 32);
writeFileSync(path.join(PUBLIC, "favicon.ico"), icoBuf);
console.log(`  wrote public/favicon.ico   (${icoBuf.length} bytes)`);

console.log("Done.");
