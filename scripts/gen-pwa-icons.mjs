/**
 * Generates PWA icons: flat brand navy, full bleed, centered white rounded
 * square (inside the inner 60% so Android mask cropping never clips it).
 * No gradients, no artwork dependencies — minimal RGBA PNG writer on node:zlib.
 * Verify with scripts/check-pwa.mjs; eyeball once in maskable.app.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAVY = [41, 41, 97, 255];
const WHITE = [255, 255, 255, 255];

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
}

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  const nx = Math.max(x0 + r, Math.min(x, x1 - r));
  const ny = Math.max(y0 + r, Math.min(y, y1 - r));
  return (x - nx) ** 2 + (y - ny) ** 2 <= r * r;
}

function png(size) {
  // White mark: centered, 56% of the canvas, 22%-of-side corner radius.
  const side = size * 0.56;
  const x0 = (size - side) / 2;
  const y0 = (size - side) / 2;
  const r = side * 0.22;
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const c = inRoundedRect(x, y, x0, y0, x0 + side, y0 + side, r) ? WHITE : NAVY;
      const o = row + 1 + x * 4;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = c[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
for (const [name, size] of [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['pwa-maskable-192x192.png', 192],
  ['pwa-maskable-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(root, name), png(size));
  console.log(`wrote public/${name}`);
}
