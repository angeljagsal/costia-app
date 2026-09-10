import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AuthResult {
  ok: boolean;
  /** i18n key fragment resolved by the caller ('checkEmail', 'error', ...). */
  message: string;
}

export interface AuthCtx {
  configured: boolean;
  bypassed: boolean;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
