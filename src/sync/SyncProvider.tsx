import { useEffect, useMemo, useRef, useState } from 'react';
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
 *
 * When the signed-in account changes (including sign-out), the previous
 * account's local rows are purged first — otherwise a new session would read
 * stale data belonging to someone else.
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
  const prevUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (prevUserId.current === undefined) {
        // First mount: local data (if any) belongs to the restored session.
        prevUserId.current = userId;
      } else if (prevUserId.current !== userId) {
        // Account switch or sign-out: purge stale rows before anything else.
        prevUserId.current = userId;
        try {
          await db.disconnectAndClear();
        } catch {
          // Nothing to clear; safe to ignore.
        }
        if (cancelled) return;
      }
      if (!canSync) {
        if (db.connected || db.connecting) {
          try {
            await db.disconnect();
          } catch {
            // No active connection to close; safe to ignore.
          }
        }
        return;
      }
      // Note: syncError clears itself via statusChanged once sync succeeds.
      if (!db.connected && !db.connecting) {
        try {
          await db.connect(connector);
        } catch (e: unknown) {
          if (!cancelled) setSyncError(e instanceof Error ? e.message : String(e));
        }
      }
    };
    void run();
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
