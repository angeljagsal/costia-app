/**
 * Verifies local Supabase connectivity using .env (never committed).
 * Prints only the project host + key type — never the key itself.
 * Usage: node scripts/check-supabase.mjs
 */
import { readFileSync } from 'node:fs';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
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
const parsed = new URL(url);
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
const health = await fetch(`${url}/auth/v1/health`);
if (!health.ok) {
  console.error(`FAIL: Auth health check returned HTTP ${health.status}.`);
  process.exit(1);
}
console.log('OK: reachable, Auth responding. (No session is expected — sign in via the UI.)');
