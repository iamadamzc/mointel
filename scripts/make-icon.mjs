// Generates scripts/momentum-desk.ico — the desktop launcher icon.
// Ascending volume bars on a dark rounded tile, matching the dashboard palette.
// Run: node scripts/make-icon.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SIZES = [16, 32, 48, 256];
const SS = 4; // supersample factor for antialiasing

const BG = [0x0b, 0x0f, 0x16];
const EDGE = [0x1e, 0x29, 0x3b];
// Bars run dim -> bright to read as acceleration, even at 16px.
const BARS = [
  { x: 0.15, h: 0.3, c: [0x16, 0x5e, 0x3f] },
  { x: 0.35, h: 0.47, c: [0x18, 0x8a, 0x52] },
  { x: 0.55, h: 0.64, c: [0x22, 0xc5, 0x5e] },
  { x: 0.75, h: 0.82, c: [0x4a, 0xde, 0x80] },
];
const BAR_W = 0.145;
const BASE_Y = 0.87; // bars sit on this line
const RADIUS = 0.22; // tile corner radius, fraction of edge

/** Coverage of a rounded rectangle at a point, in normalized 0..1 space. */
function inTile(u, v) {
  const r = RADIUS;
  const cx = Math.min(Math.max(u, r), 1 - r);
  const cy = Math.min(Math.max(v, r), 1 - r);
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= r * r;
}

function shade(u, v) {
  if (!inTile(u, v)) return null; // transparent outside the tile

  for (const b of BARS) {
    const top = BASE_Y - b.h;
    if (u >= b.x && u <= b.x + BAR_W && v >= top && v <= BASE_Y) return b.c;
  }

  // Thin inner edge so the tile keeps its shape on dark wallpapers.
  const e = 0.045;
  if (!inTile(u + e, v) || !inTile(u - e, v) || !inTile(u, v + e) || !inTile(u, v - e)) {
    return EDGE;
  }
  return BG;
}

/** Render one size to a 32bpp BGRA buffer, top-row-first. */
function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const n = size * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x * SS + sx + 0.5) / n;
          const v = (y * SS + sy + 0.5) / n;
          const c = shade(u, v);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const samples = SS * SS;
      const o = (y * size + x) * 4;
      // Premultiplied average: divide colour by covered samples, alpha by all.
      const covered = a / 255;
      if (covered > 0) {
        px[o] = Math.round(b / covered);
        px[o + 1] = Math.round(g / covered);
        px[o + 2] = Math.round(r / covered);
      }
      px[o + 3] = Math.round(a / samples);
    }
  }
  return px;
}

/** Wrap BGRA pixels as an ICO image entry (BITMAPINFOHEADER + XOR + AND mask). */
function toDib(size, px) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // doubled: XOR image + AND mask
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(size * size * 4, 20);

  // DIB rows are bottom-up.
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    px.copy(xor, (size - 1 - y) * size * 4, y * size * 4, (y + 1) * size * 4);
  }

  // AND mask: 1bpp, rows padded to 4 bytes. Zeroed = "use the alpha channel".
  const maskRow = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRow * size);

  return Buffer.concat([header, xor, mask]);
}

const images = SIZES.map((size) => ({ size, data: toDib(size, render(size)) }));

const dir = Buffer.alloc(6 + images.length * 16);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2); // type: icon
dir.writeUInt16LE(images.length, 4);

let offset = dir.length;
images.forEach((img, i) => {
  const o = 6 + i * 16;
  dir[o] = img.size === 256 ? 0 : img.size;
  dir[o + 1] = img.size === 256 ? 0 : img.size;
  dir.writeUInt16LE(1, o + 4);
  dir.writeUInt16LE(32, o + 6);
  dir.writeUInt32LE(img.data.length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += img.data.length;
});

const out = join(dirname(fileURLToPath(import.meta.url)), "momentum-desk.ico");
writeFileSync(out, Buffer.concat([dir, ...images.map((i) => i.data)]));
console.log(`wrote ${out}`);
