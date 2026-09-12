/**
 * Verifies PWA icon assets without a browser:
 * - files exist, are valid PNGs, and match their filename dimensions
 * - corners are full-bleed navy, center pixel is the white mark
 * Usage: node scripts/check-pwa.mjs (also wired as `npm run check:pwa`)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const NAVY = [41, 41, 97, 255];
const WHITE = [255, 255, 255, 255];

function readChunk(buf, offset) {
  const len = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  return { type, data: buf.subarray(offset + 8, offset + 8 + len), next: offset + 12 + len };
}

function decodePng(path) {
  const buf = readFileSync(path);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error(`${path}: bad PNG signature`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  for (;;) {
    const c = readChunk(buf, offset);
    if (c.type === 'IHDR') {
      width = c.data.readUInt32BE(0);
      height = c.data.readUInt32BE(4);
      bitDepth = c.data[8];
      colorType = c.data[9];
    } else if (c.type === 'IDAT') {
      idat.push(c.data);
    } else if (c.type === 'IEND') {
      break;
    }
    offset = c.next;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`${path}: expected 8-bit RGBA`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const px = (x, y) => {
    const o = y * stride + 1 + x * 4;
    return [raw[o], raw[o + 1], raw[o + 2], raw[o + 3]];
  };
  return { width, height, px };
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
let failed = 0;
for (const [name, size] of [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['pwa-maskable-192x192.png', 192],
  ['pwa-maskable-512x512.png', 512],
  ['apple-touch-icon.png', 180]
]) {
  try {
    const img = decodePng(join(root, name));
    const mid = Math.floor(size / 2);
    const checks = [
      ['dimensions', img.width === size && img.height === size],
      ['full-bleed corners', same(img.px(0, 0), NAVY) && same(img.px(size - 1, size - 1), NAVY)],
      ['centered mark', same(img.px(mid, mid), WHITE)]
    ];
    for (const [label, ok] of checks) {
      console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name} — ${label}`);
      if (!ok) failed += 1;
    }
  } catch (e) {
    console.log(`FAIL  ${name} — ${e instanceof Error ? e.message : e}`);
    failed += 1;
  }
}
if (failed > 0) {
  process.exit(1);
}
console.log('PWA icons verified');
