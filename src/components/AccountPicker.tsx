import { useState } from 'react';
import { accountTypeLabel } from '../data/accounts';
import type { Account } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { formatMoney } from '../lib/format';

/** Account list with live balances, single-select radio rows.
 *  Long lists collapse to the first few with a show-all expander. */
export function AccountPicker({
  accounts,
  balanceOf,
  baseCurrency,
  value,
  onChange,
  label,
  initialVisible = 2,
}: {
  accounts: Account[];
  balanceOf: (id: string) => number;
  baseCurrency: string;
  value: string;
  onChange: (id: string) => void;
  label: string;
  initialVisible?: number;
}) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? accounts
    : accounts.filter((a, i) => i < initialVisible || a.id === value);
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <p className="form-section-title">{label}</p>
      <div className={`flex flex-col gap-2 ${expanded ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
        {visible.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(a.id)}
              className="radio-row"
            >
              <span aria-hidden="true" className="radio-dot">
                <span aria-hidden="true" className="radio-dot-fill" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.name}</span>
                <span className="hint block">{accountTypeLabel(t, a.type)}</span>
              </span>
              <span className="amount shrink-0">
                {formatMoney(locale, balanceOf(a.id), baseCurrency)}
              </span>
            </button>
          );
        })}
      </div>
      {accounts.length > initialVisible ? (
        <button
          type="button"
          className="btn btn-secondary self-start"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? t('common.showLess') : `${t('common.showAll')} (${accounts.length})`}
        </button>
      ) : null}
    </div>
  );
}
