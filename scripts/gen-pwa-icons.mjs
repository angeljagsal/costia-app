/**
 * Generates placeholder PWA icons (solid brand green + white center mark).
 * No dependencies — minimal RGBA PNG writer on node:zlib.
 * Real artwork + maskable.app verification land in Phase 7.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GREEN = [22, 163, 74, 255];
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

function png(size, insetRatio) {
  const inset = Math.floor(size * insetRatio);
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const inside = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const c = inside ? WHITE : GREEN;
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
  const out = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return out;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const jobs = [
  ['pwa-192x192.png', 192, 0.3],
  ['pwa-512x512.png', 512, 0.3],
  ['pwa-maskable-192x192.png', 192, 0.2],
  ['pwa-maskable-512x512.png', 512, 0.2],
  ['apple-touch-icon.png', 180, 0.3],
];
for (const [name, size, inset] of jobs) {
  writeFileSync(join(root, name), png(size, inset));
  console.log(`wrote public/${name}`);
}
