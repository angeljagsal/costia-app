import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Publishable key (sb_publishable_...). Env var keeps the historic ANON_KEY name.
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase credentials are present. False in a fresh checkout. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

/** Dev-only escape hatch so the shell is browsable before the project exists. */
export const devAuthBypass =
  import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && !isSupabaseConfigured;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || !url || !publishableKey) return null;
  if (!client) client = createClient(url, publishableKey);
  return client;
}
