import { db } from './db';

/**
 * Nuclear local reset for wedged clients: closes the database, deletes all
 * same-origin persisted storage (IndexedDB + OPFS file system), then reloads
 * so the app re-initializes and performs a full fresh sync.
 *
 * Session and preferences (localStorage) plus the app shell (service worker
 * cache) are preserved — only synced/local database storage is destroyed.
 * Never resolves: the page reloads at the end.
 */
export async function resetLocalData(): Promise<never> {
  try {
    await db.close();
  } catch {
    // Already closed or never opened; proceed with storage removal.
  }

  try {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(
        (info) =>
          new Promise<void>((resolve) => {
            if (!info.name) {
              resolve();
              return;
            }
            try {
              const req = indexedDB.deleteDatabase(info.name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            } catch {
              resolve();
            }
          })
      )
    );
  } catch {
    // IndexedDB enumeration unsupported here; continue with OPFS.
  }

  try {
    const root = await navigator.storage.getDirectory();
    const values = (root.values as unknown as () => AsyncIterable<[string, FileSystemHandle]>)();
    for await (const [name] of values) {
      try {
        await root.removeEntry(name, { recursive: true });
      } catch {
        // Best effort per entry; keep going.
      }
    }
  } catch {
    // OPFS unavailable; reload regardless.
  }

  location.reload();
  return new Promise<never>(() => {});
}
