import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { db } from '../powersync/db';
import { SupabaseConnector, isSyncConfigured } from '../powersync/SupabaseConnector';
import { SyncContext } from './useSync';
import type { SyncCtx } from './useSync';

/**
 * Connects the local SQLite database to the PowerSync service for background
 * bidirectional sync. Connects only when a session exists (PowerSync
 * authenticates with the Supabase access token); otherwise the app keeps
 * working against the local database.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [connected, setConnected] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { session } = useAuth();
  const connector = useMemo(() => new SupabaseConnector(), []);

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

  useEffect(() => {
    const unregister = db.registerListener({
      statusChanged: (status) => {
        setConnected(status.connected);
        setHasSynced(status.hasSynced ?? false);
        const err = status.downloadError ?? status.uploadError;
        setSyncError(err ? err.message : null);
      },
    });
    return unregister;
  }, []);

  const userId = session?.user?.id ?? null;
  const canSync = isSupabaseConfigured && isSyncConfigured && userId !== null;

  useEffect(() => {
    if (!canSync) {
      db.disconnect().catch(() => {
        // No active connection to close; safe to ignore.
      });
      return;
    }
    let cancelled = false;
    // Note: syncError clears itself via statusChanged once sync succeeds.
    if (!db.connected && !db.connecting) {
      db.connect(connector).catch((e: unknown) => {
        if (!cancelled) setSyncError(e instanceof Error ? e.message : String(e));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [connector, userId, canSync]);

  const value: SyncCtx = useMemo(
    () => ({
      online,
      engine: canSync ? 'powersync' : 'local-only',
      connected,
      hasSynced,
      syncError,
    }),
    [online, canSync, connected, hasSynced, syncError]
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
