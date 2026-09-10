import { useState } from 'react';
import { categoryName } from '../data/categories';
import type { Category } from '../data/types';
import { useI18n } from '../i18n/useI18n';

/** Flat, solid avatar colors (no gradients). */
const AVATAR_COLORS = [
  '#1f75cb',
  '#108548',
  '#6e49cb',
  '#0098a1',
  '#b34700',
  '#8a1c40',
  '#5e6b7a',
  '#7a5c00',
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialOf(name: string): string {
  const clean = name.trim();
  return clean ? clean[0]!.toUpperCase() : '?';
}

/** Visual category grid: big tap targets with letter avatars, single-select.
 *  Long lists collapse to the first few with a show-all expander. */
export function CategoryGrid({
  categories,
  value,
  onChange,
  label,
  initialVisible = 6,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  initialVisible?: number;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  // Always keep the selected item visible, even when collapsed.
  const visible = expanded
    ? categories
    : categories.filter((c, i) => i < initialVisible || c.id === value);
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="form-section-title">{label}</p>
      <div className={`option-grid ${expanded ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
        {visible.map((c) => {
          const name = categoryName(t, c);
          const selected = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(c.id)}
              className="option-card"
            >
              <span
                aria-hidden="true"
                className="avatar"
                style={{ background: avatarColor(c.key ?? c.label ?? c.id) }}
              >
                {initialOf(name)}
              </span>
              <span className="truncate">{name}</span>
              {selected ? (
                <span aria-hidden="true" className="check">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {categories.length > initialVisible ? (
        <button
          type="button"
          className="btn btn-secondary self-start"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? t('common.showLess') : `${t('common.showAll')} (${categories.length})`}
        </button>
      ) : null}
    </div>
  );
}
