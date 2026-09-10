import { useQuery } from '@powersync/react';
import type { Category, Kind } from './types';

export function useCategories(kind?: Kind): Category[] {
  const { data } = useQuery<Category>(
    kind
      ? 'SELECT * FROM categories WHERE kind = ? ORDER BY sort'
      : 'SELECT * FROM categories ORDER BY kind, sort',
    kind ? [kind] : []
  );
  return data;
}

/** Localized category name for a catalog `key`; falls back to a readable key. */
export function categoryName(t: (key: string) => string, key: string): string {
  const hit = t(`categories.${key}`);
  return hit === `categories.${key}` ? key.replace(/_/g, ' ') : hit;
}
