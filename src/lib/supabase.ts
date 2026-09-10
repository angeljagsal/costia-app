import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase credentials are present. False in a fresh checkout. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Dev-only escape hatch so the shell is browsable before the project exists. */
export const devAuthBypass =
  import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && !isSupabaseConfigured;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || !url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}
