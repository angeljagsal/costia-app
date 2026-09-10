import { useQuery } from '@powersync/react';
import { useAuth } from '../auth/useAuth';

/**
 * Household id of the signed-in user, read from the synced users table.
 * Null until the first sync delivers the row (or when signed out).
 */
export function useHouseholdId(): string | null {
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const { data } = useQuery<{ household_id: string | null }>(
    'SELECT household_id FROM users WHERE id = ? LIMIT 1',
    [uid]
  );
  return data[0]?.household_id ?? null;
}
