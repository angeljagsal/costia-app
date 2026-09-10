import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';

/**
 * Singleton local database (SQLite via WASM, persisted in the browser).
 * Reads/writes are instant and offline-first; the SyncProvider connects it
 * to the PowerSync service for background bidirectional sync.
 */
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'costia.db' },
});

export type AppDatabase = typeof db;
