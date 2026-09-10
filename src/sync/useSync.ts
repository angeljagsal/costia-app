import { createContext, useContext } from 'react';

export interface SyncCtx {
  online: boolean;
  engine: 'local-only';
}

export const SyncContext = createContext<SyncCtx>({ online: true, engine: 'local-only' });

export function useSync(): SyncCtx {
  return useContext(SyncContext);
}
