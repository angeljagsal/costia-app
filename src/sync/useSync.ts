import { createContext, useContext } from 'react';

export type SyncEngine = 'local-only' | 'powersync';

export interface SyncCtx {
  /** Browser online/offline state. */
  online: boolean;
  /** Which backend the local DB syncs through (or none). */
  engine: SyncEngine;
  /** Live connection to the PowerSync service is open. */
  connected: boolean;
  /** At least one full download has completed since init. */
  hasSynced: boolean;
  /** Latest sync error message, if any. */
  syncError: string | null;
}

export const SyncContext = createContext<SyncCtx>({
  online: true,
  engine: 'local-only',
  connected: false,
  hasSynced: false,
  syncError: null,
});

export function useSync(): SyncCtx {
  return useContext(SyncContext);
}
