import { useQuery } from '@powersync/react';
import type { AppDatabase } from '../powersync/db';
import type { Tag } from './types';

export function useTags(householdId: string | null): Tag[] {
  const { data } = useQuery<Tag>(
    'SELECT * FROM tags WHERE household_id = ? ORDER BY name COLLATE NOCASE',
    [householdId ?? '']
  );
  return data;
}

export async function createTag(
  db: AppDatabase,
  householdId: string,
  name: string
): Promise<string> {
  const clean = name.trim();
  if (!clean) throw new Error('tx.errRequired');
  const id = crypto.randomUUID();
  try {
    await db.execute('INSERT INTO tags (id, household_id, name) VALUES (?, ?, ?)', [
      id,
      householdId,
      clean,
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) throw new Error('tags.duplicate');
    throw e;
  }
  return id;
}
