/**
 * Verifies local Supabase connectivity using .env (never committed).
 * Prints only the project host + key type — never the key itself.
 * Usage: node scripts/check-supabase.mjs
 */
import { readFileSync } from 'node:fs';

function loadEnv(path) {
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    let line = rawLine.trim().replace(/^\uFEFF/, '');
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    if (line.toLowerCase().startsWith('export ')) line = line.slice(7).trim();
    // Tolerate the whole line wrapped in quotes.
    if (line.length >= 2 && line.startsWith('"') && line.endsWith('"')) {
      line = line.slice(1, -1);
    }
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
    // Tolerate a duplicated KEY= prefix: KEY=KEY=value.
    if (value.startsWith(`${key}=`)) value = value.slice(key.length + 1);
    out[key] = value;
  }
  return out;
}

let env;
try {
  env = loadEnv('.env');
} catch {
  console.error('FAIL: .env not found. Copy .env.example to .env first.');
  process.exit(2);
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('FAIL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.');
  process.exit(2);
}

// The URL must be the bare project URL. A common mistake is pasting the Data
// API URL (with /rest/v1), which breaks Auth and every client call.
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(
    `FAIL: VITE_SUPABASE_URL is not a valid URL.\n` +
      `  Got: ${url.slice(0, 80)}\n` +
      `  Fix: it should be exactly https://<your-ref>.supabase.co with no key name,\n` +
      `  no quotes, and no /rest/v1 path.`
  );
  process.exit(2);
}
if (parsed.pathname !== '/' && parsed.pathname !== '') {
  console.error(
    `FAIL: VITE_SUPABASE_URL must be the bare project URL with no path.\n` +
      `  Got path: ${parsed.pathname}\n` +
      `  Fix: strip the path so it ends at .supabase.co (e.g. remove /rest/v1).`
  );
  process.exit(2);
}

const kind = key.startsWith('sb_publishable_')
  ? 'publishable (current)'
  : key.startsWith('eyJ')
    ? 'legacy anon JWT (works, but migrate to publishable)'
    : 'unrecognized format';
console.log(`project: ${parsed.host}`);
console.log(`key: ${kind}, ${key.length} chars`);

// getSession() alone never touches the network when no session is stored,
// so probe the Auth health endpoint for a real round-trip instead.
// The apikey header is required — Auth answers 401 without it.
const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
await health.text(); // consume the body so the socket closes cleanly on Windows
if (!health.ok) {
  console.error(`FAIL: Auth health check returned HTTP ${health.status}.`);
  process.exit(1);
}
console.log('OK: reachable, Auth responding. (No session is expected — sign in via the UI.)');
process.exit(0);
