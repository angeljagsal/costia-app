import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Publishable key (sb_publishable_...). Env var keeps the historic ANON_KEY name.
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Strict validation: createClient() throws on a malformed URL, which would
 * unmount the whole app. An invalid URL is treated as "not configured" so the
 * UI shows setup guidance instead of a blank screen. (Common culprits: a
 * /rest/v1 path pasted from the Data API field, or a dev server started
 * before .env was fixed — Vite reads .env only at startup.)
 */
function readValidUrl(): string | null {
  const candidate = rawUrl?.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const protocolOk = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const pathOk = parsed.pathname === '/' || parsed.pathname === '';
    return protocolOk && pathOk ? candidate : null;
  } catch {
    return null;
  }
}

const url = readValidUrl();

/** True when Supabase credentials are present AND well-formed. */
export const isSupabaseConfigured = Boolean(url && publishableKey?.trim());

/** Dev-only escape hatch so the shell is browsable before the project exists. */
export const devAuthBypass =
  import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && !isSupabaseConfigured;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const key = publishableKey?.trim();
  if (!isSupabaseConfigured || !url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
