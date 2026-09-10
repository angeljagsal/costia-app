import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SyncContext } from './useSync';

/**
 * Phase 1 stub. Reports connectivity only.
 * Phase 2 replaces the internals with the PowerSync SDK (local SQLite +
 * background sync) while keeping this context's shape.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const value = useMemo(() => ({ online, engine: 'local-only' as const }), [online]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
