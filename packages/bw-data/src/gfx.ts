// Pre-render the mod's own item graphics (.dc6 that exist only in Patch_D2.mpq) to PNG,
// so the published editor can show them without shipping Blizzard files (vanilla .dc6
// art or the palette). Run locally; the PNGs + index.json are committed.
//
//   node packages/bw-data/src/gfx.ts <reference/gfx> <out-dir>
//
// <reference/gfx> is written by tools/extract_gfx.py (one folder per MPQ).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const [gfxRoot, outDir] = process.argv.slice(2);
if (!gfxRoot || !outDir) {
  console.error("usage: gfx.ts <reference/gfx> <out-dir>");
  process.exit(1);
}

const itemsOf = (archive: string) => join(gfxRoot, archive, "data/global/items");
const dc6Names = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".dc6")).map((f) => f.slice(0, -4)) : [];

const blizzard = new Set([...dc6Names(itemsOf("d2data")), ...dc6Names(itemsOf("d2exp"))]);
const modOnly = dc6Names(itemsOf("patch_d2")).filter((n) => !blizzard.has(n));

// pal.dat: 256 BGR triplets
const pal = readFileSync(join(gfxRoot, "d2data/data/global/palette/act1/pal.dat"));
const palette = Array.from({ length: 256 }, (_, i) => [pal[i * 3 + 2], pal[i * 3 + 1], pal[i * 3]]);

const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** First frame of a DC6 as RGBA (same decoding as the editor's utils.b64PNGFromDC6). */
function decodeDc6(dc6: Uint8Array): { width: number; height: number; rgba: Uint8Array } | null {
  const width = u32(dc6, 32), height = u32(dc6, 36), length = u32(dc6, 56);
  if (!width || !height || width > 512 || height > 512) return null;
  const rgba = new Uint8Array(width * height * 4);
  let x = 0, y = height - 1;
  for (let i = 0; i < length && y >= 0; ) {
    const b = dc6[60 + i++];
    if (b === 0x80) {
      x = 0;
      y--;
    } else if (b & 0x80) {
      x += b & 0x7f;
    } else {
      for (let j = 0; j < b; j++) {
        const idx = dc6[60 + i++];
        if (x < width && y >= 0) {
          const [r, g, bl] = palette[idx];
          rgba.set([r, g, bl, 255], (y * width + x) * 4);
        }
        x++;
      }
    }
  }
  return { width, height, rgba };
}

function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const written: string[] = [];
const skipped: string[] = [];
for (const name of modOnly.sort()) {
  const img = decodeDc6(readFileSync(join(itemsOf("patch_d2"), `${name}.dc6`)));
  if (!img) {
    skipped.push(name);
    continue;
  }
  writeFileSync(join(outDir, `${name}.png`), png(img.width, img.height, img.rgba));
  written.push(name);
}
writeFileSync(join(outDir, "index.json"), JSON.stringify(written) + "\n");
console.log(
  JSON.stringify({ modOnly: modOnly.length, written: written.length, skipped, excludedBlizzardNames: blizzard.size }, null, 2)
);
