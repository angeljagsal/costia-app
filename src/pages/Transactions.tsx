import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import { CalendarIcon, PencilIcon, PlusIcon, SearchIcon } from '../components/icons';
import { avatarColor, initialOf } from '../lib/avatar';
import { useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { addDaysISO, todayLocal } from '../data/periods';
import { useTags } from '../data/tags';
import { deleteTransaction, useTransactions } from '../data/transactions';
import { EMPTY_FILTERS } from '../data/types';
import type { TransactionFilters, TransactionView } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { loadBaseCurrency } from '../lib/prefs';

const PAGE_SIZE = 50;

function money(locale: string, amount: number, currency: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function day(locale: string, iso: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${iso}T00:00:00`)
    );
  } catch {
    return iso;
  }
}

export function Transactions() {
  const { t, locale } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const patch = (p: Partial<TransactionFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setLimit(PAGE_SIZE);
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    filters.search.trim(),
    filters.categoryId,
    filters.accountId,
    filters.tagId,
    filters.from,
    filters.to,
  ].filter(Boolean).length;

  // Fetch one extra row to know whether more pages exist.
  const rows = useTransactions(householdId, filters, limit + 1, 0);
  const visible = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const categories = useCategories(undefined, householdId);
  const accounts = useAccounts(householdId);
  const tags = useTags(householdId);
  const baseCurrency = loadBaseCurrency();

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteTransaction(db, id);
  };

  // Bank-statement grouping, newest day first (rows already arrive sorted).
  const groups = useMemo(() => {
    const byDay = new Map<string, TransactionView[]>();
    for (const row of visible) {
      const list = byDay.get(row.txn_date);
      if (list) list.push(row);
      else byDay.set(row.txn_date, [row]);
    }
    return [...byDay.entries()];
  }, [visible]);

  const today = todayLocal();
  const yesterday = addDaysISO(today, -1);
  const groupLabel = (iso: string) =>
    iso === today ? t('tx.today') : iso === yesterday ? t('tx.yesterday') : day(locale, iso);

  return (
    <Page title={t('tx.title')} body={t('tx.subtitle')}>
      <Link to="/transactions/new" className="btn btn-primary self-start">
        <PlusIcon size={18} />
        {t('tx.new')}
      </Link>

      <details
        className="advanced"
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="flex items-center gap-2 text-base font-bold">
            {t('tx.filters')}
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent-strong)]">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
        </summary>
        <div className="advanced-body">
          <div className="search-wrap">
            <SearchIcon size={18} />
            <input
              className="input"
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={t('tx.searchPlaceholder')}
              aria-label={t('common.search')}
              type="search"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="label">
              {t('tx.filterCategory')}
              <select
                className="input"
                value={filters.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(t, c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {t('tx.filterAccount')}
              <select
                className="input"
                value={filters.accountId}
                onChange={(e) => patch({ accountId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {t('tx.tags')}{' '}
              <select
                className="input"
                value={filters.tagId}
                onChange={(e) => patch({ tagId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="label">
                {t('tx.filterFrom')}
                <span className="date-wrap">
                  <CalendarIcon size={18} />
                  <input
                    type="date"
                    className="input"
                    value={filters.from}
                    onChange={(e) => patch({ from: e.target.value })}
                  />
                </span>
              </label>
              <label className="label">
                {t('tx.filterTo')}
                <span className="date-wrap">
                  <CalendarIcon size={18} />
                  <input
                    type="date"
                    className="input"
                    value={filters.to}
                    onChange={(e) => patch({ to: e.target.value })}
                  />
                </span>
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => patch({ ...EMPTY_FILTERS })}
          >
            {t('common.clear')}
          </button>
        </div>
      </details>

      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : visible.length === 0 ? (
        <p className="hint">{t('common.empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={groupLabel(date)} className="flex flex-col gap-2">
              <p className="form-section-title">{groupLabel(date)}</p>
              <ul className="flex flex-col gap-2">
                {items.map((row) => {
                  const expense = row.kind === 'expense';
                  const name = categoryName(t, {
                    key: row.category_key,
                    label: row.category_label,
                  });
                  return (
                    <li key={row.id} className="card card-compact flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="avatar avatar-sm"
                          style={{
                            background: avatarColor(
                              row.category_key ?? row.category_label ?? row.id
                            ),
                          }}
                        >
                          {initialOf(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] font-semibold">{name}</p>
                          <p className="hint truncate">
                            {row.account_name}
                            {row.note ? ` · ${row.note}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className="amount text-base"
                            style={{ color: expense ? 'var(--danger)' : 'var(--success)' }}
                          >
                            {expense ? '−' : '+'}
                            {money(locale, row.amount, row.currency)}
                          </p>
                          {row.currency !== baseCurrency ? (
                            <p className="hint">≈ {money(locale, row.base_amount, baseCurrency)}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/transactions/${row.id}/edit`}
                          className="btn btn-secondary"
                          aria-label={t('tx.edit')}
                        >
                          <PencilIcon size={16} />
                          {t('tx.edit')}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => onDelete(row.id)}
                          aria-label={`${t('common.delete')}: ${name}`}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          className="btn btn-secondary self-center"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
        >
          {t('common.loadMore')}
        </button>
      ) : null}
    </Page>
  );
}
