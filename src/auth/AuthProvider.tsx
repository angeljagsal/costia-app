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

  const signInWithOAuth = useCallback(async (provider: 'google' | 'azure') => {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'notConfigured' as const };
    // Browser redirect flow: Supabase returns the provider URL, the browser
    // leaves, and the session restores via onAuthStateChange on return.
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (!error) return { ok: true, message: 'redirecting' };
    return { ok: false, message: 'error' };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'notConfigured' as const };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (!error) return { ok: true, message: 'signedIn' };
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials'))
      return { ok: false, message: 'invalidCredentials' };
    if (msg.includes('email not confirmed')) return { ok: false, message: 'confirmEmail' };
    return { ok: false, message: 'error' };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'notConfigured' as const };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (!error) {
      // With "Confirm email" OFF, Supabase returns a session immediately.
      // With it ON, the user must click the confirmation link first.
      return data.session
        ? { ok: true, message: 'signedIn' }
        : { ok: true, message: 'confirmEmail' };
    }
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists'))
      return { ok: false, message: 'emailInUse' };
    if (msg.includes('password')) return { ok: false, message: 'weakPassword' };
    return { ok: false, message: 'error' };
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
      signInWithOAuth,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [session, loading, signInWithOAuth, signInWithPassword, signUpWithPassword, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
