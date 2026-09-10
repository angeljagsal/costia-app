import {
  UpdateType,
  type CommonPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials
} from '@powersync/web';
import { getSupabase } from '../lib/supabase';

const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL as string | undefined;

/** True when the sync engine can start (Supabase + PowerSync endpoint present). */
export const isSyncConfigured = Boolean(powersyncUrl);

/** Postgres codes we cannot recover from by retrying (per official connector). */
const FATAL_RESPONSE_CODES = [
  new RegExp('^22...$'), // data exception, e.g. type mismatch
  new RegExp('^23...$'), // integrity violation, e.g. FK / unique
  new RegExp('^42501$') // RLS / privilege violation
];

/**
 * Download path: PowerSync service (JWT = Supabase access token).
 * Upload path: local CRUD queue -> Supabase Data API via supabase-js.
 * Tables must stay exposed (0007) and RLS-enforced (0004).
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const sb = getSupabase();
    if (!sb || !powersyncUrl) return null;
    const {
      data: { session },
      error
    } = await sb.auth.getSession();
    if (!session || error || !session.access_token) return null;
    return { endpoint: powersyncUrl, token: session.access_token };
  }

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase is not configured');
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = sb.from(op.table);
        let result: { error: { code?: string; message: string } | null };
        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH:
            result = await table.update(op.opData ?? {}).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }
        if (result.error) {
          result.error.message = `Upload to Supabase failed: ${result.error.message}`;
          throw result.error;
        }
      }
      await transaction.complete();
    } catch (ex: unknown) {
      const code = (ex as { code?: unknown }).code;
      if (typeof code === 'string' && FATAL_RESPONSE_CODES.some((re) => re.test(code))) {
        // Bug or policy violation: discard so the queue is not blocked forever.
        console.error('Upload discarding failing op:', lastOp, ex);
        await transaction.complete();
      } else {
        throw ex; // retryable (network, 5xx) — retried after a delay
      }
    }
  }
}
