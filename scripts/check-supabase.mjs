/**
 * Verifies local Supabase connectivity using .env (never committed).
 * Prints only the project host + key type — never the key itself.
 * Usage: node scripts/check-supabase.mjs
 */
import { readFileSync } from 'node:fs';

function loadEnv(path) {
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim().replace(/^\uFEFF/, '');
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    // NOTE: no tolerance for `export ` prefixes or duplicated KEY= prefixes here.
    // Vite/dotenv does not understand them, so silently accepting them would
    // report OK while the browser receives garbage. Fail loudly instead.
    if (/^export\s+/i.test(line)) {
      console.error(
        `FAIL: .env line uses an 'export ' prefix, which Vite does not support:\n` +
          `  ${line.slice(0, 60)}\n` +
          `  Fix: remove 'export ', leaving just KEY=value.`
      );
      process.exit(2);
    }
    // Tolerate the whole line wrapped in quotes.
    let clean = line;
    if (clean.length >= 2 && clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }
    const idx = clean.indexOf('=');
    const key = clean.slice(0, idx).trim();
    let value = clean.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value.startsWith(`${key}=`)) {
      console.error(
        `FAIL: ${key} has the key name duplicated inside its own value.\n` +
          `  The line should read exactly: ${key}=<value> with nothing repeated.\n` +
          `  (Vite keeps everything after the first '=' literally, so the app\n` +
          `  receives "${key}=..." as the value and rejects it.)`
      );
      process.exit(2);
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
const powersyncUrl = env.VITE_POWERSYNC_URL;
const bypass = env.VITE_DEV_AUTH_BYPASS;

// Preflight: names and shapes only — values are never printed.
console.log('--- .env preflight (names/shapes only, no secrets) ---');
for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_POWERSYNC_URL']) {
  const v = env[name];
  console.log(`${v ? 'present' : 'MISSING'}: ${name}${v ? ` (${v.length} chars)` : ''}`);
}
console.log(`VITE_DEV_AUTH_BYPASS=${bypass ?? '(unset)'}`);
if (!url || !key) {
  console.error(
    'FAIL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.\n' +
      '  If the file exists, check for typos in the variable names.'
  );
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
if (powersyncUrl) {
  try {
    const psu = new URL(powersyncUrl);
    if (psu.protocol !== 'https:' || (psu.pathname !== '/' && psu.pathname !== '')) {
      console.error('WARN: VITE_POWERSYNC_URL looks malformed — sync will stay local-only.');
    } else {
      console.log(`sync endpoint: ${psu.host}`);
    }
  } catch {
    console.error('WARN: VITE_POWERSYNC_URL is not a valid URL — sync will stay local-only.');
  }
} else {
  console.log('NOTE: VITE_POWERSYNC_URL unset — sync stays local-only until you add it.');
}
process.exit(0);
