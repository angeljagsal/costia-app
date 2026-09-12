import { useEffect, useState } from 'react';
import { categoryName } from '../data/categories';
import type { Category } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { avatarColor, initialOf } from '../lib/avatar';

/** One grid row on any screen: 2 columns on mobile, 3 on desktop. */
function useRowSize(): number {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide ? 3 : 2;
}

/** Visual category grid: big tap targets with letter avatars, single-select.
 *  Shows one row, collapsing the rest behind show-all. */
export function CategoryGrid({
  categories,
  value,
  onChange,
  label,
  initialVisible,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Defaults to one grid row (2 mobile, 3 desktop). */
  initialVisible?: number;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const rowSize = useRowSize();
  const visibleCount = initialVisible ?? rowSize;
  // Always keep the selected item visible, even when collapsed.
  const visible = expanded
    ? categories
    : categories.filter((c, i) => i < visibleCount || c.id === value);
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
      {categories.length > visibleCount ? (
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
