import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { devAuthBypass, getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthContext } from './useAuth';
import type { AuthCtx } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthCtx['session']>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const sb = getSupabase();
    // Unconfigured: loading already initialized to false, nothing to sync.
    if (!sb) return;
    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'notConfigured' as const };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? { ok: false, message: 'error' } : { ok: true, message: 'checkEmail' };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      configured: isSupabaseConfigured,
      bypassed: devAuthBypass,
      session,
      loading,
      sendMagicLink,
      signOut,
    }),
    [session, loading, sendMagicLink, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
