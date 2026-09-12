/**
 * WCAG contrast audit over the app's exact token pairs (src/index.css).
 * Normal text must reach 4.5:1, large/bold display text 3:1.
 * Usage: node scripts/check-contrast.mjs (also `npm run check:contrast`)
 */
function luminance(hex) {
  const c = hex
    .replace('#', '')
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// [label, foreground, background, minRatio]
const PAIRS = [
  // Light scheme
  ['light body', '#262626', '#f5f5f5', 4.5],
  ['light muted on surface', '#5e5e5e', '#ffffff', 4.5],
  ['light muted on bg', '#5e5e5e', '#f5f5f5', 4.5],
  ['light button text on blue', '#ffffff', '#1f75cb', 4.5],
  ['light sidebar active', '#0b5cad', '#e9f3fc', 4.5],
  ['light sidebar text', '#262626', '#ffffff', 4.5],
  ['light sidebar muted', '#5e5e5e', '#ffffff', 4.5],
  ['light danger on surface', '#d02a0e', '#ffffff', 4.5],
  ['light success amounts', '#108548', '#ffffff', 4.5],
  ['light warning banner', '#8a5a00', '#fdf1e0', 4.5],
  ['light hero balance', '#ffffff', '#292961', 3.0],
  ['light hero hint', '#d6e4f5', '#292961', 3.0],
  // Dark scheme
  ['dark body', '#ececec', '#1f1f1f', 4.5],
  ['dark muted on surface', '#b0b0b0', '#2b2b2b', 4.5],
  ['dark button text on blue', '#0b1c2a', '#499ed7', 4.5],
  ['dark sidebar active', '#7ab8e2', '#1d3a52', 4.5],
  ['dark sidebar text', '#ececec', '#242424', 4.5],
  ['dark sidebar muted', '#b0b0b0', '#242424', 4.5],
  ['dark danger on surface', '#f06a4d', '#2b2b2b', 4.5],
  ['dark success amounts', '#3ecf8e', '#2b2b2b', 4.5],
  ['dark warning banner', '#f2c14e', '#3a2c10', 4.5],
  ['dark hero balance', '#ffffff', '#23235f', 3.0],
  ['dark hero hint', '#c9d8ec', '#23235f', 3.0]
];

let failed = 0;
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${r.toFixed(2)}:1 (needs ${min}) — ${label}`);
  if (!ok) failed += 1;
}
if (failed > 0) process.exit(1);
console.log('Contrast audit passed');
