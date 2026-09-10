/**
 * Verifies local Supabase connectivity using .env (never committed).
 * Prints only the project host + key type — never the key itself.
 * Usage: node scripts/check-supabase.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const host = new URL(url).host;
const kind = key.startsWith('sb_publishable_')
  ? 'publishable (current)'
  : key.startsWith('eyJ')
    ? 'legacy anon JWT (works, but migrate to publishable)'
    : 'unrecognized format';
console.log(`project: ${host}`);
console.log(`key: ${kind}, ${key.length} chars`);

const sb = createClient(url, key);
const { error } = await sb.auth.getSession();
if (error) {
  console.error(`FAIL: auth.getSession: ${error.message}`);
  process.exit(1);
}
console.log('OK: reachable, key accepted. (No session is expected — sign in via the UI.)');
