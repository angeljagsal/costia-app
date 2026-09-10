import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AuthCtx {
  configured: boolean;
  bypassed: boolean;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
